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
const fs = require('fs');

const yaml = require('js-yaml');

const FunctionConverter = require('./FunctionConverter');
const SamBuilder = require('./sam/SamBuilder');
const Utils = require('./utils');

/**
 * Main SAM generator object. Given a Serverless framework object it creates the SAM template for the application.
 */
class SamGenerator {
  /**
   * Initializes the main genertor and embedded SamBuilder object.
   * @param {Serverless} serverless An initialized instance of the Serverless framework
   */
  constructor(serverless) {
    this.serverless = serverless;
    this.samBuilder = new SamBuilder();
    this.functionConverter = new FunctionConverter(serverless, this.samBuilder);
  }

  /**
   * Main entry point for the object that returns the generated SAM template as a string.
   */
  generate() {
    // 1. read custom resources
    this.readResources(this.serverless.service);

    // 2. read template outputs if any
    this.readOutputs(this.serverless.service);

    // 3. read parameters if any
    this.readParameters(this.serverless.service);

    // 4. read conditions if any
    this.readConditions(this.serverless.service);

    // 5. read functions
    this.readFunctions(this.serverless.service);

    // 6. create yaml
    return this.dumpYamlTemplate();
  }

  dumpYamlTemplate() {
    return yaml.safeDump(this.samBuilder.getTemplateObject());
  }

  readResources(service) {
    this.serverless.cli.log("Exporting resources");
    if (service.resources && service.resources.Resources) {
      Object.keys(service.resources.Resources).forEach((value, idx) => {
        const resource = service.provider.compiledCloudFormationTemplate.Resources[value]
        this.serverless.cli.log("Exporting resource: " + value);
        this.samBuilder.addCustomResource(value, resource);
      });
    }
  }

  readOutputs(service) {
    this.serverless.cli.log("Exporting outputs");
    if (service.resources && service.resources.Outputs) {
      Object.keys(service.resources.Outputs).forEach((id, idx) => {
        this.samBuilder.addOutput(id, service.resources.Outputs[id]);
      });
    }
  }

  readConditions(service){
    this.serverless.cli.log("Exporting conditions");
    if (service.resources && service.resources.Conditions) {
      Object.keys(service.resources.Conditions).forEach((id,idx) => {
        this.samBuilder.addCondition(id, service.resources.Conditions[id]);
      });
    }
  }

  readParameters(service){
    this.serverless.cli.log("Exporting parameters");
    if (service.resources && service.resources.Parameters) {
      Object.keys(service.resources.Parameters).forEach((id,idx) => {
        this.samBuilder.addParameter(id, service.resources.Parameters[id]);
      });
    }
  }
  readFunctions(service) {
    this.serverless.cli.log("Exporting functions");
    let allFunctions = service.getAllFunctions();
    if (allFunctions && allFunctions.length > 0) {
      allFunctions.forEach((name, idx) => {
        const sFunction = service.getFunction(name)
        const functionName = (sFunction.name ? sFunction.name : name);

        // converting function name to camel case to use it as a cloudformation resource name
        // just in case it contains -
        const functionResourceName = Utils.stringToResourceName(functionName);
        this.serverless.cli.log('Exporting function: ' + functionName + ' as ' + functionResourceName);

        // uses the SamBuilder object behind the scenes to add functions and new custom resources
        this.functionConverter.serverlessFunctionToSam(functionResourceName, sFunction);
      });
    }
  }
}

module.exports = SamGenerator;