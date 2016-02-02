/**
 * Test command
 */

'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var colors = require('colors');
var AbstractCommand = require('./AbstractCommand');
var BuildAPIClient = require('../BuildAPIClient');
var Bundler = require('../Bundler');
var promiseWhile = require('../utils/promiseWhile');
var md5 = require('md5');

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      testFrameworkFile: '', // path to test framework main file
      testCaseFile: null, // path to test case file, of empty test cases will be searched automatically
      startTimeout: 1 // [s]
    };
  }

  /**
   * Run command
   * @return {Promise}
   * @private
   */
  run() {

    super.run();

    /* [blank] */
    this._blankLine();

    // find test case files
    const testFiles = this._findTestFiles();

    /* [debug] */
    this._debug(colors.blue('Test files found:'), testFiles);

    /* [info] */
    this._info(colors.blue('Found ') +
               testFiles.length +
               colors.blue(' test file' +
               (testFiles.length === 1 ? '' : 's')) + ': '
               + testFiles.map(e => e.name).join(', ')
    );

    // run test files

    let i = 0;

    return promiseWhile(
      () => i++ < testFiles.length,
      () => {
        /* [blank] */
        this._blankLine();
        return this._runTestFile(testFiles[i - 1]);
      }
    );
  }

  /**
   * @return {BuildAPIClient}
   * @private
   */
  _getBuildApiClient() {
    if (!this._client) {
      this._client = new BuildAPIClient({
        debug: this._options.debug,
        apiKey: this._config.values.apiKey
      });
    }

    return this._client;
  }

  /**
   * Find test files
   * @returns {[{name, path, type}]}
   * @private
   */
  _findTestFiles() {
    const files = [];
    let configCwd;

    const pushFile = file => {
      files.push({
        name: file,
        path: path.resolve(configCwd, file),
        type: /\bagent\b/i.test(file) ? 'agent' : 'device'
      });
    };

    if (this._options.testCaseFile) {
      // test file is passed via cli

      // look in the current path
      configCwd = path.resolve('.');

      if (!fs.existsSync(this._options.testCaseFile)) {
        throw new Error('File "' + this._options.testCaseFile + '" not found');
      }

      pushFile(this._options.testCaseFile);

    } else {
      // look through .imptest.tests glob(s)

      // look in config file directory
      configCwd = this._config.dir;

      let searchPatterns = this._config.values.tests;

      if (typeof searchPatterns === 'string') {
        searchPatterns = [searchPatterns];
      }

      for (const searchPattern of searchPatterns) {
        for (const file of glob.sync(searchPattern, {cwd: configCwd})) {
          pushFile(file);
        }
      }
    }

    return files;
  }

  /**
   * Read source code
   * @return {{agent, device}}
   * @private
   */
  _getSourceCode() {

    if (!this._agentSource || !this._deviceSource) {

      let sourceFilePath;

      if (this._config.values.agentFile) {
        sourceFilePath = path.resolve(this._config.dir, this._config.values.agentFile);

        /* [debug] */
        this._debug(colors.blue('Agent source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(colors.blue('Agent source: ')
                   + this._config.values.agentFile);

        this._agentSource = fs.readFileSync(sourceFilePath, 'utf-8');
      } else {
        this._agentSource = '/* no agent source provided */';
      }

      if (this._config.values.deviceFile) {
        sourceFilePath = path.resolve(this._config.dir, this._config.values.deviceFile);

        /* [debug] */
        this._debug(colors.blue('Device source code file path: ') + sourceFilePath);
        /* [info] */
        this._info(colors.blue('Device source: ')
                   + this._config.values.deviceFile);

        this._deviceSource = fs.readFileSync(sourceFilePath, 'utf-8');
      } else {
        this._deviceSource = '/* no device source provided */';;
      }

    }

    return {
      agent: this._agentSource,
      device: this._deviceSource
    };
  }

  /**
   * Read framework code
   * @return {string}
   * @private
   */
  _getFrameworkCode() {
    if (!this._frameworkCode) {
      this._frameworkCode = (new Bundler({debug: this._options.debug}))
        .process(this._options.testFrameworkFile);
    }

    return this._frameworkCode;
  }

  /**
   * Run test file
   * @param {name, path, type} file
   * @returns {Promise}
   * @private
   */
  _runTestFile(file) {
    /* [info] */
    this._info(colors.blue('Running ') + file.type + colors.blue(' test file ') + file.name);

    // create complete codebase

    // test session id, unique per every test file run
    this._testSessionId = md5(Math.random().toString());

    // bootstrap code
    const bootstrapCode =
      `
// run tests
imp.wakeup(${this._options.startTimeout /* prevent log sessions mixing */}, function() {
  local t = ImpUnitRunner();
  t.readableOutput = false;
  t.sessionId = "${this._testSessionId}";
  t.timeout = ${parseFloat(this._config.values.timeout)};
  t.stopOnFailure = ${!!this._config.values.stopOnFailure};
  // poehali!
  t.run();
});
`;

    let agentCode, deviceCode;

    if ('agent' === file.type) {
      agentCode = this._getFrameworkCode() + '\n\n' +
                  this._getSourceCode().agent + '\n\n' +
                  fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                  bootstrapCode;
      deviceCode = this._getSourceCode().device;
    } else {
      deviceCode = this._getFrameworkCode() + '\n\n' +
                   this._getSourceCode().device + '\n\n' +
                   fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                   bootstrapCode;
      agentCode = this._getSourceCode().agent;
    }

    /* [info] */
    this._info(colors.blue('Agent code size: ') + agentCode.length + ' bytes');
    /* [info] */
    this._info(colors.blue('Device code size: ') + deviceCode.length + ' bytes');

    return this._runTestSession(deviceCode, agentCode, file.type);
  }

  /**
   * Execute test via BuildAPI from prepared code
   *
   * @param {string} deviceCode
   * @param {string} agentCode
   * @param {"agent"|"device"} type
   * @return {Promise}
   * @private
   */
  _runTestSession(deviceCode, agentCode, type) {

    const client = this._getBuildApiClient();

    return client.createRevision(this._config.values.modelId, deviceCode, agentCode)

      .then((body) => {
        this._revision = body.revision;
        /* [info] */
        this._info(colors.blue('Created revision: ') + this._revision.version);
        return client.restartModel(this._config.values.modelId);
      })

      .then(() => {
        // get logs since current revision was created
        return client.getDeviceLogs(this._config.values.devices[0], this._revision.created_at);
      })

      // now read logs
      .then(() => {
        return this._readLogs(type, this._config.values.devices[0], this._revision.created_at);
      })

      .catch((error) => {
        this._error(error.message);
      });
  }

  /**
   * Read device logs
   *
   * @param {"agent"|"device"} testType
   * @param {string} deviceId
   * @param {string} since
   * @returns {Promise}
   *
   * @private
   */
  _readLogs(testType, deviceId, since) {
    return this._getBuildApiClient().streamDeviceLogs(deviceId, since, function (data) {

      for (const log of data.logs) {
        console.log(colors.magenta(JSON.stringify(log)));
      }

      return true; // continue
    });
  }

  /**
   * Prints log message
   * @param line
   * @private
   */
  _printLogLine(line) {
    if (line.type === 'STATUS') {
      if (line.message.indexOf('::setUp()') !== -1) {
        this._testLine(colors.blue('Setting up ') + line.message.replace(/::.*$/, ''));
      } else if (line.message.indexOf('::tearDown()') !== -1) {
        this._testLine(colors.blue('Tearing down ') + line.message.replace(/::.*$/, ''));
      } else {
        this._testLine(line.message);
      }
    }
  }

  /**
   * Print [test] message
   * @param {*} ...objects
   * @protected
   */
  _testLine() {
    this._log('test', colors.grey, arguments);
  }

  /**
   * Print blank line
   * @private
   */
  _blankLine() {
    console.log(colors.gray('........................'));
  }
}

module.exports = TestCommand;
