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

const path = require('path');
const SwaggerGenerator = require('./events/HttpEventConverter');
const events = require('./events/events.js');
const utils = require('./utils');

/**
 * This is the core of the library, reads a Function object as configured in the serverless.yml
 * file and uses the SamBuilder object to generated an AWS::Serverless::Function object.
 */
class FunctionConverter {
  constructor(serverless, samBuilder) {
    this.serverless = serverless;
    this.samBuilder = samBuilder;
  }

  serverlessFunctionToSam(resourceName, serverlessFunction) {
    let lambdaHandler = serverlessFunction.handler;
    let codeUri = this.serverless.service.package.artifact;

    if (!codeUri) {
      let handlerArray = serverlessFunction.handler.split(path.sep);
      lambdaHandler = handlerArray[handlerArray.length - 1];
      handlerArray.pop();
      codeUri = path.resolve(handlerArray.join(path.sep));
    }
    
    // begin building the function object
    let samFunctionBuilder = this.samBuilder.addFunction(resourceName);

    const runtime = this.serverless.service.provider.runtime;

    samFunctionBuilder = samFunctionBuilder.withCodeUri(codeUri).withRuntime(runtime).withHandler(lambdaHandler);

    // optional properties
    if (serverlessFunction.description) {
      samFunctionBuilder = samFunctionBuilder.withDescription(serverlessFunction.description);
    }
    if (serverlessFunction.memorySize) {
      samFunctionBuilder = samFunctionBuilder.withMemorySize(serverlessFunction.memorySize);
    }
    if (serverlessFunction.timeout) {
      samFunctionBuilder = samFunctionBuilder.withTimeout(serverlessFunction.timeout);
    }
    
    // set environment variables if there are any
    if (this.serverless.service.provider.environment && Object.keys(this.serverless.service.provider.environment).length > 0) {
      Object.keys(this.serverless.service.provider.environment).forEach((key, idx) => {
        samFunctionBuilder = samFunctionBuilder.setEnvironmentVariable(key, this.serverless.service.provider.environment[key]);
      })
    }

    // if we have a role defined then we just set it
    if (serverlessFunction.role) {
      samFunctionBuilder = samFunctionBuilder.withRole(serverlessFunction.role);
    } else {
      // if there is no role we try and take the IAM statements from the provider and attach them to the function. Serverless creates an
      // IAM execution role for all functions in the service. We take a different approach here and set the role on each function, this will
      // customers more fine-grained control over their functions' permissions
      if (this.serverless.service.provider.iamRoleStatements && this.serverless.service.provider.iamRoleStatements.length > 0) {
        for (let statementIdx in this.serverless.service.provider.iamRoleStatements) {
          samFunctionBuilder.addPolicy(this.serverless.service.provider.iamRoleStatements[statementIdx]);
        }
      }
    }

    // finally, we look at the events
    if (serverlessFunction.events && serverlessFunction.events.length > 0) {
      serverlessFunction.events.forEach((event, idx) => {
        let finalEvent = event;
        if (typeof(finalEvent) === "string") {
          finalEvent = {};
          finalEvent[event] = {};
        }
        Object.keys(finalEvent).forEach((type, idx) => {
          // if the event is nor marked as enabled we just skip it. TODO: Is this the right thing to do?
          if (!this.isEventEnabled(finalEvent[type])) {
            return;
          }
          const eventConverter = events.getEventConverter(type, this.serverless);
          const convertedEvent = eventConverter.convertEvent(finalEvent[type], resourceName);
                  
          // add the event ot the function
          samFunctionBuilder = samFunctionBuilder.addEvent(eventConverter.getEventType(), convertedEvent.event);

          // if the event converter needed to generate new resources for the template, loop over them and add them as custom resources
          if (convertedEvent.resources && Object.keys(convertedEvent.resources).length > 0) {
            Object.keys(convertedEvent.resources).forEach((resourceName, idx) => {
              this.samBuilder.addCustomResource(resourceName, convertedEvent.resources[resourceName], (eventConverter.constructor.name.startsWith("Http")));
            });
          }
        });
      });
    }
  }

  isEventEnabled(event) {
    return event.enabled === undefined || event.enabled;
  }
}

module.exports = FunctionConverter;