"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanogramEcsStack = void 0;
const cdk = require("aws-cdk-lib");
const ecs = require("aws-cdk-lib/aws-ecs");
const iam = require("aws-cdk-lib/aws-iam");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
class PlanogramEcsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Execute shell script to create the docker image and repository
        const account = aws_cdk_lib_1.Stack.of(this).account;
        const region = aws_cdk_lib_1.Stack.of(this).region;
        const imageUri = `${account}.dkr.ecr.${region}.amazonaws.com/planogram-app-repo:latest`;
        // Create VPC with public and private subnets
        const vpc = new ec2.Vpc(this, 'PlanogranTaskVPC', {
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                }
            ]
        });
        // Enable DNS hostnames and resolution
        const cfnVPC = vpc.node.defaultChild;
        cfnVPC.enableDnsHostnames = true;
        cfnVPC.enableDnsSupport = true;
        vpc.addInterfaceEndpoint('ECRDockerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        });
        vpc.addInterfaceEndpoint('ECREndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
        });
        vpc.addGatewayEndpoint('S3Endpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
        });
        // Create ECS Cluster
        const cluster = new ecs.Cluster(this, 'PlanogramDevCluster', {
            vpc: vpc,
        });
        // Create Task Execution Role
        const executionRole = new iam.Role(this, 'TaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));
        executionRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                '*',
            ],
            resources: ['*'],
        }));
        // Create a new security group
        const taskSecurityGroup = new ec2.SecurityGroup(this, 'PlanogramTaskSecurityGroup', {
            vpc: vpc, // Assuming you have a VPC defined
            description: 'Security group for ECS task',
            allowAllOutbound: true
        });
        const consumerPublicIP = this.node.tryGetContext('consumer_public_ip');
        // Add an ingress rule to allow traffic on port 8000 from a specific IP
        taskSecurityGroup.addIngressRule(ec2.Peer.ipv4(`${consumerPublicIP}/32`), ec2.Port.tcp(8000), 'Allow access to port 8000 from specific Public IP');
        // Create Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'PlanogramAppTaskDefinition', {
            memoryLimitMiB: 8192,
            cpu: 4096,
            executionRole: executionRole,
            taskRole: executionRole
        });
        // Add container to Task Definition
        taskDefinition.addContainer('PlanogramWebContainer', {
            image: ecs.ContainerImage.fromRegistry(imageUri),
            portMappings: [{ containerPort: 8000 }],
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'planogram-app-logs' }),
        });
        // Create Fargate Service
        const service = new ecs.FargateService(this, 'PlanogramAppFargateService', {
            cluster: cluster,
            taskDefinition: taskDefinition,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            assignPublicIp: false,
            desiredCount: 2,
        });
        // Create Application Load Balancer
        const lb = new elbv2.ApplicationLoadBalancer(this, 'planogram-app-dev-lb', {
            vpc,
            securityGroup: taskSecurityGroup,
            internetFacing: true,
        });
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'PlanogramTargetGroup', {
            vpc: vpc,
            port: 8000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            stickinessCookieDuration: cdk.Duration.hours(1),
            stickinessCookieName: 'session',
            healthCheck: {
                path: '/healthcheck',
                healthyHttpCodes: '200'
            }
        });
        targetGroup.addTarget(service);
        lb.addListener('planogram-app-listener', {
            port: 80,
            defaultTargetGroups: [targetGroup], // Add this line
        });
        // Output the Load Balancer DNS Name
        new cdk.CfnOutput(this, 'PlanogramAppLoadBalancerDNS', {
            value: lb.loadBalancerDnsName,
        });
    }
}
exports.PlanogramEcsStack = PlanogramEcsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhbm9ncmFtLWVjcy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYW5vZ3JhbS1lY3Mtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFFM0MsNkNBQW9DO0FBQ3BDLDJDQUEyQztBQUMzQyxnRUFBZ0U7QUFFaEUsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGlFQUFpRTtRQUNqRSxNQUFNLE9BQU8sR0FBRyxtQkFBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDdkMsTUFBTSxNQUFNLEdBQUcsbUJBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRXJDLE1BQU0sUUFBUSxHQUFHLEdBQUcsT0FBTyxZQUFZLE1BQU0sMENBQTBDLENBQUM7UUFFeEYsNkNBQTZDO1FBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDOUMsTUFBTSxFQUFFLENBQUM7WUFDVCxXQUFXLEVBQUUsQ0FBQztZQUNkLG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO2lCQUNsQztnQkFDRDtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsU0FBUztvQkFDZixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7aUJBQy9DO2FBQ0Y7U0FDSixDQUFDLENBQUM7UUFFSCxzQ0FBc0M7UUFDdEMs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O1FBQ3BDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLEVBQUUsQ0FBQyxtQkFBbUI7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbElELDhDQWtJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJzsgXG5pbXBvcnQgeyBTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcblxuZXhwb3J0IGNsYXNzIFBsYW5vZ3JhbUVjc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgIFxuICAgIC8vIEV4ZWN1dGUgc2hlbGwgc2NyaXB0IHRvIGNyZWF0ZSB0aGUgZG9ja2VyIGltYWdlIGFuZCByZXBvc2l0b3J5XG4gICAgY29uc3QgYWNjb3VudCA9IFN0YWNrLm9mKHRoaXMpLmFjY291bnQ7XG4gICAgY29uc3QgcmVnaW9uID0gU3RhY2sub2YodGhpcykucmVnaW9uO1xuXG4gICAgY29uc3QgaW1hZ2VVcmkgPSBgJHthY2NvdW50fS5ka3IuZWNyLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tL3BsYW5vZ3JhbS1hcHAtcmVwbzpsYXRlc3RgO1xuICAgIFxuICAgIC8vIENyZWF0ZSBWUEMgd2l0aCBwdWJsaWMgYW5kIHByaXZhdGUgc3VibmV0c1xuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdQbGFub2dyYW5UYXNrVlBDJywge1xuICAgICAgICBtYXhBenM6IDIsXG4gICAgICAgIG5hdEdhdGV3YXlzOiAxLFxuICAgICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgICAgbmFtZTogJ1B1YmxpYycsXG4gICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgICBuYW1lOiAnUHJpdmF0ZScsXG4gICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH0pO1xuICAgIFxuICAgIC8vIEVuYWJsZSBETlMgaG9zdG5hbWVzIGFuZCByZXNvbHV0aW9uXG4gICAgY29uc3QgY2ZuVlBDID0gdnBjLm5vZGUuZGVmYXVsdENoaWxkIGFzIGVjMi5DZm5WUEM7XG4gICAgY2ZuVlBDLmVuYWJsZURuc0hvc3RuYW1lcyA9IHRydWU7XG4gICAgY2ZuVlBDLmVuYWJsZURuc1N1cHBvcnQgPSB0cnVlO1xuXG4gICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdFQ1JEb2NrZXJFbmRwb2ludCcsIHtcbiAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5FQ1JfRE9DS0VSLFxuICAgICAgICB9KTtcbiAgICAgICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdFQ1JFbmRwb2ludCcsIHtcbiAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5FQ1IsXG4gICAgICAgIH0pO1xuICAgICAgICB2cGMuYWRkR2F0ZXdheUVuZHBvaW50KCdTM0VuZHBvaW50Jywge1xuICAgICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5TMyxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBFQ1MgQ2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ1BsYW5vZ3JhbURldkNsdXN0ZXInLCB7XG4gICAgICAgIHZwYzogdnBjLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIFRhc2sgRXhlY3V0aW9uIFJvbGVcbiAgICBjb25zdCBleGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdUYXNrRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXG4gICAgfSk7XG4gIFxuICAgIGV4ZWN1dGlvblJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BbWF6b25FQ1NUYXNrRXhlY3V0aW9uUm9sZVBvbGljeScpKTtcbiAgICBleGVjdXRpb25Sb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJyonLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcbiAgICAvLyBDcmVhdGUgYSBuZXcgc2VjdXJpdHkgZ3JvdXBcbiAgICBjb25zdCB0YXNrU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnUGxhbm9ncmFtVGFza1NlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYzogdnBjLCAvLyBBc3N1bWluZyB5b3UgaGF2ZSBhIFZQQyBkZWZpbmVkXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEVDUyB0YXNrJyxcbiAgICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnN0IGNvbnN1bWVyUHVibGljSVAgPSB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnY29uc3VtZXJfcHVibGljX2lwJyk7XG4gICAgLy8gQWRkIGFuIGluZ3Jlc3MgcnVsZSB0byBhbGxvdyB0cmFmZmljIG9uIHBvcnQgODAwMCBmcm9tIGEgc3BlY2lmaWMgSVBcbiAgICB0YXNrU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgICAgZWMyLlBlZXIuaXB2NChgJHtjb25zdW1lclB1YmxpY0lQfS8zMmApLFxuICAgICAgICBlYzIuUG9ydC50Y3AoODAwMCksXG4gICAgICAgICdBbGxvdyBhY2Nlc3MgdG8gcG9ydCA4MDAwIGZyb20gc3BlY2lmaWMgUHVibGljIElQJ1xuICAgICk7XG4gICAgLy8gQ3JlYXRlIFRhc2sgRGVmaW5pdGlvblxuICAgIGNvbnN0IHRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ1BsYW5vZ3JhbUFwcFRhc2tEZWZpbml0aW9uJywge1xuICAgICAgICBtZW1vcnlMaW1pdE1pQjogODE5MixcbiAgICAgICAgY3B1OiA0MDk2LFxuICAgICAgICBleGVjdXRpb25Sb2xlOiBleGVjdXRpb25Sb2xlLFxuICAgICAgICB0YXNrUm9sZTogZXhlY3V0aW9uUm9sZVxuICAgIH0pO1xuICAgIC8vIEFkZCBjb250YWluZXIgdG8gVGFzayBEZWZpbml0aW9uXG4gICAgdGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdQbGFub2dyYW1XZWJDb250YWluZXInLCB7XG4gICAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KGltYWdlVXJpKSxcbiAgICAgICAgcG9ydE1hcHBpbmdzOiBbeyBjb250YWluZXJQb3J0OiA4MDAwIH1dLFxuICAgICAgICBsb2dnaW5nOiBlY3MuTG9nRHJpdmVycy5hd3NMb2dzKHsgc3RyZWFtUHJlZml4OiAncGxhbm9ncmFtLWFwcC1sb2dzJyB9KSxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBDcmVhdGUgRmFyZ2F0ZSBTZXJ2aWNlXG4gICAgY29uc3Qgc2VydmljZSA9IG5ldyBlY3MuRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1BsYW5vZ3JhbUFwcEZhcmdhdGVTZXJ2aWNlJywge1xuICAgICAgICBjbHVzdGVyOiBjbHVzdGVyLFxuICAgICAgICB0YXNrRGVmaW5pdGlvbjogdGFza0RlZmluaXRpb24sXG4gICAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICB9LFxuICAgICAgICBhc3NpZ25QdWJsaWNJcDogZmFsc2UsXG4gICAgICAgIGRlc2lyZWRDb3VudDogMixcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXG4gICAgY29uc3QgbGIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ3BsYW5vZ3JhbS1hcHAtZGV2LWxiJywge1xuICAgICAgdnBjLFxuICAgICAgc2VjdXJpdHlHcm91cDogdGFza1NlY3VyaXR5R3JvdXAsXG4gICAgICBpbnRlcm5ldEZhY2luZzogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRhcmdldEdyb3VwID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcywgJ1BsYW5vZ3JhbVRhcmdldEdyb3VwJywge1xuICAgICAgICB2cGM6IHZwYyxcbiAgICAgICAgcG9ydDogODAwMCxcbiAgICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JUCxcbiAgICAgICAgc3RpY2tpbmVzc0Nvb2tpZUR1cmF0aW9uOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgICAgIHN0aWNraW5lc3NDb29raWVOYW1lOiAnc2Vzc2lvbicsXG4gICAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgICAgcGF0aDogJy9oZWFsdGhjaGVjaycsXG4gICAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCdcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHRhcmdldEdyb3VwLmFkZFRhcmdldChzZXJ2aWNlKTtcbiAgICBcbiAgICBsYi5hZGRMaXN0ZW5lcigncGxhbm9ncmFtLWFwcC1saXN0ZW5lcicsIHtcbiAgICAgICAgcG9ydDogODAsXG4gICAgICAgIGRlZmF1bHRUYXJnZXRHcm91cHM6IFt0YXJnZXRHcm91cF0sIC8vIEFkZCB0aGlzIGxpbmVcbiAgICB9KTtcbiAgICAvLyBPdXRwdXQgdGhlIExvYWQgQmFsYW5jZXIgRE5TIE5hbWVcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUGxhbm9ncmFtQXBwTG9hZEJhbGFuY2VyRE5TJywge1xuICAgICAgdmFsdWU6IGxiLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==