import boto3
import json

def extract_dynamodb_data():
    dynamodb = boto3.client('dynamodb', region_name='us-east-2')
    tables = dynamodb.list_tables()['TableNames']
    result = {}
    for table_name in tables:
        table_data = dynamodb.describe_table(TableName=table_name)['Table']
        
        # Extract table metadata
        metadata = {
            'TableName': table_name,
            'KeySchema': table_data['KeySchema'],
            'AttributeDefinitions': table_data['AttributeDefinitions'],
            'BillingMode': table_data.get('BillingMode', 'PROVISIONED')
        }
        
        # Extract table data
        items = []
        scan_kwargs = {'TableName': table_name}
        done = False
        while not done:
            response = dynamodb.scan(**scan_kwargs)
            items.extend(response.get('Items', []))
            scan_kwargs['ExclusiveStartKey'] = response.get('LastEvaluatedKey')
            done = scan_kwargs['ExclusiveStartKey'] is None
        
        result[table_name] = {
            'metadata': metadata,
            'items': items
        }
    with open('dynamodb/dynamodb_data.json', 'w') as f:
        json.dump(result, f, indent=2)

if __name__ == '__main__':
    extract_dynamodb_data()
