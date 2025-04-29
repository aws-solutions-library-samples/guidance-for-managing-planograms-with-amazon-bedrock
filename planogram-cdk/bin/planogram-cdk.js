#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("aws-cdk-lib");
const planogram_dynamo_stack_1 = require("../lib/planogram-dynamo-stack");
const planogram_s3_stack_1 = require("../lib/planogram-s3-stack");
// import { PlanogramCognitoStack } from '../lib/planogram-cognito-stack';
const planogram_ecs_stack_1 = require("../lib/planogram-ecs-stack");
const planogram_ecr_stack_1 = require("../lib/planogram-ecr-stack");
async function main() {
    const app = new cdk.App();
    new planogram_dynamo_stack_1.PlanogramDynamoStack(app, 'PlanogramDynamoStack');
    new planogram_s3_stack_1.PlanogramS3Stack(app, 'PlanogramS3Stack');
    // new PlanogramCognitoStack(app, 'PlanogramCognitoStack');
    new planogram_ecr_stack_1.PlanogramEcrStack(app, 'PlanogramEcrStack', {
        env: {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION,
        },
        description: "Guidance for Planogram Management Using Amazon Bedrock (SO9012)"
    });
    new planogram_ecs_stack_1.PlanogramEcsStack(app, 'PlanogramEcsStack', {
        env: {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION,
        },
    });
    app.synth();
}
main().catch(console.error);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhbm9ncmFtLWNkay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYW5vZ3JhbS1jZGsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUNBQW1DO0FBQ25DLDBFQUFxRTtBQUNyRSxrRUFBNkQ7QUFDN0QsMEVBQTBFO0FBQzFFLG9FQUErRDtBQUMvRCxvRUFBK0Q7QUFFL0QsS0FBSyxVQUFVLElBQUk7SUFDZixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixJQUFJLDZDQUFvQixDQUFDLEdBQUcsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3RELElBQUkscUNBQWdCLENBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDOUMsMkRBQTJEO0lBQzNELElBQUksdUNBQWlCLENBQUMsR0FBRyxFQUFFLG1CQUFtQixFQUFDO1FBQzNDLEdBQUcsRUFBRTtZQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtZQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0I7U0FDdkM7S0FBRSxDQUFDLENBQUM7SUFDVCxJQUFJLHVDQUFpQixDQUFDLEdBQUcsRUFBRSxtQkFBbUIsRUFBQztRQUMzQyxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7WUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCO1NBQ3ZDO0tBQUUsQ0FBQyxDQUFDO0lBQ1QsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFDRCxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFBsYW5vZ3JhbUR5bmFtb1N0YWNrIH0gZnJvbSAnLi4vbGliL3BsYW5vZ3JhbS1keW5hbW8tc3RhY2snO1xuaW1wb3J0IHsgUGxhbm9ncmFtUzNTdGFjayB9IGZyb20gJy4uL2xpYi9wbGFub2dyYW0tczMtc3RhY2snO1xuLy8gaW1wb3J0IHsgUGxhbm9ncmFtQ29nbml0b1N0YWNrIH0gZnJvbSAnLi4vbGliL3BsYW5vZ3JhbS1jb2duaXRvLXN0YWNrJztcbmltcG9ydCB7IFBsYW5vZ3JhbUVjc1N0YWNrIH0gZnJvbSAnLi4vbGliL3BsYW5vZ3JhbS1lY3Mtc3RhY2snO1xuaW1wb3J0IHsgUGxhbm9ncmFtRWNyU3RhY2sgfSBmcm9tICcuLi9saWIvcGxhbm9ncmFtLWVjci1zdGFjayc7XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICBuZXcgUGxhbm9ncmFtRHluYW1vU3RhY2soYXBwLCAnUGxhbm9ncmFtRHluYW1vU3RhY2snKTtcbiAgICBuZXcgUGxhbm9ncmFtUzNTdGFjayhhcHAsICdQbGFub2dyYW1TM1N0YWNrJyk7XG4gICAgLy8gbmV3IFBsYW5vZ3JhbUNvZ25pdG9TdGFjayhhcHAsICdQbGFub2dyYW1Db2duaXRvU3RhY2snKTtcbiAgICBuZXcgUGxhbm9ncmFtRWNyU3RhY2soYXBwLCAnUGxhbm9ncmFtRWNyU3RhY2snLHtcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICAgICAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgICAgICAgfSx9KTtcbiAgICBuZXcgUGxhbm9ncmFtRWNzU3RhY2soYXBwLCAnUGxhbm9ncmFtRWNzU3RhY2snLHtcbiAgICAgICAgZW52OiB7XG4gICAgICAgICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICAgICAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTixcbiAgICAgICAgfSx9KTtcbiAgICBhcHAuc3ludGgoKTtcbn1cbm1haW4oKS5jYXRjaChjb25zb2xlLmVycm9yKTtcbiJdfQ==
