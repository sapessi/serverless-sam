'use strict'

const chai = require("chai");
const expect = chai.expect;
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

console.log(__dirname + path.sep + ".." + path.sep + "sam.yml");
const serverlessTemplate = yaml.safeLoad(fs.readFileSync(__dirname + path.sep + ".." + path.sep + "serverless.yml"));
const samTemplate = yaml.safeLoad(fs.readFileSync(__dirname + path.sep + ".." + path.sep + "sam.yml"));
                

  describe("Tests for " + __filename, () => {
    it("Created the Lambda function resource", () => {
      expect(samTemplate.Resources.CurrentTime).to.not.be.null;
    });

    it("Function runtime is Java8", () => {
      expect(samTemplate.Resources.CurrentTime.Properties.Runtime).to.be.equals("java8");
    });

    it("Function has one event", () => {
      expect(Object.keys(samTemplate.Resources.CurrentTime.Properties.Events).length).to.be.equals(1);
    })

    it("Event type is Api", () => {
      expect(samTemplate.Resources.CurrentTime.Properties.Events.Event1.Type).to.be.equals("Api");
    });

    it("Event to reference Api resource", () => {
      expect(samTemplate.Resources.CurrentTime.Properties.Events.Event1.Properties.RestApiId).to.be.not.null;
      expect(Object.keys(samTemplate.Resources.CurrentTime.Properties.Events.Event1.Properties.RestApiId)[0]).to.be.equal("Ref");
      expect(samTemplate.Resources.CurrentTime.Properties.Events.Event1.Properties.RestApiId.Ref).to.be.equal("AwsJavaSimpleHttpEndpoint");
    });

    it("Created the API resource", () => {
      expect(samTemplate.Resources.AwsJavaSimpleHttpEndpoint).to.not.be.null;
    });

    it("API has a ping path", () => {
      expect(samTemplate.Resources.AwsJavaSimpleHttpEndpoint.Properties.DefinitionBody).to.be.not.null;
      expect(Object.keys(samTemplate.Resources.AwsJavaSimpleHttpEndpoint.Properties.DefinitionBody.paths).length).to.be.equal(1);
      
    });
  });  