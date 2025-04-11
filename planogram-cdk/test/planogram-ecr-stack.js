"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanogramEcrStack = void 0;
// import * as cdk from 'aws-cdk-lib';
// import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
// import * as ecs from 'aws-cdk-lib/aws-ecs';
// import * as logs from 'aws-cdk-lib/aws-logs';
// import * as iam from 'aws-cdk-lib/aws-iam';
// import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
// import * as cr from 'aws-cdk-lib/custom-resources';
// import { Construct } from 'constructs';
// import * as path from 'path';
const cdk = require("aws-cdk-lib");
const path = require("path");
const child_process_1 = require("child_process");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class PlanogramEcrStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Execute shell script to create the docker image and repository
        const account = aws_cdk_lib_1.Stack.of(this).account;
        const region = aws_cdk_lib_1.Stack.of(this).region;
        const scriptPath = path.join(__dirname, '../../codebase/build_and_push.sh');
        const commands = [
            `export AWS_ACCOUNT_ID=${account}`,
            `export AWS_REGION=${region}`,
            `sh -x ${scriptPath}`
        ];
        try {
            (0, child_process_1.execSync)(commands.join(' && '), { stdio: 'inherit' });
        }
        catch (error) {
            throw new Error(`Failed to 
        script: ${error}`);
        }
        // const imageUri = `${account}.dkr.ecr.${region}.amazonaws.com/planogram-app-repo:latest`;
        // // Create ECS Cluster
        // const cluster = new ecs.Cluster(this, 'planogram-app-cluster');
        // // Create Fargate Task Definition
        // const taskDefinition = new ecs.FargateTaskDefinition(this, 'PlanogramAppTaskDefinition', {
        //     memoryLimitMiB: 8192,  // 8GB
        //     cpu: 4096,
        // });
        // // Add container to Task Definition
        // const container = taskDefinition.addContainer('planogram-web-container', {
        //   image: ecs.EcrImage.fromEcrRepository,
        //   memoryLimitMiB: 8192,  // Allocate all memory to the container
        //   cpu: 4096, 
        //   portMappings: [{ containerPort: 8000 }],
        //   logging: ecs.LogDrivers.awsLogs({
        //     streamPrefix: 'planogram-task-logs',
        //     // Optional: Create a new log group
        //     logGroup: new logs.LogGroup(this, 'planogram-task-log-group', {
        //       logGroupName: '/ecs/planogram-task-logs',
        //       retention: logs.RetentionDays.ONE_WEEK,
        //       removalPolicy: cdk.RemovalPolicy.DESTROY, // Optional: automatically delete logs when stack is destroyed
        //     }),
        //   })
        // });
        // Create ECS Fargate Service
        // const service = new ecs.FargateService(this, 'PlanogramAppWebService', {
        //   cluster,
        //   taskDefinition,
        //   desiredCount: 2,
        // });
        // // Create Application Load Balancer
        // const lb = new elbv2.ApplicationLoadBalancer(this, 'planogram-app-dev-lb', {
        //   vpc,
        //   internetFacing: true,
        // });
        // // Add listener to ALB
        // const listener = lb.addListener('planogram-app-listener', { port: 80 });
        // // Add targets to ALB
        // listener.addTargets('ECS', {
        //   port: 8000,
        //   targets: [service],
        //   healthCheck: { path: '/healthcheck' },
        // });
        // // Output the Load Balancer DNS Name
        // new cdk.CfnOutput(this, 'PlanogramAppLoadBalancerDNS', {
        //   value: lb.loadBalancerDnsName,
        // });
    }
}
exports.PlanogramEcrStack = PlanogramEcrStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhbm9ncmFtLWVjci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYW5vZ3JhbS1lY3Itc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXNDO0FBQ3RDLGlFQUFpRTtBQUNqRSw4Q0FBOEM7QUFDOUMsZ0RBQWdEO0FBQ2hELDhDQUE4QztBQUM5QyxtRUFBbUU7QUFDbkUsc0RBQXNEO0FBQ3RELDBDQUEwQztBQUMxQyxnQ0FBZ0M7QUFDaEMsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQUc3QixpREFBeUM7QUFDekMsNkNBQW9DO0FBRXBDLE1BQWEsaUJBQWtCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDOUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixpRUFBaUU7UUFDakUsTUFBTSxPQUFPLEdBQUcsbUJBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLG1CQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sUUFBUSxHQUFHO1lBQ2IseUJBQXlCLE9BQU8sRUFBRTtZQUNsQyxxQkFBcUIsTUFBTSxFQUFFO1lBQzdCLFNBQVMsVUFBVSxFQUFFO1NBQ3RCLENBQUM7UUFDSixJQUFJLENBQUM7WUFDSCxJQUFBLHdCQUFRLEVBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQztrQkFDSixLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7UUFFRCwyRkFBMkY7UUFFM0Ysd0JBQXdCO1FBQ3hCLGtFQUFrRTtRQUVsRSxvQ0FBb0M7UUFDcEMsNkZBQTZGO1FBQzdGLG9DQUFvQztRQUNwQyxpQkFBaUI7UUFDakIsTUFBTTtRQUVOLHNDQUFzQztRQUN0Qyw2RUFBNkU7UUFDN0UsMkNBQTJDO1FBQzNDLG1FQUFtRTtRQUNuRSxnQkFBZ0I7UUFDaEIsNkNBQTZDO1FBQzdDLHNDQUFzQztRQUN0QywyQ0FBMkM7UUFDM0MsMENBQTBDO1FBQzFDLHNFQUFzRTtRQUN0RSxrREFBa0Q7UUFDbEQsZ0RBQWdEO1FBQ2hELGlIQUFpSDtRQUNqSCxVQUFVO1FBQ1YsT0FBTztRQUNQLE1BQU07UUFFTiw2QkFBNkI7UUFDN0IsMkVBQTJFO1FBQzNFLGFBQWE7UUFDYixvQkFBb0I7UUFDcEIscUJBQXFCO1FBQ3JCLE1BQU07UUFFTixzQ0FBc0M7UUFDdEMsK0VBQStFO1FBQy9FLFNBQVM7UUFDVCwwQkFBMEI7UUFDMUIsTUFBTTtRQUVOLHlCQUF5QjtRQUN6QiwyRUFBMkU7UUFFM0Usd0JBQXdCO1FBQ3hCLCtCQUErQjtRQUMvQixnQkFBZ0I7UUFDaEIsd0JBQXdCO1FBQ3hCLDJDQUEyQztRQUMzQyxNQUFNO1FBRU4sdUNBQXVDO1FBQ3ZDLDJEQUEyRDtRQUMzRCxtQ0FBbUM7UUFDbkMsTUFBTTtJQUVSLENBQUM7Q0FDRjtBQTdFRCw4Q0E2RUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuLy8gaW1wb3J0IHsgRG9ja2VySW1hZ2VBc3NldCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3ItYXNzZXRzJztcbi8vIGltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbi8vIGltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuLy8gaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuLy8gaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xuLy8gaW1wb3J0ICogYXMgY3IgZnJvbSAnYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlcyc7XG4vLyBpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbi8vIGltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuXG5leHBvcnQgY2xhc3MgUGxhbm9ncmFtRWNyU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgXG4gICAgLy8gRXhlY3V0ZSBzaGVsbCBzY3JpcHQgdG8gY3JlYXRlIHRoZSBkb2NrZXIgaW1hZ2UgYW5kIHJlcG9zaXRvcnlcbiAgICBjb25zdCBhY2NvdW50ID0gU3RhY2sub2YodGhpcykuYWNjb3VudDtcbiAgICBjb25zdCByZWdpb24gPSBTdGFjay5vZih0aGlzKS5yZWdpb247XG4gICAgY29uc3Qgc2NyaXB0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9jb2RlYmFzZS9idWlsZF9hbmRfcHVzaC5zaCcpO1xuICAgIGNvbnN0IGNvbW1hbmRzID0gW1xuICAgICAgICBgZXhwb3J0IEFXU19BQ0NPVU5UX0lEPSR7YWNjb3VudH1gLFxuICAgICAgICBgZXhwb3J0IEFXU19SRUdJT049JHtyZWdpb259YCxcbiAgICAgICAgYHNoIC14ICR7c2NyaXB0UGF0aH1gXG4gICAgICBdO1xuICAgIHRyeSB7XG4gICAgICBleGVjU3luYyhjb21tYW5kcy5qb2luKCcgJiYgJyksIHsgc3RkaW86ICdpbmhlcml0J30pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBcbiAgICAgICAgc2NyaXB0OiAke2Vycm9yfWApO1xuICAgIH1cblxuICAgIC8vIGNvbnN0IGltYWdlVXJpID0gYCR7YWNjb3VudH0uZGtyLmVjci4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbS9wbGFub2dyYW0tYXBwLXJlcG86bGF0ZXN0YDtcbiAgICBcbiAgICAvLyAvLyBDcmVhdGUgRUNTIENsdXN0ZXJcbiAgICAvLyBjb25zdCBjbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdwbGFub2dyYW0tYXBwLWNsdXN0ZXInKTtcblxuICAgIC8vIC8vIENyZWF0ZSBGYXJnYXRlIFRhc2sgRGVmaW5pdGlvblxuICAgIC8vIGNvbnN0IHRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ1BsYW5vZ3JhbUFwcFRhc2tEZWZpbml0aW9uJywge1xuICAgIC8vICAgICBtZW1vcnlMaW1pdE1pQjogODE5MiwgIC8vIDhHQlxuICAgIC8vICAgICBjcHU6IDQwOTYsXG4gICAgLy8gfSk7XG5cbiAgICAvLyAvLyBBZGQgY29udGFpbmVyIHRvIFRhc2sgRGVmaW5pdGlvblxuICAgIC8vIGNvbnN0IGNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcigncGxhbm9ncmFtLXdlYi1jb250YWluZXInLCB7XG4gICAgLy8gICBpbWFnZTogZWNzLkVjckltYWdlLmZyb21FY3JSZXBvc2l0b3J5LFxuICAgIC8vICAgbWVtb3J5TGltaXRNaUI6IDgxOTIsICAvLyBBbGxvY2F0ZSBhbGwgbWVtb3J5IHRvIHRoZSBjb250YWluZXJcbiAgICAvLyAgIGNwdTogNDA5NiwgXG4gICAgLy8gICBwb3J0TWFwcGluZ3M6IFt7IGNvbnRhaW5lclBvcnQ6IDgwMDAgfV0sXG4gICAgLy8gICBsb2dnaW5nOiBlY3MuTG9nRHJpdmVycy5hd3NMb2dzKHtcbiAgICAvLyAgICAgc3RyZWFtUHJlZml4OiAncGxhbm9ncmFtLXRhc2stbG9ncycsXG4gICAgLy8gICAgIC8vIE9wdGlvbmFsOiBDcmVhdGUgYSBuZXcgbG9nIGdyb3VwXG4gICAgLy8gICAgIGxvZ0dyb3VwOiBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAncGxhbm9ncmFtLXRhc2stbG9nLWdyb3VwJywge1xuICAgIC8vICAgICAgIGxvZ0dyb3VwTmFtZTogJy9lY3MvcGxhbm9ncmFtLXRhc2stbG9ncycsXG4gICAgLy8gICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgLy8gICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gT3B0aW9uYWw6IGF1dG9tYXRpY2FsbHkgZGVsZXRlIGxvZ3Mgd2hlbiBzdGFjayBpcyBkZXN0cm95ZWRcbiAgICAvLyAgICAgfSksXG4gICAgLy8gICB9KVxuICAgIC8vIH0pO1xuICBcbiAgICAvLyBDcmVhdGUgRUNTIEZhcmdhdGUgU2VydmljZVxuICAgIC8vIGNvbnN0IHNlcnZpY2UgPSBuZXcgZWNzLkZhcmdhdGVTZXJ2aWNlKHRoaXMsICdQbGFub2dyYW1BcHBXZWJTZXJ2aWNlJywge1xuICAgIC8vICAgY2x1c3RlcixcbiAgICAvLyAgIHRhc2tEZWZpbml0aW9uLFxuICAgIC8vICAgZGVzaXJlZENvdW50OiAyLFxuICAgIC8vIH0pO1xuXG4gICAgLy8gLy8gQ3JlYXRlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcbiAgICAvLyBjb25zdCBsYiA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAncGxhbm9ncmFtLWFwcC1kZXYtbGInLCB7XG4gICAgLy8gICB2cGMsXG4gICAgLy8gICBpbnRlcm5ldEZhY2luZzogdHJ1ZSxcbiAgICAvLyB9KTtcblxuICAgIC8vIC8vIEFkZCBsaXN0ZW5lciB0byBBTEJcbiAgICAvLyBjb25zdCBsaXN0ZW5lciA9IGxiLmFkZExpc3RlbmVyKCdwbGFub2dyYW0tYXBwLWxpc3RlbmVyJywgeyBwb3J0OiA4MCB9KTtcblxuICAgIC8vIC8vIEFkZCB0YXJnZXRzIHRvIEFMQlxuICAgIC8vIGxpc3RlbmVyLmFkZFRhcmdldHMoJ0VDUycsIHtcbiAgICAvLyAgIHBvcnQ6IDgwMDAsXG4gICAgLy8gICB0YXJnZXRzOiBbc2VydmljZV0sXG4gICAgLy8gICBoZWFsdGhDaGVjazogeyBwYXRoOiAnL2hlYWx0aGNoZWNrJyB9LFxuICAgIC8vIH0pO1xuXG4gICAgLy8gLy8gT3V0cHV0IHRoZSBMb2FkIEJhbGFuY2VyIEROUyBOYW1lXG4gICAgLy8gbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1BsYW5vZ3JhbUFwcExvYWRCYWxhbmNlckROUycsIHtcbiAgICAvLyAgIHZhbHVlOiBsYi5sb2FkQmFsYW5jZXJEbnNOYW1lLFxuICAgIC8vIH0pO1xuXG4gIH1cbn1cbiJdfQ==