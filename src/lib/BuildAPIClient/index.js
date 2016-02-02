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
   * @param {function|null} [onData=null] data stream handler
   * @returns {Promise}
   */
  request(method, path, query, headers, onData) {
    let streamData = '';

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

      this._debug(colors.blue('Doing the request with options:'), options);

      // do request to build api
      const r = request(options, (error, response, result) => {

        // debug output
        response && this._debug(colors.blue('Response code:'), response.statusCode);
        result && this._debug(colors.blue('Response:'), result);
        error && this._debug(colors.blue('Error:'), error);

        // handle result

        if (error) {

          // we're completely screwed
          // error is produced by request libabry
          reject(error);

        } else if (!result.success) {

          // we have an error message from web server

          if (result.error) {
            reject(new Error(result.error.code));
          } else {
            reject(new Error(result.message));
          }

          // todo: handle rate limit hit
          // todo: produce custom error types

        } else {
          // we're cool
          resolve(result);
        }
      });

      // stream data
      if (onData) {
        r.on('data', (data) => {

          this._debug(colors.blue('STREAM: ') + colors.yellow(data));

          data = streamData + data.toString();
          streamData = '';

          try {
            data = JSON.parse(data.toString());
          } catch (e) {
            // in case data chunk is not parseable, save it for later
            if (e instanceof  SyntaxError) {
              this._debug(colors.red('Incomplete data'));
              streamData += data;
            }
          }

          if (streamData.length === 0) onData(data);
        });
      }

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
   * @param {Date|string} [since=undefined]
   * @param {function(data)} [callback] Data callback. If it returns false, streaming stops
   */
  streamDeviceLogs(deviceId, since, callback) {
    return new Promise((resolve, reject) => {
      this.getDeviceLogs(deviceId, since)
        .then((data) => {

          let stop = false;;

          const streamHandler = (data) => {

            this._debug(colors.blue('Streamed data: ') + JSON.stringify(data));
            const res = callback(data);
            this._debug(colors.blue('Callback result: ' + res));
            stop = !res;

          };

          streamHandler(data);

          if (stop) {
            resolve(data);
          } else {
            // continue reading logs from poll url

            // read poll url
            let pollUrl = data.poll_url;
            pollUrl = pollUrl.replace(/^\/v\d+/, ''); // remove version prefix

            promiseWhile(
              () => !stop,
              (() => this._readLogsStream(pollUrl)
                  .then(streamHandler, reject)
              ).bind(this)
            ).then(resolve);
          }

        }, reject);
    });
  }

  _readLogsStream(pollUrl) {
    return this.request('GET', pollUrl);
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
