import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";

export interface GnflCiBootstrapStackProps extends cdk.StackProps {
  readonly githubOwner: string;
  readonly githubRepository: string;
}

/**
 * One-time CI bootstrap stack scaffold.
 * Phase 0: outputs only. Later phases add GitHub OIDC provider reference and deploy role.
 */
export class GnflCiBootstrapStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: GnflCiBootstrapStackProps) {
    super(scope, id, props);

    const repository = `${props.githubOwner}/${props.githubRepository}`;

    new cdk.CfnOutput(this, "GitHubRepository", {
      value: repository,
      description: "GitHub repository trusted by deploy role (later phases)",
    });

    new cdk.CfnOutput(this, "Phase", {
      value: "0-scaffold",
      description: "CI bootstrap scaffold phase marker",
    });
  }
}
