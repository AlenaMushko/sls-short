# Serverless ShortLinker

#### Serverless ShortLinker is a serverless, cost-effective and flexible URL shortening API. Built on AWS services.
#### It provides features such as authorization, URL shortening, link management, statistics, and notifications.

## Features
###### User Authentication: Login and registration using email and password.
###### Link Management: Create, manage, and deactivate shortened links.
###### Link Stats: Record visits to each shortened link.
###### Link Lifetime: Set expiration for links with options like one-time use, 1 day, 3 days, or 7 days.
###### Notifications: Receive email notifications for link deactivation.

## Technical Stack
###### Runtime: AWS Lambda with NodeJS v18.x.
###### Language: TypeScript.
###### Bundling: esbuild.
###### IaC: Serverless Framework or SST with CloudFormation.
###### Database: Amazon DynamoDB with Global Tables for region replication.
###### Scheduling: AWS EventBridge.
###### Messaging: Amazon SQS for queue management and Amazon SES for email notifications.

## Getting Started
###### AWS CLI configured with appropriate permissions.
###### Node.js v18.x or later.
###### Serverless framework installed globally.

###### Clone the repository:
###### git clone https://github.com/AlenaMushko/sls-short
###### cd sls-short
###### npm install

#### Deployment
###### sls deploy --stage dev

## Usage
###### Sign Up: Register a new user by sending a POST request to /auth/sign-up.
###### Sign In: Authenticate a user and receive a token by sending a POST request to /auth/sign-in.

###### Create Link: Send a POST request to /link with the original URL and expiration time.
###### List Links: Retrieve a list of created links by sending a GET request to /link/{userId}/list.
###### Deactivate Link: Deactivate a specific link by sending a PUT request to /link/{userId}/deactivate/{linkId}.

## Project Structure
###### src/handlers/ - Contains Lambda function handlers.
###### serverless.yml - Serverless Framework configuration file.

## Postman Collection 
###### serverless.postman_collection.json

## OpenAPI 
###### 

## Task 
###### https://docs.google.com/document/d/1FibDkSVPWFRydyNhuwo7T8kLFgwsc-Crve-OtpNQu10/edit?usp=sharing

