/**
 * Test for error-before-start behavior
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for error-before-start behavior', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
  });

  it('should run a command with .imptest-stop', (done) => {
    run({
      configPath:  '/fixtures/error-before-start/.imptest',
      sessionStartTimeout: 15
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/warning\] Device is out of memory\n/);
    expect(commandOut).toMatch(/error\] Session startup timeout\n/);
    expect(commandOut).not.toMatch(/test\] Device is out of memory\n/);
    done();
  });

});
