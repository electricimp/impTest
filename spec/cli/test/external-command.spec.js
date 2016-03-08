/**
 * Test external commands
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for external-command scenario', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    run({
      configPath:  '/fixtures/external-command/.imptest',
      testCaseFile:  '/fixtures/external-command/tests/device.test.nut'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    expect(commandSuccess).toBe(true);
    expect(commandOut).not.toBeEmptyString();
    done();
  });
});
