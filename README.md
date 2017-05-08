# impTest

**impTest** is a set of tools to run unit tests built with 
[impUnit](https://github.com/electricimp/impUnit) test framework. *impTest* leverages
[Electric Imp Build API](https://electricimp.com/docs/buildapi/) to deploy and run the code
on imp devices. All the the tools are written in [Node.js](https://nodejs.org/en/) and are fully 
available in sources.

- [Installation](#installation)
- [Test Project Configuration](#test-project-configuration)
  - [New Project Configuration](#new-project-configuration)
  - [Sample Test Generation](#sample-test-generation)
  - [GitHub Credentials Configuration](#github-credentials-configuration)
  - [Environment Variables Settings](#environment-variables-settings)
- [Writing Tests](#writing-tests)
  - [Agent Code And Device Code Together](#agent-code-and-device-code-together)
  - [Test Case Lifecycle: setUp() and tearDown()](#test-case-lifecycle-setup-and-teardown)
  - [Asynchronous Testing](#asynchronous-testing)
  - [Builder Language](#builder-language)
    - [Include From GitHub](#include-from-github)
  - [External Commands](#external-commands)
  - [Assertions](#assertions)
    - [assertTrue()](#asserttrue)
    - [assertEqual()](#assertequal)
    - [assertGreater()](#assertgreater)
    - [assertLess()](#assertless)
    - [assertClose()](#assertclose)
    - [assertDeepEqual()](#assertdeepequal)
    - [assertBetween()](#assertbetween)
    - [assertThrowsError](#assertthrowserror)
  - [Diagnostic Messages](#diagnostic-messages)
  - [Test Case Example](#test-case-example)
- [Running Tests](#running-tests)
  - [Selective Test Runs](#selective-test-runs)
- [For impTest Developers](#for-imptest-developers)
  - [Installation](#installation-1)
  - [Running impTest Under Development](#running-imptest-under-development)
  - [Testing impTest](#testing-imptest)
- [License](#license)

## Installation

`npm i -g imptest`

[Node.js 4.0+](https://nodejs.org/en/) is required.

## Test Project Configuration

### New Project Configuration

A file is used to configure tests execution. Configuration file can be generated with command *imptest init*. 
The command can also be used to update existing configuration.

```
imptest init [options]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
  -f, --force          overwrite existing configuration
```

The configuration file may be prepared manually. The file syntax is:

```js
{
    "apiKey":         {string},           // Build API key, optional
    "modelId":        {string},           // Model id
    "devices":        {string[]},         // Device IDs
    "deviceFile":     {string|false},     // Device code file. Default: "device.nut"
    "agentFile":      {string|false},     // Agent code file. Default: "agent.nut"
    "tests":          {string|string[]},  // Test file search pattern. Default: ["*.test.nut", "tests/**/*.test.nut"]
    "stopOnFailure":  {boolean},          // Stop tests execution on failure? Default: false
    "timeout":        {number}            // Async test methods timeout, seconds. Default: 10
}
```

__timeout__ parameter sets the timeout after which the tests will fail. Async tests will be interrupted

### Sample Test Generation

The command *imptest init* can generate sample test cases. Device code file or/and Agent code file should be specified to activate the generation.
_tests/agent.test.nut_ file will be generated if 'agentFile' is defined.
_tests/device.test.nut_ file will be generated if 'deviceFile' is defined.

Example of console log:
```
> Write to .imptest?: (yes)
Config file saved
> Generate sample test cases?: (yes)
Created file "tests/agent.test.nut"
Created file "tests/device.test.nut"
```

### GitHub Credentials Configuration

The command *imptest github* generates or updates GitHub credentials config file. 
The credentials will be used to include external sources [from GitHub](#include-from-github)


```
imptest github [options]

Options:

  -d, --debug          debug output
  -c, --config [path]  github credentials config file path [default: .imptest-auth]
  -f, --force          overwrite existing configuration
```

### Environment Variables Settings

Environment variables are used in place of missing keys:
- **apiKey** – `IMP_BUILD_API_KEY` is used in [Electric Imp Build API](https://electricimp.com/docs/buildapi/) to deploy and run the code on imp devices.
- **github-user** – `GITHUB_USER` is used to include external sources [from GitHub](#include-from-github).
- **github-token** – `GITHUB_TOKEN` is used to include external sources [from GitHub](#include-from-github).

## Writing Tests

`impTest` uses a [pattern](#test-configuration) to search files with Test classes.
The [pattern](#test-configuration) can be defined in the `impTest` configuration file.
After that `impTest` looks for classes inherited from the `ImpTestCase` and treats them as test cases.
Methods named as _test..._ are considered to be the test methods, or, simply _tests_.

The simplest test case looks like:

```squirrel
class MyTestCase extends ImpTestCase {
  function testSomething() {
    this.assertTrue(true);
  }
}
```

### Agent Code And Device Code Together

It is possible to use agent and device specific test code together. The rules for the using are:
- The test's implementation should be either in device code nor agent, not in both. Let's name the file with test's implementation as *TestFile*, another file will have name - *PartnerFile*
- *TestFile* and *PartnerFile* names should conform the pattern ```[TestName].[agent | device].test.nut```.
- *TestFile* and *PartnerFile* should be in the same folder(directory).
- *TestFile* **should** be found by "Test file search pattern" (in the imptest [configuration](#test-project-configuration)).
- *PartnerFile* **should not** be found by "Test file search pattern" (in the imptest [configuration](#test-project-configuration)). Otherwise the *PartnerFile* will be in `TestFile` role and the *TestFile* becomes to be in `PartnerFile` role. impTest doesn't add `ImpTestCase` class to the partner code. As a result an execution will fail.

An example of agent and device using can be found in [sample7](./samples/sample7).

### Test Case Lifecycle: setUp() and tearDown()

Each test case can have __setUp()__ and __tearDown()__ methods for instantiating the environment and cleaning-up afterwards.

### Asynchronous Testing

Every test method (as well as __setUp()__ and __tearDown()__) can either be synchronous or asynchronous.

Method should return the instance of [__Promise__](https://github.com/electricimp/Promise) to notify that it needs to do some work asynchronously.

The resolution means test all test were successful, rejection denotes a failure.

For example:

```squirrel
function testSomethingAsyncronously() {
  return Promise(function (resolve, reject){
    resolve("'s all good, man!");
  });
}
```

### Builder Language

A Builder language is supported in impTest. The Builder language combines a preprocessor with an expression language and advanced imports.
Builder language syntax is [here](https://github.com/electricimp/Builder). 

```squirrel
@set assertText = "Failed to assert that values are"

this.assertEqual(
  expected,
  actual,
    "@{assertText}"
    + " equal in '@{__FILE__}'"
    + " at line @{__LINE__}"
);
```

*\_\_FILE\_\_* and *\_\_LINE\_\_* variables are defined in the [builder](https://github.com/electricimp/Builder), 
which may be useful for debugging information. Here is the usage example:

```squirrel
this.assertEqual(
  expected,
  actual,
  "Failed to assert that values are"
    + " equal in '@{__FILE__}'"
    + " at line @{__LINE__}"
);
```

#### Include From GitHub

An include external sources [from GitHub](https://github.com/electricimp/Builder#from-github) can be used in test files. So it may be needed to have a credentials to obtain an access to GitHub. Exists two ways to provide GitHub credentials:
The first way is to use an [Environment Variables](#environment-variables-settings).
The second way is to provide [GitHub credentials file](#github-credentials-configuration).

### External Commands

External commands can be triggered by test case like so:

```squirrel
// within the test case/method
this.runCommand("echo 123");
```

The command `echo 123` then will be executed by impTest.

If external command times out (the time it's given is controlled by the _timeout_ parameter in [test configuration](#test-project-configuration)) or exits with status code other than 0, the test session fails.

### Assertions

The following assertions are available in test cases.

#### assertTrue()

`this.assertTrue(condition, [message])`

Asserts that the condition is truthful.

example:

```squirrel
 // ok
this.assertTrue(1 == 1);

// fails
this.assertTrue(1 == 2);
```

#### assertEqual()

`this.assertEqual(expected, actual, [message])`

Asserts that two values are equal

example:

```squirrel
// ok
this.assertEqual(1000 * 0.01, 100 * 0.1);

// Failure: Expected value: 1, got: 2
this.assertEqual(1, 2);
```

#### assertGreater()

`this.assertGreater(actual, cmp, [message])`

Asserts that value is greater than some other value.

example:

```squirrel
// ok
this.assertGreater(1, 0);

// Failure: Failed to assert that 1 > 2
this.assertGreater(1, 2);
```

#### assertLess()

`this.assertLess(actual, cmp, [message])`

Asserts that value is less than some other value.

example:

```squirrel
// ok
this.assertLess(0, 1);

// Failure: Failed to assert that 2 < 2
this.assertLess(2, 2);
```

#### assertClose()

`this.assertClose(expected, actual, maxDiff, [message])`

Asserts that value is within some tolerance from expected value.

example:

```squirrel
// ok
this.assertClose(10, 9, 2);

// Failure: Expected value: 10пїЅ0.5, got: 9
this.assertClose(10, 9, 0.5);
```

#### assertDeepEqual()

`this.assertDeepEqual(expected, actual, [message])`

Performs a deep comparison of tables, arrays and classes.

example:

```squirrel
// ok
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "b" : 0 }});

// Failure: Missing slot [a.b] in actual value
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "_b" : 0 }});

// Failure: Extra slot [a.c] in actual value
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "b" : 1, "c": 2 }});

// Failure: At [a.b]: expected "1", got "0"
this.assertDeepEqual({"a" : { "b" : 1 }}, {"a" : { "b" : 0 }});
```

#### assertBetween()

`this.assertBetween(actual, from, to, [message])`

Asserts that a value belongs to the range from _from_ to _to_.

example:

```squirrel
// ok
this.assertBetween(10, 9, 11);

// Failure: Expected value in the range of 11..12, got 10
this.assertBetween(10, 11, 12);
```

#### assertThrowsError

`this.assertThrowsError(func, ctx, [args = []], [message])`

Asserts that function _func_ throws an error when called with arguments _args_ and context _ctx_. Returns error thrown by _func_.

```squirrel
// ok, returns "abc"
this.assertThrowsError(function (a) {
  throw a;
}, this, ["abc"]);

// Failure: Function was expected to throw an error
this.assertThrowsError(function () {
  // throw "error";
}, this);
```

### Diagnostic Messages

Return values (other than *null*) are displayed in the console when test succeeds and can be used to output diagnostic messages, like:

<img src="./docs/diagnostic-messages.png" width=497>

Test cases can also output informational messages with:

```squirrel
this.info(<message>)
```

### Test Case Example

utility file myFile.nut code is:
```squirrel

  // (optional) Async version, can also be synchronous

  function setUp() {
    return Promise(function (resolve, reject){
      resolve("we're ready");
    }.bindenv(this));
  }
```

test file code is:
```squirrel
class TestCase1 extends ImpTestCase {

@include __PATH__+"/myFile.nut"

  // Sync test method

  function testSomethingSync() {
     this.assertTrue(true); // ok
     this.assertTrue(false); // fails
  }


  // Async test method

  function testSomethingAsync() {
    return Promise(function (resolve, reject){

      // return in 2 seconds
      imp.wakeup(2 /* 2 seconds */, function () {
        resolve("something useful");
      }.bindenv(this));

    }.bindenv(this));
  }

  // (optional) Teardown method - cleans up after the test

  function tearDown() {
  }

}
```

## Running Tests

To run tests *imptest test* command is used. __.imptest__ file is a default configuration file for tests execution.

```
imptest test [options] [testcase_pattern]

Options:

  -d,  --debug                debug output
  -g,  --github-config [path] github credentials config file path [default: .imptest-auth]
  -c,  --config [path]        config file path [default: .imptest]
```

### Selective Test Runs

`testcase_pattern` specifies the test case to be executed. The syntax is: `[testClass].[testMethod]`
Where `testClass` is the name of the test class, `testMethod` is the test method in a test class. So `testcase_pattern` allows to execute single test case (methods named as _test..._).

Using of *testcase_pattern*:

Let test file is:
```
class MyTestClass extends ImpTestCase {
    function testMe() {...}
    function testMe_1() {...}
}
class MyTestClass_1 extends ImpTestCase {
    function testMe() {...}
    function testMe_1() {...}
}
```

- `imptest test MyTestClass.testMe` runs `testMe()` method in `MyTestClass` class
- `imptest test MyTestClass_1.` runs all test methods from `MyTestClass_1` class
- `imptest test .testMe_1` runs *testMe_1()* methods in the both classes
- `imptest test .` is the same as `imptest test`, which makes all test method in all the found test classes to be run

## For impTest Developers

### Installation

```bash
git clone <repo-url-goes-here> imptest
cd imptest
npm i
```

### Running impTest Under Development

```bash
src/cli/imptest.js <command> [options] [arguments]
```

eg:

```bash
src/cli/imptest.js test -c samples/sample1/.imptest
```

### Testing impTest

Jasmine test suite is included with the project.

The following environment variables need to be set before spec run: 

- SPEC_DEBUG {true|false} – Enables/disables debug output
- SPEC_MODEL_ID – Model Id to use for tests
- SPEC_DEVICE_ID/SPEC_DEVICE_IDS – Device Id/Ids (comma-separated) to use for tests

Then `npm test`.

On *WIN OS* you have to correct _package.json_ file, line `    "test": "node_modules/jasmine/bin/jasmine.js"` have to be replaced with `    "test": "node node_modules/jasmine/bin/jasmine.js"`.

For example:

```bash
SPEC_DEBUG=false SPEC_MODEL_ID=Lu55555OJHZT SPEC_DEVICE_IDS=237d555558a609ee npm test
```

## License

The code in this repository is licensed under [MIT License](./LICENSE).
