/**
 * Init command
 */

'use strict';

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
   * Log message
   * @param {string} type
   * @param {[*]} params
   * @protected
   */
  _log(type, colorFn, params) {
    // convert params to true array (from arguments)
    params = Array.prototype.slice.call(params);
    console.log.apply(this, params);
  }

  /**
   * Prompt for values
   * @return {Promise}
   * @private
   */
  _promt() {
    return new Promise((resolve, reject) => {

      return this
        ._promptApiKey()
        .then(() => this._getAccount())
        .then(() => this._promptDevices())

        .catch((err) => {
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
        label: c.blue('> Build API key'),
        type: 'string',
        'default': '<IMP_BULD_API_KEY>'
      }], (input) => {
        this._impTestFile.values.apiKey = input.apiKey && input.apiKey !== '<IMP_BULD_API_KEY>'
          ? input.apiKey
          : null;
        resolve();
      });
    });
  }

  /**
   * Prompt device ids
   * @return {Promise}
   * @private
   */
  _promptDevices() {
    return new Promise((resolve, reject) => {
      prompt.multi([{
        key: 'devices',
        label: c.yellow('> Device IDs, comma-separated'),
        type: 'string',
        'default': ''
      }], (input) => {
        if (!input.devices) {

          this._error('Please specify at least one device');
          return this._promptDevices();

        } else {

          const devices = input.devices.split(',').map((v) => v.trim());
          const accountDeviceIds = this._devices.map((v) => v.id);

          for (const d of devices) {
            if (accountDeviceIds.indexOf(d) === -1) {
              this._error('Device ID ' + d + ' no found on your account');
              return this._promptDevices();
            }
          }

          this._impTestFile.values.devices = devices;
          resolve();
        }
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
          this._info(
            c.blue('Your devices: ')
            + this._devices.map((v) => v.id + ' (' + v.name + ')').join(', ')
          );
        })
        .then(() => this._buildAPIClient.getModels().then((res) => {
          this._models = res.models;
          this._info(
            c.blue('Your models: ')
            + this._models.map((v) => v.id + ' (' + v.name + ')').join(', ')
          );
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
