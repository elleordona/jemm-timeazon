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
import * as logs from 'aws-cdk-lib/aws-logs'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @typedef {import('aws-cdk-lib').StackProps & {
 *  stackName: string,
 *  subDomain:string,
 *  domainName: string,
 *  permissionsBoundaryPolicyName: string,
 *  vpcName: string,
 *  dbName: string,
 *  certArn: string,
 *  environmentName: 'dev' | 'prod',
 *  devWebAclArn?: string,
 *  loadBalancerArn: string,
 * }} CdkStackProps
 */

export class CdkStack extends Stack {
	/**
	 *
	 * @param {Construct} scope
	 * @param {string} id
	 * @param {CdkStackProps} props
	 */
	constructor(scope, id, props) {
		super(scope, id, props)
		const isDev = props.environmentName === "dev"
		const isProd = props.environmentName === "prod"

		// ----------------------------------
		// Domains
		// ----------------------------------
		const fullDomain = isProd
			? `${props.subDomain}.${props.domainName}`
			: `${props.subDomain}-dev.${props.domainName}`
		const staticImagesInS3Domain = isProd
			? `static-images-${props.subDomain}.${props.domainName}`
			: `static-images-${props.subDomain}-dev.${props.domainName}`

		// ----------------------------------
		// Tags
		// ----------------------------------
		cdk.Tags.of(this).add("Owner", props.stackName)
		cdk.Tags.of(this).add("Project", "timeazon")
		cdk.Tags.of(this).add("Environment", props.environmentName)

		// ----------------------------------
		// Permissions boundary
		// ----------------------------------
		const boundary = iam.ManagedPolicy.fromManagedPolicyName(
			this,
			"Boundary",
			props.permissionsBoundaryPolicyName,
		)

		iam.PermissionsBoundary.of(this).apply(boundary)

		// ----------------------------------
		// Networking
		// ----------------------------------

		// Look up the shared VPC to place our database in
		// Other services can then join the same network
		const sharedVpc = ec2.Vpc.fromLookup(this, "sharedVpc", {
			vpcName: props.vpcName,
			region: props.env.region,
		})

		// ----------------------------------
		// Databases - ONLY UNCOMMENT THIS WHEN YOU ARE READY TO ADD A DATABASE / YOUR APPICATION IS SET UP TO UTILISE A DATABASE AS IT'S CRAZY EXPENSIVE
		// ----------------------------------

		// Choose the Aurora Postgres engine version
		const postgresVersion = rds.AuroraPostgresEngineVersion.VER_15_14

		const postgresEngine = rds.DatabaseClusterEngine.auroraPostgres({
			version: postgresVersion,
		})

		// Create a parameter group that forces SSL
		const postgresParameterGroup = new rds.ParameterGroup(
			this,
			"postgres-parameter-group",
			{
				name: `${props.subDomain}-${props.environmentName}-ParameterGroup`,
				engine: postgresEngine,
				description: `${props.subDomain} parameter group with SSL enforced`,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
				parameters: {
					"rds.force_ssl": "1", // require SSL for database connections
				},
			},
		)

		const cluster = new rds.DatabaseCluster(this, "rds-cluster", {
			// Use the Postgres engine we defined above
			engine: postgresEngine,
			// Attach our parameter group so SSL is enforced
			parameterGroup: postgresParameterGroup,
			// Name of the default database in this cluster
			defaultDatabaseName: props.dbName,
			// Put the cluster into the shared CTA VPC
			vpc: sharedVpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
			},

			// Aurora Serverless v2 configuration
			writer: rds.ClusterInstance.serverlessV2("writer"),
			serverlessV2MinCapacity: 0.5,
			serverlessV2MaxCapacity: 1,

			// Needed for the Data API from our Lambdas
			enableDataApi: true,

			// Tear the database down with the stack (fine for a lab, not for prod)
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		})

		// ----------------------------------
		// DynamoDB tables
		// ----------------------------------

		// Users table (one row per user)
		const usersTable = new dynamodb.Table(this, "users-table", {
			tableName: `${props.subDomain}-${props.environmentName}-users`,
			partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		})

		// Cart table (many items per user)
		const cartTable = new dynamodb.Table(this, "cart-table", {
			tableName: `${props.subDomain}-${props.environmentName}-cart`,
			partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "productId", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		})

