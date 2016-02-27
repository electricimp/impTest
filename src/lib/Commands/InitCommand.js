/**
 * Init command
 */

'use strict';

const c = require('colors');
const prompt = require('cli-prompt');
const AbstractCommand = require('./AbstractCommand');
const CliTable = require('cli-table');

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
        label: c.yellow('> Build API key (IMP_BULD_API_KEY environment variable is used if blank)'),
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

      console.log(c.grey('Retrieving your devices...'));

      this._buildAPIClient.apiKey =
        this._impTestFile.values.apiKey
        || process.env[BUILD_API_KEY_ENV_VAR];

      this._buildAPIClient
        .getDevices().then((res) => {
          this._devices = res.devices;
        })
        .then(() => this._buildAPIClient.getModels().then((res) => {
          this._models = res.models;

          const table = new CliTable({
            head: [
              c.blue('Device ID'),
              c.blue('Device Name'),
              c.blue('Model ID'),
              c.blue('Model Name')
            ]
          });

          const deviceNames = {};

          for (const device of this._devices) {
            deviceNames[device.id] = device.name;
          }

          for (const model of this._models) {
            for (const deviceId of model.devices) {
              table.push([deviceId, deviceNames[deviceId], model.id, model.name]);
            }
          }

          console.log(table.toString());
        }))
        .then(resolve)
        .catch(reject);
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
        label: c.yellow('> Device IDs to run tests on (comma-separated)'),
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
              this._error('Device ID ' + d + ' not found on your account');
              return this._promptDevices();
            }
          }

          this._impTestFile.values.devices = devices;
          resolve();
        }
      });
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
