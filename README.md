<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [impTest – Electric Imp Test Runner](#imptest-%E2%80%93-electric-imp-test-runner)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [imptest commands](#imptest-commands)
    - [init](#init)
    - [test](#test)
  - [.imptest file specification](#imptest-file-specification)
  - [Development](#development)
    - [Installation](#installation-1)
    - [Testing](#testing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# impTest – Electric Imp Test Runner

## Requirements

|Dependency|OS X Installation|
|:--|:--|
|Node.js 5.1+|`brew install nodejs`|

## Installation

_(not published yet)_

`npm install -g imptest`

## imptest commands

### init

```
imptest init [options]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
  -f, --force          overwrite existing configuration
```

### test

```
imptest test [options]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
  -a, --agent [bool]   push agent code [default: true]
  -i, --imp [bool]     push device code [default: true]
```

## Writing tests

impTest looks for classes inherited from the  `ImpTestCase` class and treats them as a test cases.
Methods named as __test...__ are considered as test methods.

Here is a sample test case:

```squirrel
class TestCase1 extends ImpTestCase {

  /**
   * (optional) Async version, can also be synchronous
   */
  function setUp() {
    return Promise(function (resolve, reject){
      resolve("we're ready");
    }.bindenv(this));
  }

  /**
   * Sync test method
   */
  function testSomethingSync() {
     this.assert(true); // ok
     this.assert(false); // fails
  }

  /**
   * Async test method
   */
   </ timeout = 3 />
  function testSomethingAsync() {
    return Promise(function (resolve, reject){

      // return in 2 seconds
      imp.wakeup(2 /* 2 seconds */, function () {
        resolve("something useful");
      }.bindenv(this));

    }.bindenv(this));
  }

  /**
   * (optional) Teardown method - cleans up after the test
   */
  function tearDown() {
  }

}
```

### Test case lifecycle: setUp() and tearDown() methods

Each test case has __setUp()__ and __tearDown()__ methods for instantiating the environment and cleaning-up afterwards.

### Asynchronous methods

Every test method (__setUp()__ and __tearDown()__ included) can either be synchronous or asynchronous.
In order for method to be asynchronous it should return an instance of __Promise__, like that:

```squirrel
function testSomethingAsyncronously() {
  return Promise(function (resolve, reject){
    resolve("we're done");
  });
}
```

### Assertions

Currently the following assertions available:

* this.assert();

## .imptest file specification

__.imptest__ file is used to deploy tests to a certain device/model.

```json
{
    "apiKey": "{string} Build API key",
    "modelId": "{string} Model ID",
    "devices": [
        "{string} Electric Imp module ID #1 to run on",
        "{string} Electric Imp module ID #2 to run on"
    ],
    "deviceFile": "{string} Device code, default: device.nut",
    "agentFile": "{string} Agent code, default: agent.nut",
    "testFiles": "{string} test file search pattern, default: *.test.nut"
}
```

## Development

### Installation

```bash
git clone <repo-url-goes-here> imptest
cd imptest
npm i
```

### Testing

Copy __spec/config.js.dist__ to __config.js__ and fill-in the neccesary settings, then:

```bash
SPEC_DEBUG=<true|false> npm test
```
