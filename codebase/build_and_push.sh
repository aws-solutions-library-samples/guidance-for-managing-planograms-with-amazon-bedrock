#!/bin/bash

# Set variables
ECR_REPOSITORY_NAME="planogram-app-repo"

cd $(dirname "$0")

# Authenticate Docker to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build Docker image
docker buildx build --platform linux/x86_64 -t ${ECR_REPOSITORY_NAME} .

# Tag Docker image
docker tag ${ECR_REPOSITORY_NAME}:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:latest

# Push Docker image to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:latest

echo "Docker image built and pushed to ECR successfully."