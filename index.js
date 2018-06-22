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
'use strict';

const path = require('path');
const fs = require('fs');
const BbPromise = require('bluebird');

const SamGenerator = require('./lib/SamGenerator');
const utils = require('./lib/utils')

const SERVERLESS_FILE_NAME = 'serverless.yml';
const ERROR_MISSING_SERVERLESS_FILE = "Could not find " + SERVERLESS_FILE_NAME;
const ERROR_MISSING_OUTPUT_OPTION = "Missing output option";
const ERROR_MISSING_OUTPUT_DIR = "Output directory for SAM template does not exist";

/**
 * Main SAM plugin object. Defines the sam and export commands. The lifecycle events exposed by this plugin are
 * validate and export.
 */
class SamPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.writeFile = BbPromise.promisify(fs.writeFile);
    this.samGenerator = new SamGenerator(this.serverless);

    this.errorStrings = {
      MissingServerlessFile: ERROR_MISSING_SERVERLESS_FILE,
      MissingOutputOption: ERROR_MISSING_OUTPUT_OPTION,
      MissingOutputDir: ERROR_MISSING_OUTPUT_DIR
    };
    
    this.commands = {
      sam: {
        commands: {
          export: {
            usage: 'Creates a Serverless Application Model (SAM) template from your serverless app definition',
            lifecycleEvents: [
              'validate',
              'export',
            ],
            options: {
              output: {
                usage:
                  'Specify the output file name '
                  + '(e.g. "--output ./sam-template.yml" or "-o ./sam-template.yml")',
                required: true,
                shortcut: 'o',
              },
            },
          }
        }
      }
    };

    this.hooks = {
      'sam:export:validate': () => BbPromise.bind(this)
        .then(this.validateOptions)
        .then(this.validateDefinition),
      'before:sam:export:export': () => BbPromise.bind(this)
        .then(this.prepareTemplate)
        .then(this.packageFunctions),
      'sam:export:export': () => BbPromise.bind(this)
        .then(this.exportSam)
        .then(this.writeSamTemplate)
    };
  }

  /**
   * Checks that the serverless.yml file exists in the local folder that the --output option
   * points to an existing folder.
   */
  validateOptions() {
    return new BbPromise((resolve, reject) => {
      this.serverless.cli.log("Working folder: " + __dirname);
      const yamlFileName = path.join(process.cwd(), SERVERLESS_FILE_NAME);
      if (!fs.existsSync(yamlFileName)) {
        reject(new Error(ERROR_MISSING_SERVERLESS_FILE));
      }

      if (!this.serverless.providers.aws.options || !this.serverless.providers.aws.options.output) {
        reject(new Error(ERROR_MISSING_OUTPUT_OPTION));
      }

      if (!fs.existsSync(path.dirname(this.serverless.providers.aws.options.output))) {
        reject(new Error(ERROR_MISSING_OUTPUT_DIR));
      }
      resolve();
    });
  }

  /**
   * Uses the Serverless frameowkr to validate the current definiton
   */
  validateDefinition() {
    return new BbPromise((resolve, reject) => {
      try {
        this.serverless.cli.log("Validate");
        this.serverless.service.load();
        this.serverless.service.validate();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Loads the Package plugin and uses it to create the deployment package for all 
   * Lambda functions in the service.
   */
  packageFunctions() {
    const plugin = this.getPlugin("Package");
    if (!plugin) {
      throw new Error("Could not find Package plugin");
    }

    this.serverless.cli.log("Packaging functions");

    return new BbPromise.bind(plugin)
          .then(plugin.cleanup)
          .then(plugin.validate)
          .then(plugin.packageService);
  }

  /**
   * Uses the AwsDeploy plugin to create the compiledCloudFormationTemplate in the
   * serverless framework object. 
   */
  prepareTemplate() {
    // latest version of serverless
    const plugin = this.getPlugin("AwsPackage");
    if (!plugin) {
      throw new Error("Could not find AwsDeploy plugin");
    }

    this.serverless.cli.log("Preparing original CloudFormation template");
    
    this.serverless.variables.populateService(this.serverless.pluginManager.cliOptions);

    // remove deployment bucket settings before we start working on the template. We do not need to trigger
    // a deployment or any calls to S3
    if (this.serverless.service.provider.deploymentBucket) {
      delete this.serverless.service.provider.deploymentBucket;
    }
    
    return new BbPromise.bind(plugin)
      .then(plugin.generateCoreTemplate)
      .then(plugin.mergeIamTemplates)
      .then(plugin.generateArtifactDirectoryName)
      .then(plugin.mergeCustomProviderResources)
      .then(plugin.saveServiceState)
      .then(plugin.saveCompiledTemplate);
    /*const plugin = this.getPlugin("AwsDeploy");
    if (!plugin) {
      throw new Error("Could not find AwsDeploy plugin");
    }

    this.serverless.cli.log("Preparing original CloudFormation template");
    
    this.serverless.variables.populateService(this.serverless.pluginManager.cliOptions);

    return new BbPromise.bind(plugin)
      .then(plugin.validate)
      .then(plugin.configureStack)
      .then(plugin.mergeIamTemplates)
      .then(plugin.generateArtifactDirectoryName)
      .then(plugin.mergeCustomProviderResources);*/
  }

  /**
   * Loads a plugin of the Serverless framework given the plugin name. For example, AwsDeploy
   * @param {String} name Plugin name
   */
  getPlugin(name) {
    for (let plugin of this.serverless.pluginManager.getPlugins()) {
      if (plugin.constructor.name === name) {
        return plugin;
      }
    }

    return null;
  }

  /**
   * Saves the generated SAM template in the local samTemplate variable
   */
  exportSam() {
    return new BbPromise((resolve, reject) => {
      this.serverless.cli.log('Export:');
      try {
        this.samTemplate = this.samGenerator.generate();
        resolve(this.samTemplate);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Writes the SAM template string to the local files specified by the --output option
   */
  writeSamTemplate() {
    const writeFilePromise = this.writeFile(this.serverless.providers.aws.options.output, this.samTemplate);
    this.serverless.cli.log("SAM template written to: " + path.resolve(this.serverless.providers.aws.options.output));
    return writeFilePromise;

  }
}

module.exports = SamPlugin;