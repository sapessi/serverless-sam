/*
 * Copyright 2017 Stefano Buliani (@sapessi)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict'

const SamFunctionBuilder = require('./FunctionBuilder');
const SamApiBuilder = require('./ApiBuilder');

class SamBuilder {

  constructor() {
    this.resources = {}
    this.outputs = null;
    this.conditions = null;
    this.parameters = null;
  }

  getResource(resourceName) {
    return this.resources[resourceName];
  }

  addFunction(resourceName) {
    return this.addResourceWithType(resourceName, SamFunctionBuilder);
  }

  addApi(resourceName) {
    return this.addResourceWithType(resourceName, SamApiBuilder);
  }

  addResourceWithType(resourceName, BuilderType) {
    if (this.resources[resourceName]) {
      throw new Error("Resource " + resourceName + " already exists");
    }
    const builder = new BuilderType();
    this.resources[resourceName] = {
      Type: builder.getSamType(),
      Properties: builder
    };
    return this.resources[resourceName].Properties;
  }

  addCustomResource(resourceName, obj, force) {
    if (this.resources[resourceName] && !force) {
      throw new Error("Resource " + resourceName + " already exists");
    }

    this.resources[resourceName] = obj;
  }

  addLambdaPermission(resourceName) {
    this.addCustomResource(`${resourceName}LambdaPermission`,
      {
        Type: 'AWS::Lambda::Permission',
        DependsOn: [resourceName],
        Properties: {
          Action: 'lambda:InvokeFunction',
          FunctionName: { Ref: resourceName },
          Principal: 'apigateway.amazonaws.com',
        },
      },
      true);
  }

  addOutput(logicalId, obj) {
    if (!this.outputs) {
      this.outputs = {};
    }

    if (this.outputs[logicalId]) {
      throw new Error("Output " + logicalId + " is already defined");
    }

    this.outputs[logicalId] = obj;
  }

  addParameter(logicalId, obj){
    if (!this.parameters) {
      this.parameters = {};
    }

    if (this.parameters[logicalId]){
      throw new Error("Parameter " + logicalId + " is already defined");
    }

    this.parameters[logicalId] = obj;
  }

  addCondition(logicalId, obj) {
    if (!this.conditions) {
      this.conditions = {};
    }

    if(this.outputs[logicalId]){
      throw new Error("Condition " + logicalId + " is already defined");
    }

    this.conditions[logicalId] = obj;
  }

  getResources(skipNulls) {
    return JSON.parse(JSON.stringify(this.resources, function(key, value) {
      if (skipNulls && value === null) {
        // skip null values
        return;
      }
      return value;
    }));
  }

  getTemplateObject() {
    let templateObject = {
      AWSTemplateFormatVersion:   '2010-09-09',
      Transform:                  'AWS::Serverless-2016-10-31',
      Description:                'SAM template for Serverless framework service: ',
      Resources:                  this.getResources(true)
    };

    if (this.outputs) {
      templateObject["Outputs"] = this.outputs;
    }

    if (this.parameters) {
      templateObject["Parameters"] = this.parameters;
    }

    if (this.conditions) {
      templateObject["Conditions"] = this.conditions;
    }

    return templateObject;
  }
}

module.exports = SamBuilder;