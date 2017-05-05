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

class SnsEventConverter {
  constructor(serverless) {
    this.serverless = serverless;
  }

  getEventType() {
    return "SNS";
  }

  convertEvent(event, targetResourceName) {
    let eventData = {
        Topic: ""
    };
    let resources = {};

    if (typeof(event) === "string") {
      // pre-existing SNS topic
      if (event.startsWith("anr:aws")) {
        eventData.Topic = event;
      } else { // we want to create a new topic
        const resourceName = utils.stringToResourceName(this.serverless.service.service) + "SnsTopic" + randomstring.generate(5);
        resources[resourceName] = this.createTopicResource(resourceName, event);
      }
    } else { // it's an object
      if (event.arn) {
        eventData.Topic = event.arn;
      } else {
        if (event.topicName) {
          const resourceName = utils.stringToResourceName(this.serverless.service.service) + "SnsTopic" + randomstring.generate(5);
          resources[resourceName] = this.createTopicResource(resourceName, event);
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

  createTopicResource(resourceName, topicName) {
    return {
      Type: "AWS::SNS::Topic",
      Properties: {
        TopicName: topicName
      }
    };
  }
}

module.exports = SnsEventConverter;