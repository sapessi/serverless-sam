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

class AlexaSkillEventConverter {
  constructor(serverless) {
    this.serverless = serverless;
  }

  getEventType() {
    return "AlexaSkill";
  }

  convertEvent(event, targetResourceName) {
    // we do nothing for Alexa skills other than setting the resource policies
    return {
      event: {},
      resources: {}
    }
  }
}

module.exports = AlexaSkillEventConverter;