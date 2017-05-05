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

const fs = require('fs');

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

const Serverless = require("serverless");
const ServerlessSam = require('./index');

const baseServerlessConfig = {
  serverless: {
    providers: {
      aws: {
        options: {}
      }
    },
    service: {}
  }
};

describe("Serverless plugin", () => {
  const framework = new Serverless(baseServerlessConfig);
  framework.init();
  framework.pluginManager.addPlugin(ServerlessSam);
  const plugin = framework.pluginManager.getPlugins()[0];

  describe("Option validation", () => {
    it('Fails without output option', () => {
      plugin.validateOptions()
        .then(() => {
          chai.assert.fail("Did not throw error");
        }).catch((e) => {
          expect(e.message).to.be.equal(plugin.errorStrings.MissingOutputOption);
        });
    });

    it('Fails without serverless.yml file', () => {
      framework.providers.aws.options["output"] = "./sam-output.yml";
      
      plugin.validateOptions()
        .then(() => {
          chai.assert.fail("Did not throw error");
        }).catch((e) => {
          expect(e.message).to.be.equal(plugin.errorStrings.MissingServerlessFile);
        });
    });

    it('Succeeds validation with option and serverless file', () => {
      const fileName = './serverless.yml';
      fs.writeFileSync(fileName, 'dummy file');
      
      const validate = () => { plugin.validateOptions(); };
      expect(validate).not.to.throw(Error);

      fs.unlinkSync(fileName);
    })

    
  });

  describe("Plugin existence", () => {
    it("Package does not thorw exceptions", () => {
      const validate = () => { return plugin.getPlugin("Package"); }
      expect(validate).to.not.throw(Error);
      const packagePlugin = validate();
      expect(packagePlugin).to.be.not.null;
      expect(packagePlugin.constructor.name).to.be.equals("Package");

      expect(packagePlugin).to.respondTo("packageService");
    });
    /*
    it("AwsDeploy does not throw exceptions", () => {
      const validate = () => { return plugin.getPlugin("AwsDeploy"); }
      expect(validate).to.not.throw(Error);

      const deployPlugin = validate();
      expect(deployPlugin).to.be.not.null;
      expect(deployPlugin.constructor.name).to.be.equals("AwsDeploy");
      expect(deployPlugin).to.respondTo("configureStack");
      expect(deployPlugin).to.respondTo("mergeIamTemplates");
      expect(deployPlugin).to.respondTo("generateArtifactDirectoryName");
      expect(deployPlugin).to.respondTo("mergeCustomProviderResources");
    });
    */
  });
});