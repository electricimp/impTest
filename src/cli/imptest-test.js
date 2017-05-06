// MIT License
//
// Copyright 2016 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

/**
 * Test command
 */

'use strict';

const commander = require('commander');
const path = require('path');
const fs = require('fs');
const packageJson = require('../../package.json');
const parseBool = require('../lib/utils/parseBool');
const TestCommand = require('../lib/Commands/TestCommand');

commander
  .usage('[options] <test case file>')
  .option('-d, --debug', 'debug output')
  .option('-gu, --github-user <user>', 'username for GitHub')
  .option('-gt, --github-token <token>', 'personal access token or password for GitHub')
  .option('-c, --config [path]', 'config file path [default: .imptest]', '.imptest')
  .parse(process.argv);

// bootstrap command

const command = new TestCommand();

command.version = packageJson.version;
command.debug = parseBool(commander.debug);
command.testFrameworkFile = __dirname + '/../impUnit/index.nut';
command.testCaseFile = commander.args[0] || null;
command.configPath = commander.config;


// Names for github credentials env vars
const GITHUB_USER = 'GITHUB_USER';
const GITHUB_TOKEN = 'GITHUB_TOKEN';

// github credentials in CLI
command.githubUser = commander.githubUser;
command.githubToken = commander.githubToken;
if (!command.githubUser || !command.githubToken) {
  // github credentials in .imptest-auth file in current folder
  let githubCredentialsPath = path.resolve('.imptest-auth');
  commander.config = path.resolve(commander.config);
  if (fs.existsSync(commander.config)) {
    // github credentials in .imptest-auth file in 'config file' folder
    githubCredentialsPath = path.resolve(path.dirname(commander.config),'.imptest-auth');
  }
  if (fs.existsSync(githubCredentialsPath)) {
    // read github credentials
    let githubCredentials = fs.readFileSync(githubCredentialsPath).toString();
    githubCredentials = JSON.parse(githubCredentials);
    command.githubUser = githubCredentials['github-user'];
    command.githubToken = githubCredentials['github-token'];
  } else {
    // github credentials in env vars
    command.githubUser = process.env[GITHUB_USER];
    command.githubToken = process.env[GITHUB_TOKEN];
  }
}

// go
command.run()
  .then(() => {
    process.exit(0);
  }, () => {
    process.exit(1);
  });
