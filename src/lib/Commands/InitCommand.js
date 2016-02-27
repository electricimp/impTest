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
          this._devices = {};
          for (const device of res.devices) {
            this._devices[device.id] = device;
          }
        })
        .then(() => this._buildAPIClient.getModels().then((res) => {
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
          deviceId,
          this._devices[deviceId].name,
          this._models[modelId].id,
          this._models[modelId].name,
          this._devices[deviceId].powerstate === 'online'
            ? c.green(this._devices[deviceId].powerstate)
            : c.red(this._devices[deviceId].powerstate)
        ]);
      }
    }

    this._info(table.toString());
  }

  /**
   * Prompt device ids
   * @return {Promise}
   * @private
   */
  _promptDevices() {
    return new Promise((resolve, reject) => {

      prompt.multi([
        {
          key: 'devices',
          label: c.yellow('> Device IDs to run tests on (comma-separated)'),
          type: 'string',
          'default': '',
          validate: (value) => {
            const devices = value.split(',').map((v) => v.trim());
            const accountDeviceIds = this._devices.map((v) => v.id);
            const models = new Set();

            for (const d of devices) {

              if (accountDeviceIds.indexOf(d) === -1) {
                this._error('Device ID ' + d + ' not found on your account');
                return false;
              }

              if (!models.has(d.model_id)) {
                models.add(d.model_id);
              }

              if (models.size > 1) {
                this._error('Devices should be attached to the same model');
                return false;
              }

            }

            return true;
          }
        },
        {
          key: 'model',
          label: c.yellow('> Model ID'),
          type: 'string',
          'default': '',
          validate: (value) => {
            const devices = value.split(',').map((v) => v.trim());
            const accountDeviceIds = this._devices.map((v) => v.id);

            for (const d of devices) {
              if (accountDeviceIds.indexOf(d) === -1) {
                this._error('Device ID ' + d + ' not found on your account');
                return false;
              }
            }

            return true;
          }
        },
      ], (input) => {
        const devices = input.devices.split(',').map((v) => v.trim());
        this._impTestFile.values.devices = devices;
        resolve();
      });

    });
  }

  // _prompt

  get force() {
    return this._force;
  }

  set force(value) {
    this._force = value;
  }
}

module.exports = InitCommand;
