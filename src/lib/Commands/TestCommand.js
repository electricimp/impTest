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

class TestCommand extends AbstractCommand {

  /**
   * @returns {{}}
   */
  get defaultOptions() {
    return {
      debug: false,
      config: '.imptest',
      testFrameworkFile: '', // path to test framework main file
      testCaseFile: null // path to test case file, of empty test cases will be searched automatically
    };
  }

  /**
   * Run command
   */
  run() {
    super.run();
    this._test();
  }

  /**
   * @returns {BuildAPIClient}
   * @private
   */
  _createBuildApiClient() {
    return new BuildAPIClient({
      debug: this._options.debug,
      apiKey: this._config.values.apiKey
    });
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
  _readSoureCode() {
    let sourceFilePath;
    const result = {};

    if (this._config.values.agentFile) {
      sourceFilePath = path.resolve(this._config.dir, this._config.values.agentFile);

      /* [debug] */
      this._debug(colors.blue('Agent source code file path: ') + sourceFilePath);
      /* [info] */
      this._info(colors.blue('Agent source: ')
                 + this._config.values.agentFile);

      result.agent = fs.readFileSync(sourceFilePath, 'utf-8');
    } else {
      result.agent = '';
    }

    if (this._config.values.deviceFile) {
      sourceFilePath = path.resolve(this._config.dir, this._config.values.deviceFile);

      /* [debug] */
      this._debug(colors.blue('Device source code file path: ') + sourceFilePath);
      /* [info] */
      this._info(colors.blue('Device source: ')
                 + this._config.values.deviceFile);

      result.device = fs.readFileSync(sourceFilePath, 'utf-8');
    } else {
      result.device = '';
    }

    return result;
  }

  /**
   * Read framework code
   * @return {string}
   * @private
   */
  _readFramework() {
    return (new Bundler({debug: this._options.debug}))
      .process(this._options.testFrameworkFile);
  }

  /**
   * Run tests
   * @return {Promise}
   * @private
   */
  _test() {

    /* [blank] */
    console.log('');

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

    // read source code
    this._sourceCode = this._readSoureCode();

    // run framework code
    this._frameworkCode = this._readFramework();

    // run test files

    let i = 0;

    return promiseWhile(
      () => {
        return i++ < testFiles.length;
      },
      () => {
        /* [blank] */
        console.log('');
        return this._runTestFile(testFiles[i - 1]);
      }
    );
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

    const bootstrapCode = '// run tests\n' +
                          't <- ImpUnitRunner();\n' +
                          't.timeout = ' + parseFloat(this._config.values.timeout) + ';\n' +
                          't.readableOutput = false;\n' +
                          't.stopOnFailure = ' + !!this._config.values.stopOnFailure + ';\n' +
                          't.run();';

    let agentCode, deviceCode;

    if ('agent' === file.type) {
      agentCode = this._frameworkCode + '\n\n' +
                  this._sourceCode.agent + '\n\n' +
                  fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                  bootstrapCode;
      deviceCode = this._sourceCode.device;
    } else {
      deviceCode = this._frameworkCode + '\n\n' +
                   this._sourceCode.device + '\n\n' +
                   fs.readFileSync(file.path, 'utf-8') + '\n\n' +
                   bootstrapCode;
      agentCode = this._sourceCode.agent;
    }

    /* [info] */
    this._info(colors.blue('Agent code size: ') + agentCode.length + ' bytes');
    /* [info] */
    this._info(colors.blue('Device code size: ') + deviceCode.length + ' bytes');

    return this._executeTest(deviceCode, agentCode, file.type);
  }

  /**
   * Execute test via BuildAPI
   *
   * @param {string} deviceCode
   * @param {string} agentCode
   * @param {"agent"|"device"} type
   * @return {Promise}
   * @private
   */
  _executeTest(deviceCode, agentCode, type) {
    // run tests

    this._client = this._createBuildApiClient();
    this._logs = {/* ts: message */};

    return this._client.createRevision(this._config.values.modelId, deviceCode, agentCode)

      .then((body) => {
        this._revision = body.revision;
        /* [info] */
        this._info(colors.blue('Created revision: ') + this._revision.version);
        return this._client.restartModel(this._config.values.modelId);
      })

      .then(() => {
        // get logs since current revision was created
        return this._client.getDeviceLogs(this._config.values.devices[0], this._revision.created_at);
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
   * Read logs
   * @private
   */

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

    return this._client.streamDeviceLogs(deviceId, since, function (data) {

      data = JSON.parse(data.toString());

      for (let log of data.logs) {
        console.log(colors.magenta(JSON.stringify(log)));
      }

      return true;
    });

    this._client.getDeviceLogs(deviceId, since).then((res) => {


      let log;
      let logs = res.logs;

      logs = logs.sort((a, b) => b.timestamp === a.timestamp ? 0 : (b.timestamp < a.timestamp ? -1 : 1));

      while (log = logs.pop()) {
        since = log.timestamp;
        console.log(colors.cyan(JSON.stringify(log)));
      }

      setTimeout(() => {
        this._readLogs(testType, deviceId, since);
      }, 1000);

      console.log('==');

      //console.log(colors.yellow(JSON.stringify(res)));
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
        this._testPrint(colors.blue('Setting up ') + line.message.replace(/::.*$/, ''));
      } else if (line.message.indexOf('::tearDown()') !== -1) {
        this._testPrint(colors.blue('Tearing down ') + line.message.replace(/::.*$/, ''));
      } else {
        this._testPrint(line.message);
      }
    }
  }

  /**
   * Print [test] message
   * @param {*} ...objects
   * @protected
   */
  _testPrint() {
    this._log('test', colors.grey, arguments);
  }
}

module.exports = TestCommand;
