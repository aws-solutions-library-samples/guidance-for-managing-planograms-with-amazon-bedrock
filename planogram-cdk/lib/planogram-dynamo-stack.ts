import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as fs from 'fs';

export class PlanogramDynamoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.templateOptions.description = 'Guidance name (SO9012)';
    const dynamodbData = JSON.parse(fs.readFileSync('../dynamodb_data.json', 'utf-8'));

    for (const [tableName, tableInfo] of Object.entries(dynamodbData)) {
      const metadata = (tableInfo as any).metadata;
      const items = (tableInfo as any).items;

      const table = new dynamodb.Table(this, `${id}-${tableName}`, {
        tableName: metadata.TableName,
        partitionKey: {
          name: metadata.KeySchema[0].AttributeName,
          type: this.getAttributeType(metadata.AttributeDefinitions[0].AttributeType)
        },
        billingMode: metadata.BillingMode === 'PAY_PER_REQUEST' 
          ? dynamodb.BillingMode.PAY_PER_REQUEST 
          : dynamodb.BillingMode.PROVISIONED,
        removalPolicy: RemovalPolicy.DESTROY,
      });
      // Insert data using Custom Resource
      new cr.AwsCustomResource(this, `InsertData-${tableName}`, {
        onCreate: {
          service: 'DynamoDB',
          action: 'batchWriteItem',
          parameters: {
            RequestItems: {
              [tableName]: items.map((item: any) => ({
                PutRequest: {
                  Item: item
                }
              }))
            }
          },
          physicalResourceId: cr.PhysicalResourceId.of(`InsertData-${tableName}`)
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [table.tableArn]
        })
      });
    }
    const parameters = JSON.parse(fs.readFileSync('../ssm_parameters.json', 'utf-8'));

    parameters.forEach((param: any) => {
      new ssm.StringParameter(this, `Parameter-${param.Name}`, {
        parameterName: param.Name,
        stringValue: param.Value,
        type: param.Type === 'SecureString' ? ssm.ParameterType.SECURE_STRING : ssm.ParameterType.STRING,
      });
    });
  }
  
  private getAttributeType(type: string): dynamodb.AttributeType {
    switch (type) {
      case 'S': return dynamodb.AttributeType.STRING;
      case 'N': return dynamodb.AttributeType.NUMBER;
      case 'B': return dynamodb.AttributeType.BINARY;
      default: throw new Error(`Unsupported attribute type: ${type}`);
    }
  }
}
