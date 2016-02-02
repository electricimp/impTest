'use strict';

var request = require('request');
var colors = require('colors');
var promiseWhile = require('../utils/promiseWhile');

/**
 * Electric Imp Build API client.
 * Will be published as package eventually.
 *
 * @see https://electricimp.com/docs/buildapi/
 */
class BuildAPIClient {

  /**
   * @param {{}} val
   */
  set options(val) {
    this._options = Object.assign(this._options, val);
  }

  /**
   * @param {{}} options
   */
  constructor(options) {
    // default options
    this._options = {
      debug: false,
      apiKey: null,
      apiEndpoint: 'https://build.electricimp.com/v4'
    };

    this.options = options;
  }

  /**
   * Make Build API request
   *
   * @param {string} method
   * @param {string} path
   * @param {string|{}} query
   * @param {{}} headers
   * @returns {Promise}
   */
  request(method, path, query, headers, onData) {
    return new Promise((resolve, reject) => {

      method = method.toUpperCase();
      query = query || '';
      headers = headers || {};

      const options = {
        method,
        json: true,
        url: this._options.apiEndpoint + path,
        headers: {
          'User-agent': 'impTest',
          'Content-type': 'application/json',
          'Authorization': 'Basic ' + new Buffer(this._options.apiKey || '').toString('base64')
        }
      };

      // use query as body on methods other than GET
      if (query && method === 'GET') {
        options.qs = query;
      } else if (query) {
        options.body = query;
      }

      // add headers passed
      Object.assign(options.headers, headers);

      /* [debug] */
      this._debug(colors.blue('Doing the request with options:'), options);

      // do request to build api
      request(options, (error, response, result) => {

        // debug output
        response && this._debug(colors.blue('Response code:'), response.statusCode);
        result && this._debug(colors.blue('Response:'), result);

        // handle result

        if (error) {

          /* [debug] */
          this._debug(colors.red('Request error:'), error);

          // we're completely screwed
          // error is produced by request libabry
          reject(error);

        } else if (!result.success) {

          let err;

          if (result.error) {
            // we have an error message from web server {error: {code, message_short, message_full}} response
            err = new Error('Error "' + result.error.code + '": ' + result.error.message_full);
          } else if (result.code && result.message) {
            // we have bad HTTP status code and {code, message} response
            err = new Error('Error "' + result.code + '": ' + result.message);
          } else {
            // we have nothing but it's bad
            err = new Error('Error HTTP/' + response.statusCode);
          }

          /* [debug] */
          this._debug(colors.red(err.message));

          reject(err);

          // todo: handle rate limit hit
          // todo: produce custom error types

        } else {
          // we're cool
          resolve(result);
        }

      });
    });
  }

  /**
   * Upload a new code revision
   * @see https://electricimp.com/docs/buildapi/coderev/upload/
   *
   * @param {string} modelId
   * @param {string} [deviceCode=undefined]
   * @param {string} [agentCode=undefined]
   * @param {string} [releaseNotes=undefined]
   * @returns {Promise}
   */
  createRevision(modelId, deviceCode, agentCode, releaseNotes) {
    // todo: check for extra parameters (tag, etc.)
    return this.request('POST', `/models/${modelId}/revisions`, {
      device_code: deviceCode,
      agent_code: agentCode,
      release_notes: releaseNotes
    });
  };

  /**
   * Restart model
   * @see https://electricimp.com/docs/buildapi/model/restart/
   *
   * @param {string} modelId
   * @returns {Promise}
   */
  restartModel(modelId) {
    return this.request('POST', `/models/${modelId}/restart`);
  }

  /**
   * Get device logs
   * @see https://electricimp.com/docs/buildapi/logentry/list/
   * @see https://electricimp.com/docs/buildapi/logentry/
   *
   * @param deviceId
   * @param {Date|string} [since=undefined] - start date (string in ISO 8601 format or Date instance)
   * @returns {Promise}
   */
  getDeviceLogs(deviceId, since) {
    // convert since to ISO 8601 format
    since && (since instanceof Date) && (since = since.toISOString());
    return this.request('GET', `/devices/${deviceId}/logs`, {since});
  }

  /**
   *
   * @param deviceID
   * @param {function(data)} [callback] Data callback. If it returns false, streaming stops
   */
  streamDeviceLogs(deviceId, callback) {
    return new Promise((resolve, reject) => {

      this.getDeviceLogs(deviceId, '3000-01-01T00:00:00.000+00:00' /* just get poll url */)
        .then((data) => {

          let stop = false;

          let pollUrl = data.poll_url;
          pollUrl = pollUrl.replace(/^\/v\d+/, ''); // remove version prefix

          promiseWhile(
            () => !stop,
            () => {
              return new Promise((resolve, reject) => {
                this.request('GET', pollUrl)
                  .then((data) => {
                    stop = !callback(data);
                    resolve(); // next stream request
                  })
                  .catch((error) => {
                    // todo: handle HTTP/504 (timeouts, call again)
                    if (error.message.indexOf('InvalidLogToken') !== -1 /* timeout error */) {
                      stop = true;
                      resolve(this.streamDeviceLogs(deviceId, callback));
                    } else {
                      reject(error);
                    }
                  });
              });
            }
          ).then(resolve, reject);

        });
    });
  }

  /**
   * Debug print
   * @param {*} ...objects
   * @protected
   */
  _debug() {
    if (this._options.debug) {
      const args = Array.prototype.slice.call(arguments);
      args.unshift(colors.green('[debug:' + this.constructor.name + ']'));
      console.log.apply(this, args);
    }
  }
}

module.exports = BuildAPIClient;
