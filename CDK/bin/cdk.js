#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack.js';

const stackName = process.env.GROUP_PROJECT_STACK_NAME

if (!stackName || !stackName.trim()) {
  console.error('Environment variable GROUP_PROJECT_STACK_NAME is not set')
  process.exit(1)
}

const settings = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || 'NOT_SET',
    region: process.env.CDK_DEFAULT_REGION || 'NOT_SET'
  },
  stackName: stackName,
  certArn: cdk.Fn.importValue('CTASharedCertArn'), // SSL cert for HTTPS
  permissionsBoundaryPolicyName: 'scopePermissions',
  domainName: 'cta-training.academy', // Root domain
  subDomain: stackName.toLowerCase(),
  dbName: 'dev',
  vpcName: 'CTASharedVPC-vpc'
}

const app = new cdk.App();
new CdkStack(app, 'CdkStack', {
  env: settings.env,
  permissionsBoundaryPolicyName: settings.permissionsBoundaryPolicyName,
  subDomain: settings.subDomain,
  stackName: settings.stackName,
  certArn: settings.certArn,
  domainName: settings.domainName,
  dbName: settings.dbName,
  vpcName: settings.vpcName  
});

