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
 * Init command
 */

'use strict';

const fs = require('fs');
const c = require('colors');
const glob = require('glob');
const prompt = require('cli-prompt');
const CliTable = require('cli-table');
const AbstractCommand = require('./AbstractCommand');

/**
 * Name for BuildAPI key env var
 */
const BUILD_API_KEY_ENV_VAR = 'IMP_BUILD_API_KEY';

class InitCommand extends AbstractCommand {

  _init() {
    super._init();
    this._values = {};
  }

  _run() {
    return super._run()
      .then(() => {
        if (!this.force && this._impTestFile.exists) {
          throw new Error('Config file already exists, use -f option to overwrite');
        }
      })
      .then(() => this._promptApiKey())
      .then(() => this._promptDevices())
      .then(() => this._promptFiles())
      .then(() => this._promtpOptions())
      .then(() => this._writeConfig())
      .then((written) => {
        if (written && (this._impTestFile.values.deviceFile || this._impTestFile.values.agentFile)) {
          return this._generateBasicTests();
        }
      });
  }

  /**
   * Prompt apiKey
   * @return {Promise}
   * @private
   */
  _promptApiKey() {
    return new Promise((resolve, reject) => {
      prompt.multi([{
        key: 'apiKey',
        label: c.yellow('> Build API key (' + BUILD_API_KEY_ENV_VAR + ' environment variable is used if blank)'),
        type: 'string',
        'default': ''
      }], (input) => {
        this._impTestFile.values.apiKey = input.apiKey
          ? input.apiKey
          : null;
        resolve(this._getAccount().catch((e) => {
          this._onError(e);
          return this._promptApiKey();
        }));
      });
    });
  }

