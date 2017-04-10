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
 * Build API logs parser
 *
 * Events:
 *  - ready
 *  - log
 *  - error
 *  - done
 *
 *  @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

const c = require('colors');
const EventEmitter = require('events');
const DebugMixin = require('../../DebugMixin');

class LogsParser extends EventEmitter {

  constructor() {
    super();
    DebugMixin.call(this);
  }

  /**
   * Read device logs, convert them to predefined types
   * @param {"agent"|"device"} testType
   * @param {string} deviceId
   * @return {LogParser}
   */
  parse(testType, deviceId) {

    // for historical reasons, device produce server.* messages
    const apiType = {agent: 'agent', device: 'server'}[testType];

    this._buildAPIClient.streamDeviceLogs(deviceId, (data) => {

        if (data) {

          for (const log of data.logs) {

            this._debug(c.blue('Log line received: ') + JSON.stringify(log));

            // xxx
            // console.log(c.yellow(JSON.stringify(log)));

            let m;
            const message = log.message;

            try {

              switch (log.type) {

                case 'status':

                  if (message.match(/Agent restarted/)) {
                    // agent restarted
                    this.emit('log', {type: 'AGENT_RESTARTED'});
                  } else if (m = message.match(/(Out of space)?.*?([\d\.]+)% program storage used/)) {
                    // code space used
                    this.emit('log', {type: 'DEVICE_CODE_SPACE_USAGE', value: parseFloat(m[2])});

                    // out of code space
                    if (m[1]) {
                      this.emit('log', {type: 'DEVICE_OUT_OF_CODE_SPACE'});
                    }
                  } else if (message.match(/Device disconnected/)) {
                    this.emit('log', {type: 'DEVICE_DISCONNECTED'});
                  } else if (message.match(/Device connected/)) {
                    this.emit('log', {type: 'DEVICE_CONNECTED'});
                  } else {
                    this.emit('log', {type: 'UNKNOWN', value: log});
                  }

                  break;

                // error
                case 'lastexitcode':

                  if (message.match(/out of memory/)) {
                    this.emit('log', {type: 'DEVICE_OUT_OF_MEMORY'});
                  } else {
                    this.emit('log', {type: 'LASTEXITCODE', value: message});
                  }

                  break;

                case 'server.log':
                case 'agent.log':

                  if (log.type.replace(/\.log$/, '') === apiType) {
                    if (message.match(/__IMPUNIT__/)) {
                      // impUnit message, decode it
                      this.emit('log', {type: 'IMPUNIT', value: JSON.parse(message)});
                    }
                  }

                  break;

                case 'agent.error':
                  this.emit('log', {type: 'AGENT_ERROR', value: message});
                  break;

                case 'server.error':
                  this.emit('log', {type: 'DEVICE_ERROR', value: message});
                  break;

                case 'powerstate':
                  this.emit('log', {type: 'POWERSTATE', value: message});
                  break;

                case 'firmware':
                  this.emit('log', {type: 'FIRMWARE', value: message});
                  break;

                default:
                  this.emit('log', {type: 'UNKNOWN', value: log});
                  break;
              }

            } catch (e) {
              this.emit('error', {error: e});
            }

            // are we done?
            if (this.stop) {
              this.emit('done');
              break;
            }
          }

        } else {
          // we're connected
          this.emit('ready');
        }

        return !this.stop;
      })

      .catch((e) => {
        this.emit('error', {error: e});
        this.emit('done');
      });

    return this;
  }

  get buildAPIClient() {
    return this._buildAPIClient;
  }

  set buildAPIClient(value) {
    this._buildAPIClient = value;
  }

  get stop() {
    return this._stop;
  }

  set stop(value) {
    this._stop = value;
  }
}

module.exports = LogsParser;
