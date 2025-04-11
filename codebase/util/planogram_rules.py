import boto3
import json
from decimal import Decimal
import util.planogram_generation as util
import os
import hashlib
from datetime import datetime, timezone
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
# Define the table name
table_name = util.readParameterValueFromSSM('/planogram/dynamodb/planogram_rules')
# Custom JSON Encoder class
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)

# Function to read data from the DynamoDB table
def read_data_from_dynamodb(table_name):
    table = dynamodb.Table(table_name)
    response = table.scan()
    items = response['Items']

    # Continue scanning if there are more items
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])

    return items

# Function to transform the data into the desired JSON format
def transform_data(items):
    planogram_rules = []
    rule_code_map = {}

    # Group items by ruleCode
    for item in items:
        rule_code = item['ruleCode']
        if rule_code not in rule_code_map:
            rule_code_map[rule_code] = {
                'ruleType': item['ruleType'],
                'ruleCode': rule_code,
                'ruleLogics': {}
            }
        rule_code_map[rule_code]['ruleLogics'][item['ruleName']] = {
            'ruleName': item['ruleName']
        }
        # Add other fields if necessary
        if 'facing' in item:
            rule_code_map[rule_code]['ruleLogics'][item['ruleName']]['facing'] = item['facing']
        if 'overridesGrossProfit' in item:
            rule_code_map[rule_code]['ruleLogics'][item['ruleName']]['overridesGrossProfit'] = item['overridesGrossProfit']
        if 'shelfPlacement' in item:
            rule_code_map[rule_code]['ruleLogics'][item['ruleName']]['shelfPlacement'] = item['shelfPlacement']
        if 'conditions' in item:
            rule_code_map[rule_code]['ruleLogics'][item['ruleName']]['conditions'] = item['conditions']
        if 'exceptions' in item:
            rule_code_map[rule_code]['ruleLogics'][item['ruleName']]['exceptions'] = item['exceptions']
        if 'ignoreSlottingFee' in item:
            rule_code_map[rule_code]['ruleLogics'][item['ruleName']]['ignoreSlottingFee'] = item['ignoreSlottingFee']
        if 'preferredShelfNumber' in item:
            rule_code_map[rule_code]['preferredShelfNumber'] = item['preferredShelfNumber']

    # Convert the map to a list of rules
    for rule_code, rule in rule_code_map.items():
        rule_logics_list = list(rule['ruleLogics'].values())
        rule['ruleLogics'] = rule_logics_list
        planogram_rules.append(rule)

    return planogram_rules

# Function to write data to a JSON file
def write_data_to_json(data, filename):
    with open(filename, 'w') as json_file:
        json.dump({'planogramRules': data}, json_file, cls=DecimalEncoder, indent=4)
    
def read_planogram_rules():
    # Read data from the DynamoDB table
    items = read_data_from_dynamodb(table_name)

    # Transform the data into the desired JSON format
    transformed_data = transform_data(items)

    return transformed_data

def read_planogram_instructions():
    # Read data from the DynamoDB table
    items = read_data_from_dynamodb(util.readParameterValueFromSSM('/planogram/dynamodb/canned_instructions'))
    # print(items)
    return items

def read_llm_models():
    # Read data from the DynamoDB table
    items = read_data_from_dynamodb(util.readParameterValueFromSSM('/planogram/dynamodb/llms'))
    # print(items)
    return items

def get_local_md5(filename):
    """Calculate the MD5 hash of a local file."""
    with open(filename, 'rb') as f:
        md5 = hashlib.md5(usedforsecurity=False)
        while True:
            data = f.read(10240)
            if not data:
                break
            md5.update(data)
        return md5.hexdigest()

def get_s3_etag(bucket, key):
    """Retrieve the ETag of an S3 object."""
    response = s3_client.head_object(Bucket=bucket, Key=key)
    return response['ETag'].strip('"')

def compare_files(bucket, key, local_file):
    """Compare a local file with an S3 object based on ETag and last modified timestamp."""
    try:
        s3_etag = get_s3_etag(bucket, key)
        local_md5 = get_local_md5(local_file)
        # S3 ETag and local MD5 are not directly comparable for multipart uploads
        # For simplicity, assume single-part uploads here
        if s3_etag!= local_md5:
            return True
        # Compare last modified timestamps
        s3_last_modified = s3_client.head_object(Bucket=bucket, Key=key)['LastModified']
        local_last_modified = datetime.fromtimestamp(os.path.getmtime(local_file), tz=timezone.utc)
        if s3_last_modified.replace(microsecond=0)!= local_last_modified.replace(microsecond=0):
            return True
        return False
    except Exception as e:
        print(f"Error comparing {key}: {e}")
        return True

def download_file(bucket, key, local_file):
    """Download an S3 object to a local file."""
    print(f"Downloading {key} to {local_file}")
    s3_client.download_file(bucket, key, local_file)
    print(f"Downloaded {key} to {local_file}")

def sync_s3_folder_with_local_folder(bucket_name, s3_folder, local_folder):
    """
    Compare files between an S3 folder and a local folder, and download only the modified or new files.

    :param s3_client: Boto3 S3 client
    :param bucket_name: Name of the S3 bucket
    :param s3_folder: Path to the S3 folder (e.g., 'path/to/s3/folder/')
    :param local_folder: Path to the local folder
    """
    # Ensure the S3 folder path ends with a slash
    if not s3_folder.endswith('/'):
        s3_folder += '/'

    # Ensure local directory exists
    os.makedirs(local_folder, exist_ok=True)
    
    # Ensure s3_folder ends with a slash
    if not s3_folder.endswith('/'):
        s3_folder += '/'
    
    # List objects in S3 folder
    s3_objects = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=s3_folder)
    
    for obj in s3_objects.get('Contents', []):
        s3_file = obj['Key']
        local_file = os.path.join(local_folder, os.path.relpath(s3_file, s3_folder))
        
        # Create local directories if they don't exist
        os.makedirs(os.path.dirname(local_file), exist_ok=True)
        
        # Download file from S3 to local
        try:
            s3_client.download_file(bucket_name, s3_file, local_file)
            print(f"Downloaded: {s3_file} to {local_file}")
        except ClientError as e:
            print(f"Error downloading {s3_file}: {e}")
    
    # Upload local files not in S3
    for root, _, files in os.walk(local_folder):
        for file in files:
            local_file = os.path.join(root, file)
            relative_path = os.path.relpath(local_file, local_folder)
            s3_file = s3_folder + relative_path.replace(os.sep, '/')
            
            try:
                s3_client.head_object(Bucket=bucket_name, Key=s3_file)
            except ClientError:
                # File doesn't exist in S3, upload it
                try:
                    s3_client.upload_file(local_file, bucket_name, s3_file)
                    print(f"Uploaded: {local_file} to {s3_file}")
                except ClientError as e:
                    print(f"Error uploading {local_file}: {e}")

# Write the transformed data to a JSON file
print(read_planogram_instructions())

print("Data written to planogram_rules.json")