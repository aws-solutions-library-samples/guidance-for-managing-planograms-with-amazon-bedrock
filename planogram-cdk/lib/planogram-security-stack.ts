import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export class PlanogramSecurityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Add a description to the stack
    this.templateOptions.description = 'Guidance name (SO9012)';
    const existingSecurityGroupId = this.node.tryGetContext('securityGroupId');
    // Reference an existing security group
    if (existingSecurityGroupId !== undefined && existingSecurityGroupId.length !== 0){
        const existingSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        'ExistingSecurityGroup',
        existingSecurityGroupId // Replace with your actual security group ID
        );

        // Create an AwsCustomResource to revoke the ingress rule
        new AwsCustomResource(this, 'RevokeIngressRule', {
        onUpdate: {
            service: 'EC2',
            action: 'revokeSecurityGroupIngress',
            parameters: {
            GroupId: existingSecurityGroup.securityGroupId,
            IpPermissions: [{
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80,
                IpRanges: [{ CidrIp: '0.0.0.0/0' }]
            }]
            },
            physicalResourceId: PhysicalResourceId.of('RevokeIngressRule')
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
            resources: AwsCustomResourcePolicy.ANY_RESOURCE
        })
        });
    }
  }
}
