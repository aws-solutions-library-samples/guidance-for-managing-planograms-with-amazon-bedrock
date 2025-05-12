#!/bin/bash
#Set the environment variables
cd $(dirname "$0")
cdk bootstrap
cdk synth PlanogramDynamoStack
cdk destroy PlanogramDynamoStack --force
cdk deploy PlanogramDynamoStack --require-approval never
cdk synth PlanogramS3Stack
cdk destroy PlanogramS3Stack --force
cdk deploy PlanogramS3Stack --context awsRegion=${AWS_REGION} --require-approval never
rm -rf imageBucketName.txt
aws cloudformation describe-stacks --stack-name PlanogramS3Stack --query 'Stacks[0].Outputs[?OutputKey==`ImageBucketName`].OutputValue' --output text > imageBucketName.txt
export IMAGE_BUCKET_NAME=$(cat imageBucketName.txt)
aws s3 cp ../s3data s3://${IMAGE_BUCKET_NAME} --exclude ".DS_Store" --recursive
rm -rf imageBucketName.txt
ECR_REPOSITORY_NAME="planogram-app-repo"
ECR_REPO_EXISTS=$(aws ecr describe-repositories --repository-names "$ECR_REPOSITORY_NAME" 2>&1)
if [[ $ECR_REPO_EXISTS == *"RepositoryNotFoundException"* ]]; then
  echo "Repository does not exist, creating new ECR repository"
  echo $(aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME})
else
  echo "Repository exists."
  image_ids=$(aws ecr list-images --repository-name $ECR_REPOSITORY_NAME --query 'imageIds[*]' --output json) 
  if [ "$image_ids" != "[]" ]; then
      echo $(aws ecr batch-delete-image --repository-name $ECR_REPOSITORY_NAME --image-ids "$image_ids")
      echo "Deleted all images in repository: $ECR_REPOSITORY_NAME"
  else
      echo "No images found in repository: $ECR_REPOSITORY_NAME"
  fi
fi
cdk synth PlanogramEcrStack
cdk destroy PlanogramEcrStack --force
cdk deploy PlanogramEcrStack --context awsAccountId=${AWS_ACCOUNT_ID} --context awsRegion=${AWS_REGION} --require-approval never
cdk synth PlanogramEcsStack
cdk destroy PlanogramEcsStack --force
cdk deploy PlanogramEcsStack --context awsAccountId=${AWS_ACCOUNT_ID} --context awsRegion=${AWS_REGION} --context consumer_public_ip=${CONSUMER_PUBLIC_IP} --context planogram_s3_bucket=${IMAGE_BUCKET_NAME} --require-approval never
rm -rf dnsName.txt
aws cloudformation describe-stacks --stack-name PlanogramEcsStack --query 'Stacks[0].Outputs[?OutputKey==`PlanogramAppLoadBalancerDNS`].OutputValue' --output text > dnsName.txt
export PLANOGRAM_LB_DNS=$(cat dnsName.txt)
rm -rf dnsName.txt
rm -rf taskSecurityGroup.txt
aws cloudformation describe-stacks --stack-name PlanogramEcsStack --query 'Stacks[0].Outputs[?OutputKey==`TaskSecurityGroupId`].OutputValue' --output text > taskSecurityGroup.txt
export SECURITY_GROUP_ID=$(cat taskSecurityGroup.txt)
cdk synth PlanogramSecurityStack
cdk destroy PlanogramSecurityStack --force
cdk deploy PlanogramSecurityStack --context securityGroupId=${SECURITY_GROUP_ID} --require-approval never
rm -rf taskSecurityGroup.txt
echo "Planogram Demo URL: http://${PLANOGRAM_LB_DNS}"
