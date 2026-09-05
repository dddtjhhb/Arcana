import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class ArcanaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const openAiApiKey = new secretsmanager.Secret(this, 'OpenAiApiKey', {
      description: 'OpenAI API key used by the Arcana reading Lambda',
    });

    const readingLogGroup = new logs.LogGroup(this, 'ReadingLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const readingFunction = new lambda.Function(this, 'ReadingFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'reading.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      logGroup: readingLogGroup,
      environment: {
        APP_ENV: 'production',
        OPENAI_API_KEY_SECRET_ARN: openAiApiKey.secretArn,
        OPENAI_MODEL: 'gpt-5-mini',
        OPENAI_ROUTER_MODEL: 'gpt-5-nano',
      },
    });
    openAiApiKey.grantRead(readingFunction);

    const api = new apigateway.RestApi(this, 'ReadingApi', {
      restApiName: 'Arcana Reading API',
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 5,
        throttlingRateLimit: 2,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      },
    });

    const apiRoot = api.root.addResource('api');
    const readingRequest = api.addModel('ReadingRequest', {
      contentType: 'application/json',
      modelName: 'ArcanaReadingRequest',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'Arcana reading request',
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['question', 'mode', 'cards'],
        additionalProperties: false,
        properties: {
          question: { type: apigateway.JsonSchemaType.STRING, minLength: 1, maxLength: 1000 },
          mode: { type: apigateway.JsonSchemaType.STRING, enum: ['open', 'relationship', 'match'] },
          followUp: { type: apigateway.JsonSchemaType.STRING, maxLength: 500 },
          history: { type: apigateway.JsonSchemaType.ARRAY, maxItems: 8 },
          cards: {
            type: apigateway.JsonSchemaType.ARRAY,
            minItems: 3,
            maxItems: 3,
            items: {
              type: apigateway.JsonSchemaType.OBJECT,
              required: ['name', 'reversed', 'position'],
              properties: {
                name: { type: apigateway.JsonSchemaType.STRING, maxLength: 80 },
                reversed: { type: apigateway.JsonSchemaType.BOOLEAN },
                position: { type: apigateway.JsonSchemaType.STRING, maxLength: 40 },
                file: { type: apigateway.JsonSchemaType.STRING, maxLength: 100 },
                arcana: { type: apigateway.JsonSchemaType.STRING, maxLength: 40 },
              },
            },
          },
        },
      },
    });
    apiRoot.addResource('reading').addMethod(
      'POST',
      new apigateway.LambdaIntegration(readingFunction),
      {
        requestModels: { 'application/json': readingRequest },
        requestValidatorOptions: {
          requestValidatorName: 'reading-body-validator',
          validateRequestBody: true,
          validateRequestParameters: false,
        },
      },
    );

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.RestApiOrigin(api),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../site'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'OpenAiSecretArn', { value: openAiApiKey.secretArn });
  }
}
