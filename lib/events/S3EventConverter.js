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
'use strct'

const utils = require('../utils');
const randomstring = require('randomstring');

class S3EventConverter {
  constructor(serverless) {
    this.serverless = serverless;
  }

  getEventType() {
    return "S3";
  }

  convertEvent(event, targetResourceName) {
    let s3Event = {
        Bucket: "",
        Events: "*"
    };
    let resources = {};

    if (typeof(event) === "string") {
      // adding a random string to the bucket name to make sure it is unique
      const bucketResourceName = utils.stringToResourceName(this.serverless.service.service) + "Bucket" + randomstring.generate(5);
      resources[bucketResourceName] = this.getBucketResource(bucketResourceName, event);
      s3Event.Bucket = {
        Ref: bucketResourceName
      };
    }

    if (typeof(event) !== "string" && !event["bucket"]) {
      throw new Error("Could not find valid S3 bucket name for event");
    }

    if (event.bucket) {
      s3Event.Bucket = event.bucket;
    }

    if (event["event"]) {
      s3Event.Events = event.event;
    }

    if (event["rules"]) {
      s3Event["Filter"] = event.rules;
    }

    return {
      event: s3Event,
      resources: resources
    };
  }

  getBucketResource(resourceName, bucketName) {
    return {
      Type: "AWS::S3::Bucket",
      Properties: {
        BucketName: bucketName
      }
    };
  }
}

module.exports = S3EventConverter;