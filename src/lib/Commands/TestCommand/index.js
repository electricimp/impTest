// MIT License
//
// Copyright 2016-2017 Electric Imp
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


// Test command
// @author Mikhail Yurasov <mikhail@electricimp.com>

'use strict';

//<editor-fold desc="Imports">
const fs = require('fs');
const c = require('colors');
const path = require('path');
const glob = require('glob');
const Builder = require('Builder');
const Errors = require('./Errors');
const Session = require('./Session');
const dateformat = require('dateformat');
const LogParser = require('./LogParser');
const Watchdog = require('../../Watchdog');
const randomstring = require('randomstring');
const sprintf = require('sprintf-js').sprintf;
const BuildAPIClient = require('imp-build-api-v4');
const AbstractCommand = require('../AbstractCommand');
const promiseWhile = require('../../utils/promiseWhile');
//</editor-fold>


// Delay before testing start.
// Prevents log sessions mixing, allows
// service messages to be before tests output.
// [s]

const DEFAULT_STARTUP_DELAY = 2;

// Timeout before session startup

const DEFAULT_STARTUP_TIMEOUT = 60;

// Allow extra time on top of .imptest.timeout before
// treating test as timed out on a tool siode.

const DEFAULT_EXTRA_TEST_MESSAGE_TIMEOUT = 5;

// Name for BuildAPI key env var

const BUILD_API_KEY_ENV_VAR = 'IMP_BUILD_API_KEY';

// For #{__LINE__} and #{__FILE__} correction

const FILE_REGEXP = /#{__FILE__}/g;
const LINE_REGEXP = /#{__LINE__}/g;

// Test command

class TestCommand extends AbstractCommand {

  // Run command
  // @return {Promise}
  // @protected

  _run() {
    return super._run()
      .then(() => {

        // startup message
        this._info('impTest/' + this.version);
        this.logTiming = true; // enable log timing
        this._info(c.blue('Started at ') + dateformat(new Date(), 'dd mmm yyyy HH:MM:ss Z'));


        // find test case files
        const testFiles = this._findTestFiles();

        // pre-cache source code
        this._sourceCode;

        let d = 0;

        return promiseWhile(
          () => d++ < this._impTestFile.values.devices.length && !this._stopCommand,
          () => this._runDevice(d - 1, testFiles).catch((e) => {
            this._debug(c.red('Device #' + d + ' run failed'));
            this._onError(e);
          })
        );

      });
  }

  // We're done with testing
  // @private

  finish() {
    if (this._stopCommand) {
      this._debug(c.red('Command was forced to stop'));
    }

    this._blank();

    if (this._success) {
      this._info(c.green('Testing succeeded'));
    } else {
      this._info(c.red('Testing failed'));
    }

    super.finish();
  }

  // Initialize before run()
  // @protected

  _init() {
    super._init();

    if (!this._impTestFile.exists) {
      throw new Error('Config file not found');
    }
  }


  // Run test files on single device
  //
  // @param {number} deviceIndex
  // @param {[]} testFiles
  // @return {Priomise}
  // @private

  _runDevice(deviceIndex, testFiles) {
    let t = 0;

    this._stopDevice = false;

    return promiseWhile(
      () => t++ < testFiles.length && !(this._stopDevice || this._stopCommand),
      () => this._runTestFile(testFiles[t - 1], deviceIndex)
    );
  }

  // Find test files
  // @returns {[{name, path, type}]}
  // @private

