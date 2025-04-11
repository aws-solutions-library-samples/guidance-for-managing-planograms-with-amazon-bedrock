import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class PlanogramS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // const awsRegion = this.node.tryGetContext('awsRegion');
    // const bucketName = `planogram-images-bucket-${awsRegion}`
    // Create a new S3 bucket
    const imageBucket = new s3.Bucket(this, 'PlanogramImageBucket', {
      // bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    new ssm.StringParameter(this, 'PlanogramImageBucketParameter', {
      parameterName: '/planogram/s3/bucket',
      stringValue: imageBucket.bucketName,
      description: 'Image Bucket Name', // Optional
      tier: ssm.ParameterTier.STANDARD, // Optional, STANDARD is default
      allowedPattern: '.*', // Optional, allows any string by default
    });
    new cdk.CfnOutput(this, 'ImageBucketName', {
            value: imageBucket.bucketName,
    });
  }
}
