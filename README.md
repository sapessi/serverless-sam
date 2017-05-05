# Serverless SAM [![Build Status](https://travis-ci.org/SAPessi/serverless-sam.svg?branch=master)](https://travis-ci.org/SAPessi/serverless-sam)
Serverless-sam is a plugin for the [Serverless framework](https://serverless.com) that makes it easy to create [Serverless Application Model (SAM)](https://github.com/awslabs/serverless-application-model) templates from an application. The plugin adds the `sam` command to the serverless cli.

# Installation
From your Serverless application directory, use `npm` to install the plugin:

```
$ npm install --save-dev serverless-sam
```

Once you have installed the plugin, add it to your `serverless.yml` file in the `plugins` sections.

```yaml
service: my-serverless-service

plugins:
  - serverless-sam

frameworkVersion: ">=1.1.0 <2.0.0"
...
```

# Usage
Use the `sam export` command to generate a SAM definition from your service. Use the `--output` or `-o` option to set the name for the SAM template file.

```
$ serverless sam export --output ./sam-template.yml
```

Once you have exported the template, you can follow the standard procedure with the [AWS CLI](https://aws.amazon.com/cli/) to deploy the service. First, the package command reads the generated templates, uploads the packaged functions to an S3 bucket for deployment, and generates an output template with the S3 links to the function packages.

```
$ aws cloudformation package \
    --template-file /path_to_template/template.yaml \
    --s3-bucket bucket-name \
    --output-template-file packaged-template.yaml
```

The next step is to deploy the output template from the `package` command:

```
$ aws cloudformation deploy \
    --template-file /path_to_template/packaged-template.yaml \
    --stack-name my-new-stack \
    --capabilities CAPABILITY_IAM
```