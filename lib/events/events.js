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

const HttpEventConverter = require('./HttpEventConverter');
const StreamEventConverter = require('./StreamEventConverter');
const SnsEventConverter = require('./SnsEventConverter');
const ScheduleEventConverter = require('./ScheduleEventConverter');
const S3EventConverter = require('./S3EventConverter');
const AlexaSkillEventConverter = require('./AlexaSkillEventConverter');
const IoTEventConverter = require('./IoTEventConverter');
const SqsEventConverter = require('./SqsEventConverter');

let convertersCache = {};

/**
 * This function loads the correct event converter based on the given event type. Event converters are used to take 
 * an event from the serverless.yml file and convert it into an event in the SAM template. In some cases, the Serverless
 * framework generates entirely new resources based on an event definition. For example, when the S3 event is specified
 * with only a bucket name, the Serverless framework creates an entirely new bucket.
 * 
 * Event converters must implement the same methods:
 *  * getEventType() -> returns the event type for the SAM template, such as "Api" or "S3"
 *  * convertEvent(event, targetResourceName) -> Creates the output SAM event give a Serverless event object and a potential 
 *       target resource. For example, for HTTP events, the target resource is the Lambda function behind the API method.
 * 
 * The convertEvent() method should return an object that contains two properties: event, and resources. Event is an object
 * that contains the event definition for the SAM template. Resources is also an object that contains the custom resources
 * that should be added to the template.
 */
module.exports.getEventConverter = (type, serverless) => {
  if (convertersCache[type]) {
    return convertersCache[type];
  }

  let converter = null;
  switch (type.toLowerCase()) {
    case "http":
      converter = new HttpEventConverter(serverless);
      break;
    case "stream":
      converter = new StreamEventConverter(serverless);
      break;
    case "sns":
      converter = new SnsEventConverter(serverless);
      break;
    case "schedule":
      converter = new ScheduleEventConverter(serverless);
      break;
    case "s3":
      converter = new S3EventConverter(serverless);
      break;
    case "alexaskill":
      converter = new AlexaSkillEventConverter(serverless);
      break;
    case "iot":
      converter = new IoTEventConverter(serverless);
      break;
    case "sqs":
      converter = new SqsEventConverter(serverless);
      break;
    default:
      throw new Error("Could not find converter for event type: " + type);
  }

  convertersCache[type] = converter;
  return convertersCache[type];
}