  _findTestFiles() {
    const files = [];
    let configCwd;

    const pushFile = (file) => {
      let lastAdded = files[files.push({
        name: file,
        path: path.resolve(configCwd, file),
        type: /\bagent\b/i.test(file) ? 'agent' : 'device'
      }) - 1];
      if (/.*\.(agent|device)\.test\.nut$/ig.test(file)) {
        let tmp = file.replace(/\.(agent|device)\.test\.nut$/ig, '');
        if (fs.existsSync(path.resolve(configCwd, tmp+'.agent.test.nut')) && 
            fs.existsSync(path.resolve(configCwd, tmp+'.device.test.nut'))) {
          Object.defineProperty(lastAdded, 'partnername', {
            value: file.endsWith('.device.test.nut') ?
                        tmp + '.agent.test.nut' : tmp + '.device.test.nut'
          });
          Object.defineProperty(lastAdded, 'partnerpath', {
            value: path.resolve(configCwd, lastAdded.partnername)
          });
        }
      }
    };

    let searchPatterns = '';

    // test file pattern is passed via cli
    if (this.testCaseFile) {
      // look in the current path
      configCwd = path.resolve('.');
      searchPatterns = this.testCaseFile;
    } else {
      // look in config file directory
      configCwd = this._impTestFile.dir;
      searchPatterns = this._impTestFile.values.tests;
    }

    if (typeof searchPatterns === 'string') {
      searchPatterns = [searchPatterns];
    }

    for (const searchPattern of searchPatterns) {
      for (const file of glob.sync(searchPattern, {cwd: configCwd})) {
        pushFile(file);
      }
    }

    if (files.length === 0) {
      throw new Error('No test files found');
    }

    this._debug(c.blue('Test files found:'), files);

    this._info(c.blue('Found ') +
               files.length +
               c.blue(' test file' +
               (files.length === 1 ? ':' : 's:')) + '\n\t'
               + files.map(e => e.name).join('\n\t')
    );

    return files;
  }

  // Run test file
  // @param {name, path, type} testFile
  // @param {name, path, type} deviceIndex
  // @returns {Promise}
  // @private

  _runTestFile(testFile, deviceIndex) {
    return new Promise((resolve, reject) => {

      // blank line
      this._blank();

      // init test session
      this._session = new Session();
      this._info(c.blue('Starting test session ') + this._session.id);

      // is test agent-only?
      const testIsAgentOnly = !this._sourceCode.device && 'agent' === testFile.type;

      if (testIsAgentOnly) {
        this._info(c.blue('Test session is') + ' agent-only');
      }

      // create agent/device code to run
      const code = this._getSessionCode(testFile);

      // get device id
      const deviceId = this._impTestFile.values.devices[deviceIndex];

      // resolve device info
      return this._buildAPIClient.getDevice(deviceId)

        .then((res) => {

          this._info(
            c.blue('Using device ') + res.device.name + c.blue(' [') + deviceId + c.blue('] (') +
            c.blue((deviceIndex + 1) + '/' + this._impTestFile.values.devices.length + ') '));

          // check model
          if (res.device.model_id !== this._impTestFile.values.modelId) {
            throw new Errors.WrongModelError();
          }

          // check online state
          if (!testIsAgentOnly && res.device.powerstate !== 'online') {
            throw new Errors.DevicePowerstateError('Device is in "' + res.device.powerstate + '" powerstate');
          }
        })

        .then(() => {
          return this._buildAPIClient.getModel(this._impTestFile.values.modelId)
            .then((res) => {
              this._info(c.blue('Using model ') + res.model.name + c.blue(' [') + res.model.id + c.blue(']'));
            });
        })

        // run test session
        .then(() => this._runSession(deviceId, code.device, code.agent, testFile.type))

        // error
        .catch((error) => {
          this._onError(error);
        })

        // next file
        .then(resolve);
    });
  }

  // Prepare source code
  // @param testFile
  // @return {{agent: string, device: string}}
  // @private

