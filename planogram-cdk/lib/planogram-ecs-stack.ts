import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs'; 
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class PlanogramEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const consumerPublicIP = this.node.tryGetContext('consumer_public_ip');
    if (consumerPublicIP !== undefined) {
      // Execute shell script to create the docker image and repository
      const awsAccountId = this.node.tryGetContext('awsAccountId');
      const awsRegion = this.node.tryGetContext('awsRegion');

      const imageUri = `${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/planogram-app-repo:latest`;
      const imageArn = `arn:aws:ecr:${awsRegion}:${awsAccountId}:repository/planogram-app-repo`;
      const planogramS3Bucket = this.node.tryGetContext('planogram_s3_bucket');;
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
      const cfnVPC = vpc.node.defaultChild as ec2.CfnVPC;
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
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
            'ecr:BatchCheckLayerAvailability'
          ],
          resources: [`${imageArn}`],
      }));
      executionRole.addToPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:ListBucket',
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject'
          ],
          resources: [`arn:aws:s3:::${planogramS3Bucket}`,
                      `arn:aws:s3:::${planogramS3Bucket}/*`],
      }));
      executionRole.addToPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:BatchWriteItem',
            'dynamodb:GetItem',
            'dynamodb:BatchGetItem',
            'dynamodb:Scan',
            'dynamodb:Query',
            'dynamodb:ConditionCheckItem'
          ],
          resources: [`arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/Planogram*`],
      }));
      executionRole.addToPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ssm:DescribeParameters',
            'ssm:GetParameter',
            'ssm:GetParameters',
            'ssm:PutParameter',
            'ssm:DeleteParameter'
          ],
          resources: [`arn:aws:ssm:${awsRegion}:${awsAccountId}:parameter/planogram/*`],
      }));
      executionRole.addToPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'bedrock:*'
          ],
          resources: [`arn:aws:bedrock:${awsRegion}::foundation-model/anthropic.*`],
      }));
      // Create a new security group
      const taskSecurityGroup = new ec2.SecurityGroup(this, 'PlanogramTaskSecurityGroup', {
          vpc: vpc, // Assuming you have a VPC defined
          description: 'Security group for ECS task',
          allowAllOutbound: true,
          
      });
      // Add an ingress rule to allow traffic on port 80 from a specific IP
      taskSecurityGroup.addIngressRule(
          ec2.Peer.ipv4(`${consumerPublicIP}/32`),
          ec2.Port.tcp(80),
          'Allow access to port 80 from specific Public IP'
      );
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
      new cdk.CfnOutput(this, 'TaskSecurityGroupId', {
        value: taskSecurityGroup.securityGroupId,
      });
    }
  }
}
