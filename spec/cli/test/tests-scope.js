/**
 * Agent-only tests
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for tests-scope scenario', () => {
  let out = '';
  let success = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    run({
      configPath:  '/fixtures/tests-scope/.imptest'
    }).then((res) => {
      success = res.success;
      out = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    expect(success).toBe(true);
    expect(out).not.toBeEmptyString();
    done();
  });
});
