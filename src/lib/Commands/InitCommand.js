/**
 * Init command
 */

'use strict';

const fs = require('fs');
const c = require('colors');
const prompt = require('cli-prompt');
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
      .then(this._promt.bind(this));
  }

  /**
   * Prompt for values
   * @return {Promise}
   * @private
   */
  _promt() {
    this._blankLine();

    return new Promise((resolve, reject) => {

      return this
        ._promptApiKey()
        .then(() => this._getAccount())

        .catch((err) => {
          this._blankLine();
          this._onError(err);
        });
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
        label: c.blue('Build API key (leave blank to use IMP_BULD_API_KEY env var)'),
        type: 'string',
        'default': ''
      }], (input) => {
        this._impTestFile.values.apiKey = input.apiKey ? input.apiKey : null;
        resolve();
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

      this._buildAPIClient.apiKey =
        this._impTestFile.values.apiKey
        || process.env[BUILD_API_KEY_ENV_VAR];

      this._buildAPIClient
        .getDevices().then((res) => {
          this._devices = res.devices;
        })
        .then(() => this._buildAPIClient.getModels().then((res) => {
          this._models = res.models;
        }))
        .then(resolve)
        .catch(reject);
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
