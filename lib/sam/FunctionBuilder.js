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

class SamFunctionBuilder {
  constructor() {
    this.Handler = null;
    this.Runtime = null;
    this.CodeUri = null;
    this.FunctionName = null;
    this.Description = null;
    this.MemorySize = 128;
    this.Timeout = 3;
    this.Role = null;
    this.Policies = null;
    this.Environment = null;
    this.VpcConfig = null;
    this.Events = null;

    Utils.builderify(this);
  }

  getSamType() {
    return "AWS::Serverless::Function";
  }

  setEnvironmentVariable(name, value) {
    if (this.Environment == null) {
      this.Environment = {
        Variables: {}
      };
    }

    this.Environment.Variables[name] = value;

    return this;
  }

  addPolicy(policyDocument) {
    if (this.Policies && typeof(this.Policies) === "string") {
      throw new Error("Policies property is already set to string, cannot add new policy document");
    }
    if (this.Policies == null) {
      this.Policies = [{ Version: '2012-10-17', Statement: []}];
    }
    this.Policies[0].Statement.push(policyDocument);

    return this;
  }

  addEvent(type, obj) {
    if (this.Events === null) {
      this.Events = {};
    }

    const eventsCount = Object.keys(this.Events).length;
    this.Events["Event" + (eventsCount + 1)] = {
      Type: type,
      Properties: obj
    };

    return this;
  }
}

module.exports = SamFunctionBuilder;