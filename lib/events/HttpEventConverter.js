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

const Utils = require('../utils');

const DEFAULT_STAGE_NAME = "prod";

class HttpEventConverter {
  constructor(serverless) {
    this.serverless = serverless;
    this.apiDefinition = {
      swagger: "2.0",
      info: {
        title: {
          Ref: "AWS::StackName"
        }
      },
      paths: {}
    };
    this.apiResourceName = "";
    this.customResources = {};
  }

  getEventType() {
    return "Api";
  }

  convertEvent(event, targetResourceName) {
    let http = {
      path: "",
      method: ""
    };

    if (typeof(event) === "string") {
      const params = event.trim().split(" ");
      if (params.length != 2) {
        throw new Error("Invalid http event setup: " + event);
      }

      http.method = params[0];
      http.path = params[1];  
    } else {
      http = event;
    }

    if (http.path.charAt(0) != "/") {
      http.path = "/" + http.path;
    }

    this.addHttpMethod(http, targetResourceName);

    this.apiResourceName = Utils.stringToResourceName(this.serverless.service.service);

    this.customResources[this.apiResourceName] = {
      Type: "AWS::Serverless::Api",
      Properties: {
        StageName: this.serverless.service.provider.stage || DEFAULT_STAGE_NAME,
        DefinitionBody: this.apiDefinition
      }
    };

    let returnEvent = {
      event: {
          Path: http.path,
          Method: http.method,
          RestApiId: {
            Ref: this.apiResourceName
          }
        },
      resources: this.customResources
    };

    return returnEvent;
  }

  addHttpMethod(httpConfig, targetResourceName) {

    let httpMethod = httpConfig.method.toLowerCase();

    if (!this.apiDefinition.paths[httpConfig.path]) {
      this.apiDefinition.paths[httpConfig.path] = {};
    }

    if (this.apiDefinition.paths[httpConfig.path][httpMethod] && Object.keys(this.apiDefinition.paths[httpConfig.path][httpMethod]).length > 0) {
      throw new Error("Error while generating Swagger definition: " +
        "Method " + httpMethod + " already exists on " + httpConfig.path + " resource");
    }

    let methodConfig = {
      "x-amazon-apigateway-integration": {
        httpMethod: "POST",
        type: "aws_proxy",
        uri: {
          "Fn::Sub": "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${" + targetResourceName + ".Arn}/invocations"
        }
      },
      responses: {}
    }

    if (httpConfig.cors) {
      let optionsMethod = this.getDefaultOptionsConfig();
      let headers = optionsMethod["x-amazon-apigateway-integration"].responses.default.responseParameters["method.response.header.Access-Control-Allow-Headers"];
      let methods = Object.keys(this.apiDefinition.paths[httpConfig.path]).concat([httpMethod]).join(",");
      let origins = optionsMethod["x-amazon-apigateway-integration"].responses.default.responseParameters["method.response.header.Access-Control-Allow-Origin"];
      if (typeof(httpConfig.cors) === "object") {
        if (httpConfig.cors.origins) {
          origins = httpConfig.cors.origins;
        }
        if (httpConfig.cors.headers && Array.isArray(httpConfig.cors.headers)) {
           headers += headers.split(",").concat(httpConfig.cors.headers).join(",");
        }
      }
      optionsMethod["x-amazon-apigateway-integration"].responses.default.responseParameters["method.response.header.Access-Control-Allow-Origin"] = "'" + origins + "'";
      optionsMethod["x-amazon-apigateway-integration"].responses.default.responseParameters["method.response.header.Access-Control-Allow-Headers"] = "'" + headers + "'";
      optionsMethod["x-amazon-apigateway-integration"].responses.default.responseParameters["method.response.header.Access-Control-Allow-Methods"] = "'" + methods + "'";
      methodConfig["x-amazon-apigateway-integration"]["responses"] = JSON.parse(JSON.stringify(optionsMethod["x-amazon-apigateway-integration"].responses));
      methodConfig.responses = this.getCorsResponses()

      this.apiDefinition.paths[httpConfig.path]["options"] = optionsMethod;
    }

    if (httpConfig.authorizer && typeof(httpConfig.authorizer) === "string") {
      const authorizerName = this.createAuthorizer(httpConfig.authorizer);
      let authConfig = {};
      authConfig[authorizerName] = [];
      methodConfig["security"] = [ authConfig ];
    }

    this.apiDefinition.paths[httpConfig.path][httpMethod] = methodConfig;
  }

  getApiResourceName() {
    return Utils.stringToResourceName(this.serverless.service.service);
  }

  hasMethods() {
    if (!this.apiDefinition || !this.apiDefinition.paths) {
      return false;
    }

    return Object.keys(this.apiDefinition.paths).length > 0
  }

  createAuthorizer(name) {
    if (!this.apiDefinition.securityDefinitions) {
      this.apiDefinition["securityDefinitions"] = {};
    }
    const authorizerName = Utils.stringToResourceName(name);

    this.apiDefinition.securityDefinitions[authorizerName] = {
      type: "apiKey",                         
      name : authorizerName,                  
      in : "header",                           
      "x-amazon-apigateway-authtype": "oauth2", 
      "x-amazon-apigateway-authorizer": {       
        type: "token",
        authorizerUri: {
          "Fn::Sub": "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${" + authorizerName + ".Arn}/invocations"
        },
        identityValidationExpression: "^x-[a-z]+",
        authorizerResultTtlInSeconds: 60
      }
    }

    // set resource policies for the authorizer
    this.customResources[authorizerName + "ResourcePolicy"] = {
      Type: "AWS::Lambda::Permission",
      Properties: {
        Action: "lambda:InvokeFunction",
        FunctionName: { "Fn::GetAtt" : [authorizerName, "Arn"] },
        Principal: "apigateway.amazonaws.com",
        SourceAccount: { "Ref" : "AWS::AccountId" }
      }
    };

    return authorizerName;
  }

  getDefaultOptionsConfig() {
    return {
        "x-amazon-apigateway-integration": {
          type: "mock",
          requestTemplates: {
            "application/json": "{ \"statusCode\" : 200 }"
          },
          responses: {
            default: {
              statusCode: 200,
              responseParameters: {
                "method.response.header.Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
                "method.response.header.Access-Control-Allow-Methods": "*",
                "method.response.header.Access-Control-Allow-Origin": "*"
              },
              responseTemplates: {
                "application/json": "{}"
              }
            }
          }
        },
        responses: this.getCorsResponses()
      };
  }

  getCorsResponses() {
    return {
      "200": {
        headers: {
          "Access-Control-Allow-Headers": {
            type: "string"
          },
          "Access-Control-Allow-Methods": {
            type: "string"
          },
          "Access-Control-Allow-Origin": {
            type: "string"
          }
        }
      }
    };
  }
}

module.exports = HttpEventConverter;