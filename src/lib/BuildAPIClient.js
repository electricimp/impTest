'use strict';

var request = require('request');
var colors = require('colors');

/**
 * Electric Imp Build API service
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
   * @param {{}} headers
   * @param {string} query
   * @returns {Promise}
   */
  request(method, path, headers, query) {
    return new Promise((resolve, reject) => {

      method = method.toUpperCase();
      headers = headers || {};
      query = query || '';

      let options = {
        'method': method,
        'json': true,
        'url': this._options.apiEndpoint + path,
        'headers': {
          'User-agent': 'imptest',
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

      // add heeaders passed
      Object.assign(options.headers, headers);

      this._debug(colors.blue('Doing the request with options:'), options);

      // do request to build api
      request(options, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (!body.success) {
          reject(body.error);
        } else {
          resolve(body);
        }
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
      let args = Array.prototype.slice.call(arguments);
      args.unshift(colors.green('[debug:' + this.constructor.name + ']'));
      console.log.apply(this, args);
    }
  }
}

module.exports = BuildAPIClient;
