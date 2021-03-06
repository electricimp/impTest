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

// Builder syntax tests

'use strict';

require('jasmine-expect');
const fs = require('fs');
const run = require('./run');

describe('TestCommand test suite for Builder cache scenario', () => {
  let commandOut = '',
    commandSuccess = true;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  // reset previous state
  var removeCacheDir = function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file, index){
        var cachedLib = path + "/" + file;
        if (fs.lstatSync(cachedLib).isDirectory()) { // unexpected case
          removeCacheDir(cachedLib);
        } else // remove lib
          fs.unlinkSync(cachedLib);
      });
      fs.rmdirSync(path);
    }
  };
  removeCacheDir(".builder-cache");

  it('should run a command without cache option in the project config', (done) => {
    run({
      configPath:  '/fixtures/builder-cache/.imptest',
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify that there is no cache folder', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(true);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Testing succeeded\n/);
    expect(fs.existsSync(".builder-cache")).toBe(false);
    done();
  });

  it('should run a command to check that command line cache option has a higher priority than project config', (done) => {
    run({
      configPath:  '/fixtures/builder-cache/.imptest_cache_true',
      builderCache: false,
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify that there is no cache folder', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(true);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Testing succeeded\n/);
    expect(fs.existsSync(".builder-cache")).toBe(false);
    done();
  });

  it('should run a command with cache enabled', (done) => {
    run({
      configPath:  '/fixtures/builder-cache/.imptest_cache_false',
      builderCache: true,
    }).then((res) => {
      commandSuccess = res.success;
      commandOut = res.out;
      done();
    });
  });

  it('should verify that cache folder present', (done) => {
    // todo: insert more checks here
    expect(commandSuccess).toBe(true);
    expect(commandOut).not.toBeEmptyString();
    expect(commandOut).toMatch(/Testing succeeded\n/);
    expect(fs.existsSync(".builder-cache")).toBe(true);
    done();
  });

  removeCacheDir(".builder-cache");
});
