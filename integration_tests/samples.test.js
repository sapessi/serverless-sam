'use strict'

const BbPromise = require('bluebird');
const yaml = require('js-yaml');
const chai = require("chai");
const expect = chai.expect;
const Mocha = require('mocha');

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra')

const exec = BbPromise.promisify(require('child_process').exec);
const createFolder = BbPromise.promisify(require('fs').mkdir);
const readFile = BbPromise.promisify(require('fs').readFile);
const writeFile = BbPromise.promisify(require('fs').writeFile);
const rimraf = BbPromise.promisify(require('rimraf'));
const wget = BbPromise.promisify(require('download'));

// const REPO_FOLDER = path.resolve(__dirname + path.sep + "tmp");
const REPO_FOLDER = path.resolve(path.sep + "tmp" + path.sep + "test_repos");

let TEST_REPOS = []

for (let test of require('fs').readdirSync(__dirname + path.sep + "tests" + path.sep)) {
  TEST_REPOS.push(test.replace('.js', ''));
}

describe("Running integration tests: ", () => {
  it("starts all tests", (finalDone) => {
    exec("npm install -g serverless")
    .then(rimraf(REPO_FOLDER))
    //.then(createFolder(REPO_FOLDER))
    .then(wget("https://github.com/serverless/examples/archive/master.zip", REPO_FOLDER, { extract: true, strip: 1 }))
    .then(() => { return TEST_REPOS; })
    .each((repo) => {
        return new BbPromise((testResolve, testReject) => {
          const repoFolder = REPO_FOLDER + path.sep + repo;
          const pluginFolder = __dirname + path.sep + ".." + path.sep;
          const serverlessFile = repoFolder + path.sep + "serverless.yml";
          const samFile = repoFolder + path.sep + "sam-template.yml";
            //exec("npm --prefix " + repoFolder + " install " + repoFolder)
            //.then(exec("npm --prefix " + repoFolder + " install " + pluginFolder))
          return exec("npm --prefix " + repoFolder + " install " + repoFolder)
            .then(() => { return exec("npm --prefix " + repoFolder + " install " + pluginFolder) })
            .then(()  => {
              return readFile(serverlessFile)
            })
            .then((data) => {
              console.log("Loaded file " + serverlessFile);
              let fileContent = yaml.safeLoad(data);
              
              if (fileContent.plugins) {
                fileContent.plugins.push("serverless-sam");
              } else {
                fileContent["plugins"] = [ "serverless-sam" ];
              }

              return yaml.safeDump(fileContent);
            })
            .then((newData) => {
              console.log("Writefile");
              return writeFile(serverlessFile, newData);
            })
            .then(() => {
              console.log("export");
              return exec("serverless sam export --output " + samFile, {cwd: repoFolder})
            })
            .then(() => {
              return new BbPromise((resolve, reject) => {
                console.log("start tests");
                //const tests = require('./tests/' + repo);
                
                //fs.createReadStream(samFile).pipe(fs.createWriteStream(__dirname + path.sep + "sam.yml"));
                //fs.createReadStream(serverlessFile).pipe(fs.createWriteStream(__dirname + path.sep + "serverless.yml"));
                fse.copySync(samFile, __dirname + path.sep + "sam.yml");
                fse.copySync(serverlessFile, __dirname + path.sep + "serverless.yml");
                //BbPromise.promisify(tests);
                //tests(serverlessTemplate, samTemplate, resolve);
                const testFilePath = path.resolve(__dirname + path.sep + "tests" + path.sep + repo + ".js");
                const mocha = new Mocha();
                mocha.addFile(testFilePath);
                mocha.run((err) => {
                  if (err) {
                    throw new Error("Fail test");
                    reject(err);
                    testReject(err);
                  } else {
                    resolve();
                    testResolve();
                  }
                })
              });
            }).catch((err) => {
              console.log(err);
              expect.fail(err);
            });
          });
        })
        .then(() => { finalDone(); });
      });
    
});