import path from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'
import { join } from 'path'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as cdk from 'aws-cdk-lib'
import { Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


export class CdkStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // ----------------------------------
    // Domains
    // ----------------------------------
    const fullDomain = `${props.subDomain}.${props.domainName}`
    const staticImagesInS3Domain = `static-images-${props.subDomain}.${props.domainName}`

    // ----------------------------------
    // Tags
    // ----------------------------------
    cdk.Tags.of(this).add('Owner', props.stackName)
    cdk.Tags.of(this).add('Project', 'timeazon')
    
    // ----------------------------------
    // Permissions boundary
    // ----------------------------------
    const boundary = iam.ManagedPolicy.fromManagedPolicyName(this, 'Boundary', props.permissionsBoundaryPolicyName)
    
    iam.PermissionsBoundary.of(this).apply(boundary)
    

    // ----------------------------------
    // Networking
    // ----------------------------------

    // Look up the shared VPC to place our database in
    // Other services can then join the same network
    const sharedVpc = ec2.Vpc.fromLookup(this, 'sharedVpc', {
      vpcName: props.vpcName,
      region: props.env.region
    })
    
    // ----------------------------------
    // Databases - ONLY UNCOMMENT THIS WHEN YOU ARE READY TO ADD A DATABASE / YOUR APPICATION IS SET UP TO UTILISE A DATABASE AS IT'S CRAZY EXPENSIVE 
    // ----------------------------------

    // Choose the Aurora Postgres engine version
    const postgresVersion = rds.AuroraPostgresEngineVersion.VER_15_14;

    const postgresEngine = rds.DatabaseClusterEngine.auroraPostgres({
      version: postgresVersion,
    });

    // Create a parameter group that forces SSL
    const postgresParameterGroup = new rds.ParameterGroup(
      this,
      'postgres-parameter-group',
      {
        name: `${props.subDomain}-ParameterGroup`,
        engine: postgresEngine,
        description: `${props.subDomain} parameter group with SSL enforced`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        parameters: {
          'rds.force_ssl': '1' // require SSL for database connections
        }
      }
    )

    const cluster = new rds.DatabaseCluster(this, 'rds-cluster', {
      // Use the Postgres engine we defined above
      engine: postgresEngine,
      // Attach our parameter group so SSL is enforced
      parameterGroup: postgresParameterGroup,
      // Name of the default database in this cluster
      defaultDatabaseName: props.dbName,
      // Put the cluster into the shared CTA VPC
      vpc: sharedVpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
    
      // Aurora Serverless v2 configuration
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
    
      // Needed for the Data API from our Lambdas
      enableDataApi: true,
    
      // Tear the database down with the stack (fine for a lab, not for prod)
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // ----------------------------------
    // DynamoDB tables
    // ----------------------------------

    // Users table (one row per user)
    const usersTable = new dynamodb.Table(this, 'users-table', {
      tableName: `${props.subDomain}-users`,
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // Cart table (many items per user)
    const cartTable = new dynamodb.Table(this, 'cart-table', {
      tableName: `${props.subDomain}-cart`,
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'productId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // ----------------------------------
    // S3 buckets
    // ----------------------------------

    const staticImagesBucket = new s3.Bucket(this, 'static-images', {
      bucketName: `${props.subDomain}-static-images`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false
      }),
      cors: [
        {
          // for training, keep it simple – allow everything
          allowedOrigins: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD
          ],
          allowedHeaders: ["*"],
          exposedHeaders: [],
          maxAge: 3000
        }
      ]
    })

    const clientBucket = new s3.Bucket(this, 'client-bucket', {
      bucketName: `${props.subDomain}-client-bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false
      })
    })

    clientBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:*'],
        resources: [
          clientBucket.bucketArn,
          clientBucket.arnForObjects('*')
        ],
        conditions: {
          Bool: { 'aws:SecureTransport': 'false' }
        },
        principals: [new iam.AnyPrincipal()]
      })
    )

    clientBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [clientBucket.arnForObjects('*')],
        principals: [new iam.AnyPrincipal()]
      })
    )
    
    // ----------------------------------
    // Certificate
    // ----------------------------------

    const cert = acm.Certificate.fromCertificateArn(this,
      'BakehouseCert', //Don't change this i only made one cert 
      props.certArn
    )

    // ----------------------------------
    // CloudFront function
    // ----------------------------------

    const redirectsFunction = new cloudfront.Function(this, 'redirects-function', {
      functionName: `${props.subDomain}-redirects`,
      code: cloudfront.FunctionCode.fromFile({
        filePath: 'functions/redirects.js'
      })
    })

    const clientQueryPolicy = new cloudfront.OriginRequestPolicy(this,'client-query-policy',{
      originRequestPolicyName: `${props.subDomain}-client-query-policy`,
      queryStringBehavior:
        cloudfront.OriginRequestQueryStringBehavior.all()
    })

    // ----------------------------------
    // Lambda bundling
    // ----------------------------------

    const lambdaEnvVars = {
      NODE_ENV: 'production',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    
      // Aurora
      DB_NAME: props.dbName,
      CLUSTER_ARN: cluster.clusterArn,
      SECRET_ARN: cluster.secret?.secretArn || 'NOT_SET',
    
      // Static assets
      STATIC_IMAGES_BUCKET: staticImagesBucket.bucketName,
      STATIC_IMAGES_BASE_URL: `https://${staticImagesInS3Domain}`,
    
      // DynamoDB – users
      DYNAMO_TABLE_NAME: usersTable.tableName,
      DYNAMO_REGION: cdk.Stack.of(this).region,
    
      // DynamoDB – cart
      CART_TABLE_NAME: cartTable.tableName
    }

    // ----------------------------------
    // Lambdas
    // ----------------------------------

    const bootstrapLambda = new lambda.Function(this, 'bootstrap-lambda', {
      functionName: `${props.subDomain}-bootstrap-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'utility-functions.bootstrapHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    })
  
    const healthcheckLambda = new lambda.Function(this, 'health-check-lambda', {
      functionName: `${props.subDomain}-health-check-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'health-check.healthcheckHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    })

     const postProductLambda = new lambda.Function(this, 'post-product-lambda', {
      functionName: `${props.subDomain}-post-product-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'utility-functions.postProductHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
     })
    
     const deleteProductLambda = new lambda.Function(this, 'delete-product-lambda', {
      functionName: `${props.subDomain}-delete-product-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'utility-functions.deleteProductHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
     })

    // product catalogue
    const productCatalogLambda = new lambda.Function(this, 'product-catalog-lambda', {
      functionName: `${props.subDomain}-product-catalog-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'utility-functions.productCatalogHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: {
        ...lambdaEnvVars,
        FEATURED_PRODUCT: ''
      }
    })
    
    // Grant Lambdas that need it access to the Aurora Data API
    
    cluster.grantDataApiAccess(productCatalogLambda)
    cluster.grantDataApiAccess(postProductLambda)
    cluster.grantDataApiAccess(bootstrapLambda)
    cluster.grantDataApiAccess(deleteProductLambda)
    
    // Sign up, log in and add to cart lambdas that will use DynamoDB
    // sign up
    const postUsersLambda = new lambda.Function(this, 'post-users-lambda', {
      functionName: `${props.subDomain}-post-users-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'users.postUsersHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    })

    // log in
    const loginLambda = new lambda.Function(this, 'login-lambda', {
      functionName: `${props.subDomain}-login-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'users.loginHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    })

    const postToCartLambda = new lambda.Function(this, "post-tocart-lambda", {
      functionName: `${props.subDomain}-post-tocart-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "addToCart.postToCartHandler",
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    });

    const getToCartLambda = new lambda.Function(this, "get-tocart-lambda", {
      functionName: `${props.subDomain}-get-tocart-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "addToCart.getToCartHandler",
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    });

    const deleteFromCartLambda = new lambda.Function(this, "delete-fromcart-lambda", {
      functionName: `${props.subDomain}-delete-fromcart-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "addToCart.deleteFromCartHandler",
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    });

    // DynamoDB permissions
    // Users table
    usersTable.grantReadWriteData(postUsersLambda)
    usersTable.grantReadData(loginLambda)

    // Cart table
    cartTable.grantReadWriteData(postToCartLambda)
    cartTable.grantReadWriteData(getToCartLambda)
    cartTable.grantReadWriteData(deleteFromCartLambda)

    // S3 lambda images 
    // New Lambda to create pre signed upload urls
    const getImageUploadUrlLambda = new lambda.Function(this, 'get-image-upload-url-lambda', {
      functionName: `${props.subDomain}-get-image-upload-url-lambda`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'utility-functions.getImageUploadUrlHandler',
      code: lambda.Code.fromAsset('functions'),
      environment: lambdaEnvVars
    })

    // Allow it to upload objects to the static images bucket
    staticImagesBucket.grantPut(getImageUploadUrlLambda)

    // ----------------------------------
    // API Gateway
    // ----------------------------------
    const api = new apigw.RestApi(this, 'apigw', {
      restApiName: `${props.subDomain}-api`,
      description: `${props.subDomain} api gateway`,
      deploy: true,
      deployOptions: {
        stageName: 'api'
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'Access-Control-Allow-Origin',
          'Access-Control-Request-Method',
          'Access-Control-Request-Headers'
        ],
        allowMethods: ['*'],
        allowOrigins: ['*'],
        allowCredentials: true
      }
    })

    api.addUsagePlan('apigw-rate-limits', {
      name: `${props.subDomain}-apigw-rate-limits`,
      throttle: {
        rateLimit: 10,
        burstLimit: 5
      }
    })

    // Expose endpoint `/api/healthcheck`
    const healthchckApi = api.root.addResource('healthcheck')
    // Allow `/api/healthcheck` to receive GET requests, and tell it which lambder to trigger whn it does
    healthchckApi.addMethod('GET', new apigw.LambdaIntegration(healthcheckLambda))
    
    const productsApi = api.root.addResource('products')
    productsApi.addMethod('GET', new apigw.LambdaIntegration(productCatalogLambda))
    productsApi.addMethod('POST', new apigw.LambdaIntegration(postProductLambda))
    productsApi.addMethod('DELETE', new apigw.LambdaIntegration(deleteProductLambda))

    const usersApi = api.root.addResource('users')
    usersApi.addMethod('POST', new apigw.LambdaIntegration(postUsersLambda))

    const loginApi = api.root.addResource('login')
    loginApi.addMethod('POST', new apigw.LambdaIntegration(loginLambda))

    const addToCartApi = api.root.addResource("addtocart");
    addToCartApi.addMethod("GET", new apigw.LambdaIntegration(getToCartLambda));
    addToCartApi.addMethod("POST", new apigw.LambdaIntegration(postToCartLambda));
    addToCartApi.addMethod("DELETE", new apigw.LambdaIntegration(deleteFromCartLambda));

    // POST /image-upload-url
    const imageUploadUrlApi = api.root.addResource('image-upload-url')
    imageUploadUrlApi.addMethod('POST', new apigw.LambdaIntegration(getImageUploadUrlLambda))

    // ----------------------------------
    // CloudFront distributions
    // ----------------------------------

    const clientDistribution = new cloudfront.Distribution(this, 'client-distribution', {
      defaultBehavior: {
        origin: new origins.S3BucketOrigin(clientBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: clientQueryPolicy,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: redirectsFunction
          }
        ]
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(
            `${api.restApiId}.execute-api.${props.env.region}.amazonaws.com`
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        }
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0)
        }
      ],
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      domainNames: [fullDomain],
      certificate: cert
    })

    new s3Deployment.BucketDeployment(this, 'client-deployment', {
      destinationBucket: clientBucket,
      sources: [
        s3Deployment.Source.asset(
          path.resolve(__dirname, '../../Marketplace/dist') // THIS PATH NEEDS TO BE CORRECT TO YOUR CLIENT(REACT) DIST FOLDER - this is created when you build your react app
        )
      ],
      prune: true,
      memoryLimit: 256,
      distribution: clientDistribution,
      distributionPaths: ['/*']
    })

    const staticImagesDistribution = new cloudfront.Distribution(this,'static-images-distribution',{
      defaultBehavior: {
        origin: new origins.S3BucketOrigin(staticImagesBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: redirectsFunction
          }
        ]
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      domainNames: [staticImagesInS3Domain],
      certificate: cert
    })

    new s3Deployment.BucketDeployment(this, 'static-images-deployment', {
      destinationBucket: staticImagesBucket,
      sources: [
        s3Deployment.Source.asset(
          path.resolve(__dirname, '../../Marketplace/static-images') // THIS PATH NEEDS TO BE CORRECT TO YOUR FOLDER that has static images inside
        )
      ],
      prune: true,
      memoryLimit: 256,
      distribution: staticImagesDistribution,
      distributionPaths: ['/*']
    })


    // ----------------------------------
    // Route 53
    // ----------------------------------
    const zone = route53.HostedZone.fromLookup(this, 'zone', { domainName: props.domainName })

    new route53.CnameRecord(this, 'static-images-record', {
      zone,
      recordName: staticImagesInS3Domain,
      domainName: staticImagesDistribution.distributionDomainName
    })

    new route53.CnameRecord(this, 'client-record', {
      zone,
      recordName: fullDomain,
      domainName: clientDistribution.distributionDomainName
    })

    // ----------------------------------
    // Write to a client env file - You might need to know the domain to access static images from your react files!
    // ----------------------------------
    writeFileSync(
      join(__dirname, '../../Marketplace/.env.production'), // THIS PATH WILL NEED TO CHANGE TO BE IN YOUR CLIENT DIRECTORY
      `VITE_STATIC_IMAGES_DOMAIN=https://${staticImagesInS3Domain}\n`
    )

    // --------------------------------------------------
    // OUTPUTS INTO THE CONSOLE 
    // --------------------------------------------------

    // --------------------------------------------------
    // 01 – Site URLs (What users open in the browser)
    // --------------------------------------------------

    new cdk.CfnOutput(this, "01_Site_ClientUrl", {
      value: `https://${fullDomain}`
    })

    new cdk.CfnOutput(this, "01_Site_StaticImagesUrl", {
      value: `https://${staticImagesInS3Domain}`
    })


    // --------------------------------------------------
    // 02 – API Endpoints (What devs test)
    // --------------------------------------------------

    new cdk.CfnOutput(this, "02_Api_Healthcheck_ViaCloudFront", {
      value: `https://${fullDomain}/api/healthcheck`
    })

    new cdk.CfnOutput(this, "02_Api_Healthcheck_DirectApiGateway", {
      value: `https://${api.restApiId}.execute-api.${props.env.region}.amazonaws.com/api/healthcheck`
    })

    new cdk.CfnOutput(this, "productCatalogLambda_ViaCloudFront", {
      value: `https://${fullDomain}/api/products`
    })

    new cdk.CfnOutput(this, "productCatalolgLambda_DirectApiGateway", {
      value: `https://${api.restApiId}.execute-api.${props.env.region}.amazonaws.com/api/products`
    })

    
    // --------------------------------------------------
    // 03 – CloudFront (Debugging + invalidations)
    // --------------------------------------------------

    new cdk.CfnOutput(this, "03_CloudFront_ClientDistributionId", {
      value: clientDistribution.distributionId
    })

    new cdk.CfnOutput(this, "03_CloudFront_ClientDistributionDomain", {
      value: clientDistribution.distributionDomainName
    })

    new cdk.CfnOutput(this, "03_CloudFront_StaticImagesDistributionId", {
      value: staticImagesDistribution.distributionId
    })

    new cdk.CfnOutput(this, "03_CloudFront_StaticImagesDistributionDomain", {
      value: staticImagesDistribution.distributionDomainName
    })


    // --------------------------------------------------
    // 04 – Storage (S3 Buckets)
    // --------------------------------------------------

    new cdk.CfnOutput(this, "04_S3_ClientBucketName", {
      value: clientBucket.bucketName
    })

    new cdk.CfnOutput(this, "04_S3_StaticImagesBucketName", {
      value: staticImagesBucket.bucketName
    })


    // --------------------------------------------------
    // 05 – Compute (Lambdas)
    // --------------------------------------------------

    new cdk.CfnOutput(this, "05_Lambda_HealthcheckFunctionName", {
      value: healthcheckLambda.functionName
    })


    // --------------------------------------------------
    // 06 – Database (Aurora Serverless v2)
    // COMMENT THIS SECTION OUT UNTIL AURORA IS ENABLED
    // --------------------------------------------------

    
    new cdk.CfnOutput(this, "06_Database_ClusterArn", {
      value: cluster.clusterArn
    })

    new cdk.CfnOutput(this, "06_Database_ClusterEndpoint", {
      value: cluster.clusterEndpoint.hostname
    })

    new cdk.CfnOutput(this, "06_Database_Name", {
      value: props.dbName
    })

    new cdk.CfnOutput(this, "06_Database_SecretArn", {
      value: cluster.secret?.secretArn || "NOT_SET"
    })
    

  }
}

