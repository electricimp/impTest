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
 * Test for build-api-error behavior
 */

'use strict';

require('jasmine-expect');
const run = require('./run');

describe('TestCommand test suite for build-api-error behavior', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  it('should run a command', (done) => {
    run({
      configPath:  '/fixtures/build-api-error/.imptest'
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify the output', (done) => {
    expect(commandSuccess).toBe(false);
    expect(commandOut).not.toBeEmptyString();

    // verify that "CompileFailed" error occured
    expect(commandOut).toMatch(/CompileFailed/);

    // verify that 2 sessions started
    // which means that BuilAPI error has not stopped the command
    expect(commandOut).toMatch(/Using device test file tests\/1\-device\.test\.nut\n/);
    expect(commandOut).toMatch(/Using device test file tests\/2\-device\.test\.nut\n/);

    done();
  });
});