  /**
   * Get account info
   * @return {Promise}
   * @private
   */
  _getAccount() {
    return new Promise((resolve, reject) => {

      this._info('Retrieving your devices...');

      this._buildAPIClient.apiKey =
        this._impTestFile.values.apiKey
        || process.env[BUILD_API_KEY_ENV_VAR];

      this._buildAPIClient
        .listDevices().then((res) => {
          this._devices = {};
          for (const device of res.devices) {
            this._devices[device.id] = device;
          }
        })
        .then(() => this._buildAPIClient.listModels().then((res) => {
          this._models = {};
          for (const model of res.models) {
            this._models[model.id] = model;
          }
        }))
        .then(() => this._displayAccount())
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Display account devices/models
   * @private
   */
  _displayAccount() {
    const table = new CliTable({
      head: [
        c.blue('Device ID'),
        c.blue('Device Name'),
        c.blue('Model ID'),
        c.blue('Model Name'),
        c.blue('State')
      ]
    });

    for (const modelId in this._models) {
      for (const deviceId of  this._models[modelId].devices) {
        table.push([
          deviceId                     || "",
          this._devices[deviceId].name || "",
          this._models[modelId].id     || "",
          this._models[modelId].name   || "",
          this._devices[deviceId].powerstate === 'online'
            ? c.green(this._devices[deviceId].powerstate)
            : c.red(this._devices[deviceId].powerstate)
        ]);
      }
    }

    this._info(table.toString());
  }

  /**
   * Prompt device ids/model id
   * @return {Promise}
   * @private
   */
  _promptDevices() {
    return new Promise((resolve, reject) => {

      let defaultModelId = '';

      prompt.multi([
        {
          key: 'devices',
          label: c.yellow('> Device IDs to run tests on (comma-separated)'),
          type: 'string',
          'default': this._impTestFile.values.devices.join(','),
          validate: (value) => {
            if (!value) return false;

            const modelIds = new Set();

            for (const deviceId of value.split(',').map((v) => v.trim())) {
              if (!this._devices[deviceId]) {
                this._error('Device ID ' + deviceId + ' not found on your account');
                return false;
              }

              if (!modelIds.has(this._devices[deviceId].model_id)) {
                modelIds.add(this._devices[deviceId].model_id);
                defaultModelId = this._devices[deviceId].model_id;
              }

              if (modelIds.size > 1) {
                this._error('Devices should be attached to the same model');
                return false;
              }
            }

            return true;
          }
        },
        {
          key: 'modelId',
          label: c.yellow('> Model ID'),
          type: 'string',
          'default': () => defaultModelId,
          validate: (value) => {
            if (!value) return false;

            if (!this._models[value]) {
              this._error('Model ID ' + value + ' not found on your account');
              return false;
            }

            return true;
          }
        },
      ], (input) => {
        // save device names

        const deviceNames = {};

        for (const deviceId in this._devices) {
          deviceNames[deviceId] = this._devices[deviceId].name;
        }

        this._impTestFile.deviceNames = deviceNames;

        // save device ids
        const devices = input.devices.split(',').map((v) => v.trim());
        this._impTestFile.values.devices = devices;

        // save model id
        this._impTestFile.values.modelId = input.modelId;

        // save model name
        this._impTestFile.modelName = this._models[input.modelId].name;

        resolve();
      });

    });
  }

  /**
   * Proimpt files
   * @return {Promise}
   * @private
   */
  _promptFiles() {
    return new Promise((resolve, reject) => {

      // find source files suggestions

      let deviceFiles = [];
      let agentFiles = [];

      // local files
      deviceFiles = glob.sync('**/*device*.nut', {cwd: this._impTestFile.dir})
        .concat(glob.sync('**/*.nut', {cwd: this._impTestFile.dir}));
      agentFiles = glob.sync('**/*agent*.nut', {cwd: this._impTestFile.dir})
        .concat(glob.sync('**/*.nut', {cwd: this._impTestFile.dir}));

      // files from .imptest
      if (this._impTestFile.exists) {
        deviceFiles.unshift(this._impTestFile.values.deviceFile || '<no file>');
        agentFiles.unshift(this._impTestFile.values.agentFile || '<no file>');
      }

      prompt.multi([
          {
            key: 'deviceFile',
            label: c.yellow(
              '> Device file' + (
                deviceFiles[0] && deviceFiles[0] !== '<no file>'
                  ? ' (type "-" for no device file)'
                  : ''
              )),
            type: 'string',
            'default': () => deviceFiles[0] || '<no file>'
          },
          {
            key: 'agentFile',
            label: c.yellow(
              '> Agent file' + (
                agentFiles[0] && agentFiles[0] !== '<no file>'
                  ? ' (type "-" for no agent file)'
                  : ''
              )),
            type: 'string',
            'default': () => agentFiles[0] || '<no file>'
          }
        ],
        (input) => {
          this._impTestFile.values.deviceFile =
            input.deviceFile && input.deviceFile !== '-'
            && input.deviceFile !== '<no file>'
              ? input.deviceFile : null;
          this._impTestFile.values.agentFile =
            input.agentFile && input.agentFile !== '-'
            && input.agentFile !== '<no file>'
              ? input.agentFile : null;
          resolve();
        });
    });
  }

  /**
   * Prompt options
   * @return {Promise}
   * @private
   */
  _promtpOptions() {
    return new Promise((resolve, reject) => {
      prompt.multi([
          {
            key: 'stopOnFailure',
            label: c.yellow('> Stop testing on failures?'),
            type: 'boolean',
            'default': this._impTestFile.values.stopOnFailure ? 'yes' : 'no'
          },
          {
            key: 'timeout',
            label: c.yellow('> Test methods timeout, seconds'),
            type: 'integer',
            'default': this._impTestFile.values.timeout
          },
        ],
        (input) => {
          this._impTestFile.values.stopOnFailure = input.stopOnFailure;
          this._impTestFile.values.timeout = parseFloat(input.timeout);
          resolve();
        });
    });
  }

  /**
   * Write config
   * @return {Promise}
   * @private
   */
  _writeConfig() {
    return new Promise((resolve, reject) => {

      this._info(
        'Your config: \n'
        + this._jsonHighlight(this._impTestFile.json)
      );

      prompt.multi([
          {
            key: 'write',
            label: c.yellow('> Write to ' + this.configPath + '?'),
            type: 'boolean',
            'default': 'yes'
          }
        ],
        (input) => {
          if (input.write) {
            this._impTestFile.write();
            this._info('Config file saved');
          }
          resolve(input.write);
        });
    });
  }

  /**
   * Generate sample tests
   * @return {Promise}
   * @private
   */
  _generateBasicTests() {
    return new Promise((resolve, reject) => {
      prompt.multi([
          {
            key: 'generate',
            label: c.yellow('> Generate sample test cases?'),
            type: 'boolean',
            'default': 'yes'
          }
        ],
        (input) => {
          if (input.generate) {
            this._writeBasicTest('agent')
            this._writeBasicTest('device');
          }

          resolve();
        });
    });
  }

  /**
   * Write basic test
   * @param {'agent'|'device'} type
   * @private
   */
  _writeBasicTest(type) {

    if ((type == 'agent' && this._impTestFile.values.agentFile)
        || (type == 'device' && this._impTestFile.values.deviceFile)) {

      const cwd = this._impTestFile.dir;

      // create dir
      if (!fs.existsSync(cwd + '/tests')) fs.mkdirSync(cwd + '/tests');

      const fileName = 'tests/' + type + '.test.nut';
      const file = cwd + '/' + fileName;

      if (!fs.existsSync(file)) {
        fs.writeFileSync(file,
          `class ${type === 'agent' ? 'Agent' : 'Device'}TestCase extends ImpTestCase {
  function setUp() {
    return "Hi from #{__FILE__}!";
  }

  function testSomething() {
    this.assertTrue(this instanceof ImpTestCase);
  }

  function tearDown() {
    return "Test finished";
  }
}\n`
        );
        this._info('Created file "' + fileName + '"');
      } else {
        this._info('File "' + fileName + '" already exists');
      }
    }

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


module.exports = InitCommand;
