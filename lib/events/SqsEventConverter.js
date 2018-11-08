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

const utils = require('../utils');
const randomstring = require('randomstring');

class SqsEventConverter {
  constructor(serverless) {
    this.serverless = serverless;
  }

  getEventType() {
    return "SQS";
  }

  convertEvent(event, targetResourceName) {
    let eventData = {
        Queue: ""
    };
    let resources = {};

    if (typeof(event) === "string") {
      // pre-existing SQS queue
      if (event.startsWith("anr:aws")) {
        eventData.Queue = event;
      } else { // we want to create a new queue
        const resourceName = utils.stringToResourceName(this.serverless.service.service) + "SqsQueue" + randomstring.generate(5);
        resources[resourceName] = this.createQueueResource(resourceName, event);
      }
    } else { // it's an object
      if (event.arn) {
        eventData.Queue = event.arn;
      } else {
        if (event.queueName) {
          const resourceName = utils.stringToResourceName(this.serverless.service.service) + "SqsQueue" + randomstring.generate(5);
          resources[resourceName] = this.createQueueResource(resourceName, event);
          if (event.displayName) {
            resources[resourceName].Properties["DisplayName"] = event.displayName;
          }
        }
      }
    }

    return {
      event: eventData,
      resources: resources
    };
  }

  createQueueResource(resourceName, queueName) {
    return {
      Type: "AWS::SQS::Queue",
      Properties: {
        Queue: queueName
      }
    };
  }
}

module.exports = SqsEventConverter;
