import boto3
import json

def read_parameters(region):
    ssm = boto3.client('ssm', region_name=region)
    parameters = []
    
    paginator = ssm.get_paginator('describe_parameters')
    for page in paginator.paginate():
        for param in page['Parameters']:
            if 'planogram' in str(param['Name']).lower():
                parameter = ssm.get_parameter(Name=param['Name'], WithDecryption=True)
                parameters.append({
                    'Name': param['Name'],
                    'Type': param['Type'],
                    'Value': parameter['Parameter']['Value']
                })
    
    with open('ssm_parameters.json', 'w') as f:
        json.dump(parameters, f, indent=2)

if __name__ == '__main__':
    source_region = 'us-east-2'  # Replace with your source region
    read_parameters(source_region)
