'use strict'

const chai = require("chai");
const expect = chai.expect;
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const serverlessTemplate = yaml.safeLoad(fs.readFileSync(__dirname + path.sep + ".." + path.sep + "serverless.yml"));
const samTemplate = yaml.safeLoad(fs.readFileSync(__dirname + path.sep + ".." + path.sep + "sam.yml"));
                

describe("Tests for " + __filename, () => {
    it("Created the Lambda function resource", () => {
      expect(samTemplate.Resources.CreateUser).to.not.be.null;
    });

    it("Function runtime is node", () => {
      expect(samTemplate.Resources.CreateUser.Properties.Runtime).to.be.equals("nodejs4.3");
    });

    it("Code uri is a zip", () => {
      expect(samTemplate.Resources.CreateUser.Properties.CodeUri.endsWith("function-with-environment-variables.zip")).to.be.true;
    });

    it("Environment variables are set", () => {
      expect(Object.keys(samTemplate.Resources.CreateUser.Properties.Environment.Variables).length).to.be.equals(3);
    });

    it("Password iterations value is set correctly", () => {
      expect(samTemplate.Resources.CreateUser.Properties.Environment.Variables.PASSWORD_ITERATIONS).to.be.equals(4096);
      
    });
});