  _getSessionCode(testFile) {
    let agentCode, deviceCode;

    // [info]
    this._info(c.blue('Using ') + testFile.type + c.blue(' test file ') + testFile.name);

    // read/process test code
    let testCode = fs.readFileSync(testFile.path, 'utf-8').trim()
        .replace(LINE_REGEXP, "@{__LINE__}").replace(FILE_REGEXP, "@{__FILE__}");

      let tmp = testCode.match(/#{env:.*}/g);
      if (tmp) {
        tmp.forEach((nextEnv) => {
          let nextPropertyName = nextEnv.slice(6,-1);
          if (nextPropertyName !== BUILD_API_KEY_ENV_VAR) { //deny to access for BUILD_API_KEY_ENV_VAR
            if (nextPropertyName in process.env) {
              testCode = testCode.replace(nextEnv, process.env[nextPropertyName]);
            } else {
              this._warning("Can't replace: " + nextEnv);
            }
          }
        });
      }

    // triggers device code space usage message, which also serves as revision launch indicator for device
    const reloadTrigger = '// force code update\n"' + randomstring.generate(32) + '"';

    // bootstrap code
    const bootstrapCode = `
// bootstrap tests
imp.wakeup(${this.startupDelay /* prevent log sessions mixing, allow service messages to be before tests output */}, function() {
  local t = ImpUnitRunner();
  t.readableOutput = false;
  t.session = "${this._session.id}";
  t.timeout = ${parseFloat(this._impTestFile.values.timeout)};
  t.stopOnFailure = ${!!this._impTestFile.values.stopOnFailure};
  // poehali!
  t.run();
});`
      .trim();

    // agent source file name for line control
    const agentLineControlFile = this._impTestFile.values.agentFile ?
                                 path.basename(this._impTestFile.values.agentFile) :
                                 '__agent__';

    // device source file name for line control
    const deviceLineControlFile = this._impTestFile.values.deviceFile ?
                                  path.basename(this._impTestFile.values.deviceFile) :
                                  '__device__';

    // quote file name for line control statement
    const quoteFilename = f => f.replace('"', '\\"');
    // backslash to slash
    const backslashToSlash = f => f.replace(/\\/g, "/");

    let tmpFrameworkFile = backslashToSlash(this.testFrameworkFile);
    let agentIncludeOrComment = this._sourceCode.agent ? '@include "' + this._sourceCode.agent + '"' : '/* no agent source */';
    let deviceIncludeOrComment = this._sourceCode.device ? '@include "' + this._sourceCode.device + '"' : '/* no device source */';

    let agentName = path.basename(testFile.name), deviceName = agentName, testPath = backslashToSlash(path.dirname(testFile.path));
    if ('partnername' in testFile) {
      if ('agent' === testFile.type) {
        deviceName = testFile.partnername;
      } else {
        agentName = testFile.partnername;
      }
    }

    if ('agent' === testFile.type) {
      // <editor-fold defaultstate="collapsed">
      agentCode =
`#line 1 "impUnit"
@include "${quoteFilename(tmpFrameworkFile)}"

#line 1 "${quoteFilename(agentLineControlFile)}"
${agentIncludeOrComment}

// tests module
function __module_tests(ImpTestCase) {
#line 1 "${quoteFilename(testPath+'/'+agentName)}"
${testCode}
}

// tests bootstrap module
function __module_tests_bootstrap(ImpUnitRunner) {
#line 1 "__tests_bootstrap__"
${bootstrapCode}
}

// resolve modules
__module_tests(__module_impUnit_exports.ImpTestCase);
__module_tests_bootstrap(__module_impUnit_exports.ImpUnitRunner);
`;

      deviceCode =
`#line 1 "${quoteFilename(deviceLineControlFile)}"
${deviceIncludeOrComment}

${'partnerpath' in testFile ? '@include "' + backslashToSlash(testFile.partnerpath) + '"' : ''}

${reloadTrigger}
`;
      // </editor-fold>
    } else {
      // <editor-fold defaultstate="collapsed">
      deviceCode =
`#line 1 "impUnit"
@include "${quoteFilename(tmpFrameworkFile)}"

#line 1 "${quoteFilename(deviceLineControlFile)}"
${deviceIncludeOrComment}

// tests module
function __module_tests(ImpTestCase) {
#line 1 "${quoteFilename(testPath+'/'+deviceName)}"
${testCode}
}

// tests bootstrap module
function __module_tests_bootstrap(ImpUnitRunner) {
#line 1 "__tests_bootstrap__"
${bootstrapCode}
}

// resolve modules
__module_tests(__module_impUnit_exports.ImpTestCase);
__module_tests_bootstrap(__module_impUnit_exports.ImpUnitRunner);

${reloadTrigger}
`;
      agentCode =
`#line 1 "${quoteFilename(agentLineControlFile)}"
${agentIncludeOrComment}

${'partnerpath' in testFile ? '@include "' + backslashToSlash(testFile.partnerpath) + '"' : ''}
`;
      // </editor-fold>
    }

    agentCode = this._Builder.machine.execute(agentCode, {
      __FILE__: agentName,
      __PATH__: testPath
    });
    deviceCode = this._Builder.machine.execute(deviceCode, {
      __FILE__: deviceName,
      __PATH__: testPath
    });
 
    // FUNCTION: correct line control statements 
    let correctLine = (testCode, fileName) => {
      let linePattern = RegExp('#line \\d+ \"' + testPath + '/' + fileName + '\"', 'g');
      let tmp = testCode.match(linePattern);
      if (tmp) {
        tmp.forEach(function (nextLine){
          let lineNumber = Number.parseInt(nextLine.slice(6, -1 * (testPath.length + agentName.length + 4)));
          if (lineNumber > 9) {
            testCode  =testCode.replace(nextLine, '#line ' + (lineNumber-9) + ' \"' + testPath + '/' + agentName + '\"');
          }
        });
      }
      return testCode;
    }
    // correct line control statements 
    if ('agent' === testFile.type) {
      agentCode = correctLine(agentCode, agentName);
    } else {
      deviceCode = correctLine(deviceCode, deviceName);
    }

    if (this.debug) {
      // FUNCTION: create a new directory and any necessary subdirectories
      let mkdirs = (dirName) => {
        let subDirNAme = path.dirname(dirName);
        if (!fs.existsSync(subDirNAme)) {
            mkdirs(subDirNAme);
        }
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName);
        }
      };

      let tmpFileName = path.resolve('./build', testFile.name);
      let preprocessedFolder = path.dirname(tmpFileName);
      let fileName = path.basename(tmpFileName);
      // create folder to dump preprocessed code
      mkdirs(preprocessedFolder);
      // write dump preprocessed codes
      fs.writeFile(preprocessedFolder + '/preprocessed.agent.' + fileName, agentCode, (err) => {
        if (err) this._error(err);
      });
      fs.writeFile(preprocessedFolder + '/preprocessed.device.' + fileName, deviceCode, (err) => {
        if (err) this._error(err);
      });
    }

