#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ArcanaStack } from '../lib/arcana-stack';

const app = new cdk.App();

new ArcanaStack(app, 'ArcanaStack', {
  description: 'Serverless AI tarot application infrastructure',
});
