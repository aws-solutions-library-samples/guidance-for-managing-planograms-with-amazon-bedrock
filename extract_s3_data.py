import boto3
import os
from pathlib import Path

def download_s3_folder(bucket_name, s3_folder, local_dir):
    s3 = boto3.client('s3', region_name='us-east-2')
    paginator = s3.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=bucket_name, Prefix=s3_folder):
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.endswith('/'):
                continue
            
            local_file_path = os.path.join(local_dir, key[len(s3_folder):].lstrip('/'))
            local_file_dir = os.path.dirname(local_file_path)
            
            Path(local_file_dir).mkdir(parents=True, exist_ok=True)
            
            s3.download_file(bucket_name, key, local_file_path)
            print(f"Downloaded {key} to {local_file_path}")

# Usage
bucket_name = 'code-bucket-ad-20241001'
s3_folder = 'static/'
local_dir = 's3data'

download_s3_folder(bucket_name, s3_folder, local_dir)
