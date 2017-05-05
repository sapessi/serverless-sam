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
      expect(samTemplate.Resources.LuckyNumber).to.not.be.null;
    });

    it("Function runtime is node", () => {
      expect(samTemplate.Resources.LuckyNumber.Properties.Runtime).to.be.equals("nodejs4.3");
    });

    it("Code uri is a zip", () => {
      expect(samTemplate.Resources.LuckyNumber.Properties.CodeUri.endsWith("aws-node-alexa-skill.zip")).to.be.true;
    });

    it("Function has one event", () => {
      expect(Object.keys(samTemplate.Resources.LuckyNumber.Properties.Events).length).to.be.equals(1);
    });

    it("Event type is AlexaSkill", () => {
      expect(samTemplate.Resources.LuckyNumber.Properties.Events.Event1.Type).to.be.equals("AlexaSkill");
      
    });
});