    this._debug(c.blue('Agent code size: ') + agentCode.length + ' bytes');
    this._debug(c.blue('Device code size: ') + deviceCode.length + ' bytes');

    return {
      agent: agentCode,
      device: deviceCode
    };
  }

  // Initialize session watchdog timers
  // @private

  _initSessionWatchdogs() {
    // test messages

    this._sessionTestMessagesWatchdog = new Watchdog();
    this._sessionTestMessagesWatchdog.debug = this.debug;
    this._sessionTestMessagesWatchdog.name = 'test-messages';
    this._sessionTestMessagesWatchdog.timeout =
      this.extraTestTimeout + parseFloat(this._impTestFile.values.timeout);

    this._sessionTestMessagesWatchdog.on('timeout', () => {
      this._onError(new Errors.SesstionTestMessagesTimeoutError());
      this._session.stop = this._stopSession;
    });

    // session start

    this._sessionStartWatchdog = new Watchdog();
    this._sessionStartWatchdog.debug = this.debug;
    this._sessionStartWatchdog.name = 'session-start';
    this._sessionStartWatchdog.timeout = this.sessionStartTimeout;

    this._sessionStartWatchdog.on('timeout', () => {
      this._onError(new Errors.SessionStartTimeoutError());
      this._session.stop = this._stopSession;
    });

    this._sessionStartWatchdog.start();
  }

  // Execute test via BuildAPI from prepared code
  //
  // @param {string} deviceId
  // @param {string} deviceCode
  // @param {string} agentCode
  // @param {"agent"|"device"} testType
  // @return {Promise}
  // @private

  _runSession(deviceId, deviceCode, agentCode, testType) {

    return new Promise((resolve, reject) => {

      this._stopSession = false;
      this._initSessionWatchdogs();

      // configure session

      this._session.debug = this.debug;
      this._session.buildAPIClient = this._buildAPIClient;
      this._session.externalCommandsTimeout = parseFloat(this._impTestFile.values.timeout);
      this._session.externalCommandsCwd = this._impTestFile.dir;
      this._session.externalCommandsBlockedEnvVars = [BUILD_API_KEY_ENV_VAR];

      this._session.logParser = new LogParser();
      this._session.logParser.buildAPIClient = this._buildAPIClient;
      this._session.logParser.debug = this.debug;

      // set event handlers

      this._session.on('message', (e) => {
        if ('test' === e.type) {
          this._testLine(e.message);
        } else if ('externalCommandOutput' === e.type) {
          console.log(e.message);
        } else if ('testInfo' === e.type) /* this.info() in test cases */ {
          this._testLine(e.message);
        } else {
          this._info(e.message);
        }
      });

      this._session.on('error', (error) => {
        this._onError(error);
        this._session.stop = this._stopSession;
      });

      this._session.on('warning', (error) => {
        this._warning(c.yellow(error instanceof Error ? error.message : error));
      });

      this._session.on('start', () => {
        this._sessionStartWatchdog.stop();
      });

      this._session.on('testMessage', () => {
        this._sessionTestMessagesWatchdog.reset();
      });

      this._session.on('result', () => {
        this._sessionTestMessagesWatchdog.stop();
      });

      this._session.on('done', () => {
        this._sessionStartWatchdog.stop();
        this._sessionTestMessagesWatchdog.stop();
        resolve();
      });

      this._session.run(
        testType,
        deviceId,
        this._impTestFile.values.modelId,
        deviceCode,
        agentCode
      );

    });
  }

  // Handle test error
  // @param {Error|string} error
  // @return {boolean} stop test session?
  // @protected

  _onError(error) {
    this._debug('Error type: ' + error.constructor.name);

    if (error instanceof Session.Errors.TestMethodError) {

      this._testLine(c.red('Failure: ' + error.message));
      this._stopSession = this._impTestFile.values.stopOnFailure;

    } else if (error instanceof Session.Errors.TestStateError) {

      this._error(error);
      this._stopSession = true;

    } else if (error instanceof Session.Errors.SessionFailedError) {

      // do nothing, produced at the end of session anyway

    } else if (error instanceof Session.Errors.DeviceDisconnectedError) {

      this._testLine(c.red(error.message));
      this._stopSession = true;

    } else if (error instanceof Session.Errors.DeviceRuntimeError) {

      this._testLine(c.red(error.message));
      this._stopSession = true;

    } else if (error instanceof Session.Errors.AgentRuntimeError) {

      this._testLine(c.red(error.message));
      this._stopSession = true;

    } else if (error instanceof Session.Errors.DeviceError) {

      this._testLine(c.red(error.message));
      this._stopSession = true;

    } else if (error instanceof Errors.WrongModelError) {

      this._error(error.message);
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof Errors.DevicePowerstateError) {

      this._error(error.message);
      this._stopSession = true;
      this._stopDevice = true;

    } else if (error instanceof Errors.SessionStartTimeoutError) {

      this._error(error.message);
      this._stopSession = true;

    } else if (error instanceof Errors.SesstionTestMessagesTimeoutError) {

      this._error(error.message);

      // tool-side timeouts are longer than test-side, so they
      // indicate for test session to become unresponsive,
      // so it makes sense to stop it
      this._stopSession = true;

    } else if (error instanceof BuildAPIClient.Errors.BuildAPIError) {

      this._error(error.message);
      this._stopSession = true;

    } else if (error instanceof Session.Errors.ExternalCommandTimeoutError) {

      this._error(error.message);
      this._stopSession = true;

    } else if (error instanceof Session.Errors.ExternalCommandExitCodeError) {

      this._error(error.message);
      this._stopSession = true;

    } else if (error instanceof Error) {

      this._error(error.message);
      this._stopSession = true;

    } else {

      this._error(error);
      this._stopSession = true;

    }

    if (this._session) {
      this._session.error = true;
    }

    // abort completely?
    // _stopSession==true means the error is
    // big enough to interrupt the session.
    // in combination w/stopOnFailure it makes sense
    // to abort the entire testing
    if ((this._stopDevice || this._stopSession) && this._impTestFile.values.stopOnFailure) {
      this._stopCommand = true;
    }

    // command has not succeeded
    this._success = false;
  }

  // Log message
  // @param {string} type
  // @param {[*]} params
  // @protected

  _log(type, colorFn, params) {
    let dateMessage = '';

    if (this.logTiming) {
      const now = new Date();
      //dateMessage = dateformat(now, 'HH:MM:ss.l');

      if (this._lastLogDate && this._logStartDate) {
        let dif1 = (now - this._logStartDate) / 1000;
        let dif2 = (now - this._lastLogDate) / 1000;
        dif1 = sprintf('%.2f', dif1);
        dif2 = sprintf('%.2f', dif2);
        dateMessage += '+' + dif1 + '/' + dif2 + 's ';
      } else {
        this._logStartDate = now;
      }

      this._lastLogDate = now;
    }

    // convert params to true array (from arguments)
    params = Array.prototype.slice.call(params);
    params.unshift(colorFn('[' + dateMessage + type + ']'));
    console.log.apply(this, params);
  }

  // Log info message
  // @param {*} ...objects
  // @protected

  _info() {
    this._log('info', c.grey, arguments);
  }

  // Log warning message
  // @param {*} ...objects
  // @protected

  _warning() {
    this._log('warning', c.yellow, arguments);
  }

  // Error message
  // @param {*|Error} error
  // @protected

  _error(error) {
    if (error instanceof Error) {
      error = error.message;
    }

    this._log('error', c.red, [c.red(error)]);
  }

  // Print [test] message
  // @param {*} ...objects
  // @protected

  _testLine() {
    this._log('test', c.grey, arguments);
  }

  // Read source code
  // @return {{agent, device}}
  // @private

  get _sourceCode() {

    if (undefined === this._agentSource || undefined === this._deviceSource) {

      let sourceFilePath;

      if (this._impTestFile.values.agentFile) {
        sourceFilePath = path.resolve(this._impTestFile.dir, this._impTestFile.values.agentFile);

        /* [debug] */
        this._debug(c.blue('Agent source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(c.blue('Using ') + 'agent' + c.blue(' source file: ') + this._impTestFile.values.agentFile);

        // read/process agent source

        if (!fs.existsSync(sourceFilePath)) {
          throw new Error(`Agent source file "${sourceFilePath}" not found`);
        }

        this._agentSource = sourceFilePath.replace(/\\/g, "/");

      } else {
        this._info(c.blue('Have no ') + 'agent' + c.blue(' source file, using blank'));
        this._agentSource = false;
      }

      if (this._impTestFile.values.deviceFile) {
        sourceFilePath = path.resolve(this._impTestFile.dir, this._impTestFile.values.deviceFile);

        this._debug(c.blue('Device source code file path: ') + sourceFilePath);
        this._info(c.blue('Using ') + 'device' + c.blue(' source file: ') + this._impTestFile.values.deviceFile);

        // read/process device source

        if (!fs.existsSync(sourceFilePath)) {
          throw new Error(`Device source file "${sourceFilePath}" not found`);
        }

        this._deviceSource = sourceFilePath.replace(/\\/g, "/");

      } else {
        this._info(c.blue('Have no ') + 'device' + c.blue(' source file, using blank'));
        this._deviceSource = false;
      }

    }

    return {
      agent: this._agentSource,
      device: this._deviceSource
    };
  }

  // Configure and return an instance of Builder
  // @return {Builder}
  // @private

  get _Builder() {
    if (!this.__Builder) {
      this.__Builder = new Builder();
      this.__Builder.logger = {
        debug: function () {},
        info: function () {},
        warning: this._warning,
        error: this._error
      };
      this.__Builder.machine.generateLineControlStatements = true;
    }
    return this.__Builder;
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get logTiming() {
    return this._logTiming;
  }

  set logTiming(value) {
    this._logTiming = value;
  }

  get testFrameworkFile() {
    return this._testFrameworkFile;
  }

  set testFrameworkFile(value) {
    this._testFrameworkFile = value;
  }

  get testCaseFile() {
    return this._testCaseFile;
  }

  set testCaseFile(value) {
    this._testCaseFile = value;
  }

  get startupDelay() {
    return this._startupDelay === undefined ? DEFAULT_STARTUP_DELAY : this._startupDelay;
  }

  set startupDelay(value) {
    this._startupDelay = value;
  }

  get sessionStartTimeout() {
    return this._sessionStartTimeout === undefined ? DEFAULT_STARTUP_TIMEOUT : this._sessionStartTimeout;
  }

  set sessionStartTimeout(value) {
    this._sessionStartTimeout = value;
  }

  get extraTestTimeout() {
    return this._extraTestTimeout === undefined ? DEFAULT_EXTRA_TEST_MESSAGE_TIMEOUT : this._extraTestTimeout;
  }

  set extraTestTimeout(value) {
    this._extraTestTimeout = value;
  }

// </editor-fold>
}

module.exports = TestCommand;
