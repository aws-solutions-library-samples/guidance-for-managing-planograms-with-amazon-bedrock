import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { execSync } from 'child_process';

export class PlanogramEcrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Execute shell script to create the docker image and repository
    const awsAccountId = this.node.tryGetContext('awsAccountId');
    const awsRegion = this.node.tryGetContext('awsRegion');
    const scriptPath = path.join(__dirname, '../../codebase/build_and_push.sh');
    
    if (awsAccountId !== undefined && awsRegion !== undefined && awsAccountId.length !== 0 && awsRegion.length !== 0) {
      const commands = [
          `export AWS_ACCOUNT_ID=${awsAccountId}`,
          `export AWS_REGION=${awsRegion}`,
          `sh -x ${scriptPath}`
        ];
      try {
        execSync(commands.join(' && '), { stdio: 'inherit'});
      } catch (error) {
        throw new Error(`Failed to 
          script: ${error}`);
      }
    }
  }
}
