// MIT License
//
// Copyright 2017 Electric Imp
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
 * Github command
 */

'use strict';

const fs = require('fs');
const c = require('colors');
const path = require('path');
const prompt = require('cli-prompt');
const AbstractCommand = require('./AbstractCommand');

class GithubCommand extends AbstractCommand {

  _init() {
    super._init();
    this._values = {};
  }

  _run() {
    return super._run()
      .then(() => {
        if (!this.force && this._impTestFile.exists) {
          throw new Error('Github credentials config file already exists, use -f option to overwrite');
        }
      })
      .then(() => this._promtpGithubCredentials())
      .then(() => this._writeGithubCredentials());
  }

  /**
   * Prompt github credentials
   * @return {Promise}
   * @private
   */
  _promtpGithubCredentials() {
    return new Promise((resolve, reject) => {
      prompt.multi([
          {
            key: 'githubUser',
            label: c.yellow('> username for GitHub'),
            type: 'string',
            'default': () => this._impTestFile.values['github-user'] ? this._impTestFile.values['github-user'] : ''
          },
          {
            key: 'githubToken',
            label: c.yellow('> Personal access token or password for GitHub'),
            type: 'string',
            'default': () => this._impTestFile.values['github-token'] ? this._impTestFile.values['github-token'] : ''
          },
        ],
        (input) => {
          this.githubUser = input.githubUser
            ? input.githubUser
            : null;
          this.githubToken = input.githubToken
            ? input.githubToken
            : null;
          resolve();
        });
    });
  }

  /**
   * Write github credentials
   * @return {Promise}
   * @private
   */
  _writeGithubCredentials() {
    return new Promise((resolve, reject) => {
      // github credentials in .imptest-auth file in current folder
      let githubCredentialsPath = path.resolve('.imptest-auth');
      this.configPath = path.resolve(this.configPath);
      if (fs.existsSync(this.configPath)) {
        // github credentials in .imptest-auth file in 'config file' folder
        githubCredentialsPath = path.resolve(path.dirname(this.configPath),'.imptest-auth');
      }
      let githubCredentials = JSON.stringify({"github-user": this.githubUser, "github-token": this.githubToken }, null, 4);

      this._info(
        'Your github credentials config: \n'
        + this._jsonHighlight(githubCredentials)
      );

      prompt.multi([
          {
            key: 'write',
            label: c.yellow('> Write Github credentials to ' + githubCredentialsPath + '?'),
            type: 'boolean',
            'default': 'yes'
          }
        ],
        (input) => {
          if (input.write) {            
            fs.writeFileSync(githubCredentialsPath, githubCredentials);
            this._info('Github credentials file saved');
          }
          resolve(input.write);
        });
    });
  }
  
  /**
   * Syntax highlight JSON
   * @param json
   * @return {*}
   * @private
   */
  _jsonHighlight(json) {
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }

      const color = {
        number: 'grey',
        key: 'blue',
        string: 'grey',
        'boolean': 'grey',
        'null': 'grey'
      }[cls];

      return c[color](match);
    });
  }

  get force() {
    return this._force;
  }

  set force(value) {
    this._force = value;
  }
}


module.exports = GithubCommand;
