#!/bin/bash

# Set variables
cdk destroy PlanogramDynamoStack --force
cdk destroy PlanogramS3Stack --force
cdk destroy PlanogramEcrStack --force
echo $(aws ecr delete-repository --repository-name planogram-app-repo --force)
cdk destroy PlanogramEcsStack --force