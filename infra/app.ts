#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { GnflAppStack } from "./gnfl-app-stack.js";
import { GnflCiBootstrapStack } from "./gnfl-ci-bootstrap-stack.js";

const app = new cdk.App();

const deployRegion =
  (app.node.tryGetContext("deployRegion") as string | undefined) ?? "us-east-1";
const siteDomain =
  (app.node.tryGetContext("siteDomain") as string | undefined) ?? "gnfl.pitekusu.dev";
const hostedZoneName =
  (app.node.tryGetContext("hostedZoneName") as string | undefined) ?? "pitekusu.dev";
const githubOwner =
  (app.node.tryGetContext("githubOwner") as string | undefined) ?? "pitekusu";
const githubRepository =
  (app.node.tryGetContext("githubRepository") as string | undefined) ?? "gnfl";

const env: cdk.Environment = {
  region: deployRegion,
  ...(process.env.CDK_DEFAULT_ACCOUNT
    ? { account: process.env.CDK_DEFAULT_ACCOUNT }
    : {}),
};

new GnflAppStack(app, "GnflAppStack", {
  env,
  description: "GNFL runtime stack scaffold (Phase 0 — empty resources)",
  siteDomain,
  hostedZoneName,
});

new GnflCiBootstrapStack(app, "GnflCiBootstrapStack", {
  env,
  description: "GNFL GitHub OIDC bootstrap scaffold (Phase 0 — empty resources)",
  githubOwner,
  githubRepository,
});

app.synth();
