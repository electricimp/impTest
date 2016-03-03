'use strict';

const c = require('colors');
const packageJson = require('../../package.json');
const TestCommand = require('../../src/lib/Commands/TestCommand');
const interceptStdout = require('intercept-stdout');

describe('TestCommand test suite for agent-only scenario', () => {
  let out = '';

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    // create command
    const command = new TestCommand();
    command.version = packageJson.version;
    command.debug = false;
    command.testFrameworkFile = __dirname + '/../../src/impUnit/index.nut';
    // todo: update device/model from tests config or use single config
    command.configPath = __dirname + '/fixtures/agent-only/.imptest';
    command.testCaseFile = __dirname + '/fixtures/agent-only/tests/agent.test.nut';

    console.log(c.inverse('======== command start ========'));
    const finishMsg = () => console.log(c.inverse('========= command end ========='));
    const unHook = interceptStdout(txt => { out += txt; });

    command.run()
      .then(unHook)
      .then(finishMsg, finishMsg)
      .then(done, done);
  });

  it('should do something', (done) => {
    // todo: insert checks here
    done();
  });
});
