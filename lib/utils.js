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

module.exports.stringToResourceName = (input) => {
  return input.charAt(0).toUpperCase() + 
         input.replace(/-([a-zA-Z])/g, (g) => { 
           return g[1].toUpperCase();
         }).slice(1);
};

module.exports.stringifyRecursiveObject = (obj) => {
  let cache = [];
  const output = JSON.stringify(obj, function(key, value) {
      if (typeof value === 'object' && value !== null) {
          if (cache.indexOf(value) !== -1) {
              // Circular reference found, discard key
              return;
          }
          // Store value in our collection
          cache.push(value);
      }
      return value;
  }, 2);

  return output;
}

module.exports.builderify = (obj) => {
  for (const keyName of Object.keys(obj)) {
    let methodName = "with" + keyName.charAt(0).toUpperCase() + keyName.slice(1);
    obj[methodName] = (keyValue) => {
      obj[keyName] = keyValue;
      return obj;
    }
  }
}
