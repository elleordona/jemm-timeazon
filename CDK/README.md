# Welcome to your Group Project Infrastructure

This folder contains the AWS infrastructure for your group project.

Up until now you have only worked on the front end React application.\
We are now introducing:

-   Infrastructure as Code
-   API Gateway
-   Lambda
-   CloudFront
-   S3
-   Custom domains

All of this is managed using AWS CDK (JavaScript).

------------------------------------------------------------------------

# What This CDK Project Does

This stack currently provisions:

-   An S3 bucket for your React client
-   A CloudFront distribution in front of that bucket
-   A second S3 bucket for static images
-   A CloudFront distribution for static images
-   An API Gateway
-   A Lambda health check endpoint
-   Route53 records for custom domains
-   A CloudFront Function ready for SPA routing

You will extend this as your project grows.

------------------------------------------------------------------------

# Folder Structure

Your project should now look like this:

    group-project/
    │
    ├── client/               # Your React front end
    │   ├── static-images/    # You will have to create this folder and move your images to it (update paths in react)
    │
    ├── cdk/                  # Your infrastructure
    │   ├── bin/
    │   ├── lib/
    │   └── package.json
    │   └── all the other files


If your React app is not already inside a `client` folder, rename it.

The CDK folder must sit alongside your client folder, not inside it.

------------------------------------------------------------------------

# Getting Started

## 1. Set your stack name

Each group must deploy their own stack.\
We use an environment variable to control this.

Mac users:

``` bash
echo 'export GROUP_PROJECT_STACK_NAME=<YOUR_TEAM_NAME>' >> ~/.zshrc
source ~/.zshrc
```

Git Bash users:

``` bash
echo 'export GROUP_PROJECT_STACK_NAME=<YOUR_TEAM_NAME>' >> ~/.bashrc
source ~/.bashrc
```

Replace `<YOUR_TEAM_NAME>` with your team name.

Example:

``` bash
export GROUP_PROJECT_STACK_NAME=TimeTravellersNews
```

This becomes your subdomain.

You will need to source your terminal after exporting that value

```bash
source ~/.bashrc
``` 

And then you should be able to echo that value to make sure its available 

```bash
echo $GROUP_PROJECT_STACK_NAME
``` 

------------------------------------------------------------------------

## 2. Install dependencies

Inside the `cdk` folder:

``` bash
npm install
```

------------------------------------------------------------------------

## 3. Build your React app

Before deploying infrastructure, build your front end:

``` bash
cd ../client
npm run build
```

This creates the `dist` folder that CDK uploads to S3.

------------------------------------------------------------------------

## 4. Deploy

Back inside the CDK folder:

``` bash
npx cdk deploy
```

After deployment finishes, check the Outputs section.\
This contains:

-   Your site URL
-   Your API endpoint
-   Distribution IDs
-   Bucket names

------------------------------------------------------------------------

# Useful Commands

``` bash
npx cdk synth     # Show the generated CloudFormation
npx cdk diff      # Show changes before deploying
npx cdk deploy    # Deploy to AWS
npx cdk destroy   # Tear everything down
```

------------------------------------------------------------------------

# How The Pieces Connect

When someone visits your site:

1.  Route53 resolves your domain
2.  CloudFront receives the request
3.  CloudFront serves your React app from S3
4.  If the request starts with `/api`, it forwards to API Gateway
5.  API Gateway triggers Lambda
6.  Lambda returns a response

This is a full serverless architecture.

------------------------------------------------------------------------

# What You Will Build Next

You will now:

-   Add new Lambdas
-   Add new API routes
-   Connect your front end to the API
-   Enable Aurora when required

------------------------------------------------------------------------

# Comments

There are lots of comments around the stack file that will guide you as to things that need to be updated to match up with your react folders. 
I would advise you look at the folder structure first, then hook up any paths that need updating (**Deployments**)
