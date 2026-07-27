import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";

export interface GnflAppStackProps extends cdk.StackProps {
  readonly siteDomain: string;
  readonly hostedZoneName: string;
}

/**
 * Runtime application stack.
 * Phase 0: empty scaffold that synths successfully.
 * Later phases add S3, CloudFront, API Gateway, Lambda, DynamoDB, Route 53 aliases.
 */
export class GnflAppStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: GnflAppStackProps) {
    super(scope, id, props);

    new cdk.CfnOutput(this, "SiteDomain", {
      value: props.siteDomain,
      description: "Public site domain for GNFL (not yet provisioned in Phase 0)",
    });

    new cdk.CfnOutput(this, "HostedZoneName", {
      value: props.hostedZoneName,
      description: "Existing Route 53 hosted zone name (lookup in later phases)",
    });

    new cdk.CfnOutput(this, "Phase", {
      value: "0-scaffold",
      description: "Infrastructure scaffold phase marker",
    });
  }
}
