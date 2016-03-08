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

  it('should run a command with .imptest-exit-code', (done) => {
    run({
      configPath:  '/fixtures/external-command/.imptest-exit-code'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output from .imptest-exit-code', (done) => {
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/\> external command output/);
    expect(commandOut).toMatch(/External command failed with exit code 125/);
    done();
  });

  it('should run a command with .imptest-timeout', (done) => {
    run({
      configPath:  '/fixtures/external-command/.imptest-timeout'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output from .imptest-timeout', (done) => {
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).not.toMatch(/\> external command output/);
    expect(commandOut).toMatch(/External command timed out/);
    done();
  });
});