		// ----------------------------------
		// S3 buckets
		// ----------------------------------

		const cloudFrontLogsBucket = new s3.Bucket(this, 'cloudfront-logs-bucket', {
			bucketName: `${props.subDomain}-${props.environmentName}-cloudfront-logs`,
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
			removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: isDev,
			lifecycleRules: [
				{
					expiration: isProd ? cdk.Duration.days(180) : cdk.Duration.days(30)
				}
			]
		})

		const staticImagesBucket = new s3.Bucket(this, "static-images", {
			bucketName: `${props.subDomain}-${props.environmentName}-static-images`,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			publicReadAccess: false,
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			cors: [
				{
					allowedOrigins: [`https://${fullDomain}`],
					allowedMethods: [
						s3.HttpMethods.GET,
						s3.HttpMethods.PUT,
						s3.HttpMethods.HEAD,
					],
					allowedHeaders: ["*"],
					exposedHeaders: [],
					maxAge: 3000,
				},
			],
		})

		const clientBucket = new s3.Bucket(this, "client-bucket", {
			bucketName: `${props.subDomain}-${props.environmentName}-client-bucket`,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			publicReadAccess: false,
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
		})

		clientBucket.addToResourcePolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.DENY,
				actions: ["s3:*"],
				resources: [clientBucket.bucketArn, clientBucket.arnForObjects("*")],
				conditions: {
					Bool: { "aws:SecureTransport": "false" },
				},
				principals: [new iam.AnyPrincipal()],
			}),
		)

		staticImagesBucket.addToResourcePolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.DENY,
				actions: ["s3:*"],
				resources: [
					staticImagesBucket.bucketArn,
					staticImagesBucket.arnForObjects("*"),
				],
				conditions: {
					Bool: { "aws:SecureTransport": "false" },
				},
				principals: [new iam.AnyPrincipal()],
			}),
		)

		// ----------------------------------
		// Certificate
		// ----------------------------------

		const cert = acm.Certificate.fromCertificateArn(
			this,
			"BakehouseCert", //Don't change this i only made one cert
			props.certArn,
		)

		// ----------------------------------
		// CloudFront function
		// ----------------------------------

		const redirectsFunction = new cloudfront.Function(
			this,
			"redirects-function",
			{
				functionName: `${props.subDomain}-${props.environmentName}-redirects`,
				code: cloudfront.FunctionCode.fromFile({
					filePath: "functions/redirects.js",
				}),
			},
		)

		const clientQueryPolicy = new cloudfront.OriginRequestPolicy(
			this,
			"client-query-policy",
			{
				originRequestPolicyName: `${props.subDomain}-${props.environmentName}-client-query-policy`,
				queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
			},
		)

		// New origin access identities

		// Client OAI
		const clientOai = new cloudfront.OriginAccessIdentity(this, "client-oai", {
			comment: `${props.subDomain}-${props.environmentName}-client-oai`,
		})

		// Static Images OAI
		const staticImagesOai = new cloudfront.OriginAccessIdentity(
			this,
			"static-images-oai",
			{
				comment: `${props.subDomain}-${props.environmentName}-static-images-oai`,
			},
		)

		clientBucket.grantRead(clientOai)
		staticImagesBucket.grantRead(staticImagesOai)

		// ----------------------------------
		// Lambda bundling
		// ----------------------------------

		const lambdaEnvVars = {
			NODE_ENV: "production",
			AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",

			// Aurora
			DB_NAME: props.dbName,
			CLUSTER_ARN: cluster.clusterArn,
			SECRET_ARN: cluster.secret?.secretArn || "NOT_SET",

			// Static assets
			STATIC_IMAGES_BUCKET: staticImagesBucket.bucketName,
			STATIC_IMAGES_BASE_URL: `https://${staticImagesInS3Domain}`,

			// DynamoDB – users
			DYNAMO_TABLE_NAME: usersTable.tableName,
			DYNAMO_REGION: cdk.Stack.of(this).region,

			// DynamoDB – cart
			CART_TABLE_NAME: cartTable.tableName,
		}

		// ----------------------------------
		// Lambdas
		// ----------------------------------

		const bootstrapLambda = new lambda.Function(this, "bootstrap-lambda", {
			functionName: `${props.subDomain}-${props.environmentName}-bootstrap-lambda`,
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: "utility-functions.bootstrapHandler",
			code: lambda.Code.fromAsset(join(__dirname, '../functions'), {
				exclude: ['users.js', 'addToCart.js', 'health-check.js']
			}),
			environment: lambdaEnvVars,
		})

		// Allow access to database
		cluster.grantDataApiAccess(bootstrapLambda)

		// ----------------------------------
		// Application Load Balancer
		// ----------------------------------

		// Grab existing LB from aws
		const loadBalancer = elbv2.ApplicationLoadBalancer.fromLookup(
			this,
			'ALB',
			{
				loadBalancerArn: props.loadBalancerArn
			}
		)

		// ----------------------------------
		// CloudFront distributions
		// ----------------------------------

		const clientDistribution = new cloudfront.Distribution(
			this,
			"client-distribution",
			{
				defaultBehavior: {
					origin: origins.S3BucketOrigin.withOriginAccessIdentity(
						clientBucket,
						{
							originAccessIdentity: clientOai,
						},
					),
					viewerProtocolPolicy:
						cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					originRequestPolicy: clientQueryPolicy,
					functionAssociations: [
						{
							eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
							function: redirectsFunction,
						},
					],
				},
				additionalBehaviors: {
					"/api/*": {
						origin: new origins.LoadBalancerV2Origin(loadBalancer, {
							protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
						}),
						viewerProtocolPolicy:
							cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
						allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
						cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
						originRequestPolicy:
							cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
					},
				},
				errorResponses: [
					{
						httpStatus: 403,
						responseHttpStatus: 200,
						responsePagePath: "/index.html",
						ttl: cdk.Duration.seconds(0),
					},
					{
						httpStatus: 404,
						responseHttpStatus: 200,
						responsePagePath: "/index.html",
						ttl: cdk.Duration.seconds(0),
					},
				],
				defaultRootObject: "index.html",
				enableLogging: true,
				logBucket: cloudFrontLogsBucket,
				logFilePrefix: `${props.environmentName}/client/`,
				priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
				domainNames: [fullDomain],
				certificate: cert,
				webAclId: props.devWebAclArn,
			},
		)

		new s3Deployment.BucketDeployment(this, "client-deployment", {
			destinationBucket: clientBucket,
			sources: [
				s3Deployment.Source.asset(
					path.resolve(__dirname, "../../Marketplace/dist"), // THIS PATH NEEDS TO BE CORRECT TO YOUR CLIENT(REACT) DIST FOLDER - this is created when you build your react app
				),
			],
			prune: true,
			memoryLimit: 256,
			distribution: clientDistribution,
			distributionPaths: ["/*"],
		})

		const staticImagesDistribution = new cloudfront.Distribution(
			this,
			"static-images-distribution",
			{
				defaultBehavior: {
					origin: origins.S3BucketOrigin.withOriginAccessIdentity(
						staticImagesBucket,
						{
							originAccessIdentity: staticImagesOai,
						},
					),
					viewerProtocolPolicy:
						cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					functionAssociations: [
						{
							eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
							function: redirectsFunction,
						},
					],
				},
				enableLogging: true,
				logBucket: cloudFrontLogsBucket,
				logFilePrefix: `${props.environmentName}/static-images/`,
				priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
				domainNames: [staticImagesInS3Domain],
				certificate: cert,
				webAclId: props.devWebAclArn,
			},
		)

		new s3Deployment.BucketDeployment(this, "static-images-deployment", {
			destinationBucket: staticImagesBucket,
			sources: [
				s3Deployment.Source.asset(
					path.resolve(__dirname, "../../Marketplace/static-images"), // THIS PATH NEEDS TO BE CORRECT TO YOUR FOLDER that has static images inside
				),
			],
			prune: true,
			memoryLimit: 256,
			distribution: staticImagesDistribution,
			distributionPaths: ["/*"],
		})

		// ----------------------------------
		// Route 53
		// ----------------------------------
		const zone = route53.HostedZone.fromLookup(this, "zone", {
			domainName: props.domainName,
		})

		new route53.CnameRecord(this, "static-images-record", {
			zone,
			recordName: staticImagesInS3Domain,
			domainName: staticImagesDistribution.distributionDomainName,
		})

		new route53.CnameRecord(this, "client-record", {
			zone,
			recordName: fullDomain,
			domainName: clientDistribution.distributionDomainName,
		})

		// ----------------------------------
		// Write to a client env file - You might need to know the domain to access static images from your react files!
		// ----------------------------------
		writeFileSync(
			join(__dirname, "../../Marketplace/.env.production"), // THIS PATH WILL NEED TO CHANGE TO BE IN YOUR CLIENT DIRECTORY
			`VITE_STATIC_IMAGES_DOMAIN=https://${staticImagesInS3Domain}\n`,
		)

		// --------------------------------------------------
		// OUTPUTS INTO THE CONSOLE
		// --------------------------------------------------

		// --------------------------------------------------
		// 01 – Site URLs (What users open in the browser)
		// --------------------------------------------------

		new cdk.CfnOutput(this, "01_Site_ClientUrl", {
			value: `https://${fullDomain}`,
		})

		new cdk.CfnOutput(this, "01_Site_StaticImagesUrl", {
			value: `https://${staticImagesInS3Domain}`,
		})

		// --------------------------------------------------
		// 02 – API Endpoints (What devs test)
		// --------------------------------------------------

		// new cdk.CfnOutput(this, "02_Api_Healthcheck_ViaCloudFront", {
		// 	value: `https://${fullDomain}/api/healthcheck`,
		// })

		// new cdk.CfnOutput(this, "02_Api_Healthcheck_DirectApiGateway", {
		// 	value: `https://${api.restApiId}.execute-api.${props.env.region}.amazonaws.com/api/healthcheck`,
		// })

		// new cdk.CfnOutput(this, "productCatalogLambda_ViaCloudFront", {
		// 	value: `https://${fullDomain}/api/products`,
		// })

		// new cdk.CfnOutput(this, "productCatalolgLambda_DirectApiGateway", {
		// 	value: `https://${api.restApiId}.execute-api.${props.env.region}.amazonaws.com/api/products`,
		// })

		// --------------------------------------------------
		// 03 – CloudFront (Debugging + invalidations)
		// --------------------------------------------------

		new cdk.CfnOutput(this, "03_CloudFront_ClientDistributionId", {
			value: clientDistribution.distributionId,
		})

		new cdk.CfnOutput(this, "03_CloudFront_ClientDistributionDomain", {
			value: clientDistribution.distributionDomainName,
		})

		new cdk.CfnOutput(this, "03_CloudFront_StaticImagesDistributionId", {
			value: staticImagesDistribution.distributionId,
		})

		new cdk.CfnOutput(this, "03_CloudFront_StaticImagesDistributionDomain", {
			value: staticImagesDistribution.distributionDomainName,
		})

		// --------------------------------------------------
		// 04 – Storage (S3 Buckets)
		// --------------------------------------------------

		new cdk.CfnOutput(this, "04_S3_ClientBucketName", {
			value: clientBucket.bucketName,
		})

		new cdk.CfnOutput(this, "04_S3_StaticImagesBucketName", {
			value: staticImagesBucket.bucketName,
		})

		// --------------------------------------------------
		// 05 – Compute (Lambdas)
		// --------------------------------------------------

		// new cdk.CfnOutput(this, "05_Lambda_HealthcheckFunctionName", {
		// 	value: healthcheckLambda.functionName,
		// })

		// --------------------------------------------------
		// 06 – Database (Aurora Serverless v2)
		// COMMENT THIS SECTION OUT UNTIL AURORA IS ENABLED
		// --------------------------------------------------

		new cdk.CfnOutput(this, "06_Database_ClusterArn", {
			value: cluster.clusterArn,
		})

		new cdk.CfnOutput(this, "06_Database_ClusterEndpoint", {
			value: cluster.clusterEndpoint.hostname,
		})

		new cdk.CfnOutput(this, "06_Database_Name", {
			value: props.dbName,
		})

		new cdk.CfnOutput(this, "06_Database_SecretArn", {
			value: cluster.secret?.secretArn || "NOT_SET",
		})
	}
}
