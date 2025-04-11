#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PlanogramDynamoStack } from '../lib/planogram-dynamo-stack';
import { PlanogramS3Stack } from '../lib/planogram-s3-stack';
// import { PlanogramCognitoStack } from '../lib/planogram-cognito-stack';
import { PlanogramEcsStack } from '../lib/planogram-ecs-stack';
import { PlanogramEcrStack } from '../lib/planogram-ecr-stack';
import { PlanogramSecurityStack } from '../lib/planogram-security-stack';

async function main() {
    const app = new cdk.App();
    new PlanogramDynamoStack(app, 'PlanogramDynamoStack');
    new PlanogramS3Stack(app, 'PlanogramS3Stack');
    // new PlanogramCognitoStack(app, 'PlanogramCognitoStack');
    new PlanogramEcrStack(app, 'PlanogramEcrStack');
    new PlanogramEcsStack(app, 'PlanogramEcsStack');
    new PlanogramSecurityStack(app, 'PlanogramSecurityStack');
    app.synth();
}
main().catch(console.error);
