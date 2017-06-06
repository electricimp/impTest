# impTest

**impTest** is a set of tools intended to run unit tests that are built with the
[impUnit](https://github.com/electricimp/impUnit) test framework.

- [Overview](#overview)
- [Installation](#installation)
- [Test Project Configuration](#test-project-configuration)
  - [Project Configuration Generation](#project-configuration-generation)
  - [GitHub Credentials Configuration](#github-credentials-configuration)
  - [Environment Variables Settings](#environment-variables-settings)
- [Writing Tests](#writing-tests)
  - [Tests for bidirectional Device-Agent Communication](#tests-for-bidirectional-device-agent-communication)
  - [Asynchronous Testing](#asynchronous-testing)
  - [Builder Language](#builder-language)
  - [External Commands](#external-commands)
  - [Assertions](#assertions)
  - [Diagnostic Messages](#diagnostic-messages)
  - [Test Case Example](#test-case-example)
- [Running Tests](#running-tests)
  - [Selective Test Runs](#selective-test-runs)
  - [Debug Mode](#debug-mode)
- [For impTest Tools Developers](#for-imptest-tools-developers)
- [License](#license)

## Overview

**impTest** is a set of tools intended to run unit tests that are built with the
[impUnit](https://github.com/electricimp/impUnit) test framework. **impTest** leverages
[Electric Imp Build API](https://electricimp.com/docs/buildapi/) to deploy and run the code
on imp devices. All tools are written in [Node.js](https://nodejs.org/en/) and are fully
available in sources.

**Test Project** - is a directory (with all subdirectories) where the tests are located.

There is one **Test Project Configuration** per one Test Project. **Test Project Configuration** contains all settings related to all tests of the corresponding Test Project.

**Project Home** - is a directory where Test Project Configuration is located.

All files located in Project Home (and in its subdirectories) are considered as files with Test Cases if their names match the patterns specified in [Test Project Configuration](#test-project-configuration).

**Test Case** - is a class inherited from the `ImpTestCase` class. There can be several Test Cases (classes) in a file.

**Test** - is a method which name starts with `test` (e.g., *testEverythingOk()*). A Test Case (class) can contain several tests (methods).

In order to work with impTest you need to:
- [Install](#installation) impTest
- [Create or Update Test Project Configuration](#test-project-configuration)
- [Write or Update Tests](#writing-tests)
- [Run Tests](#running-tests)

If you want to update impTest itself, see [For **impTest** Tools Developers](./docs/forImptestToolsDevelopers.md).

## Installation

[Node.js 4.0+](https://nodejs.org/en/) is required.
You can download the Node.js [pre-built binary](https://nodejs.org/en/download/) for your platform or install Node.js via [package manager](https://nodejs.org/en/download/package-manager).
Once `node` and `npm` are installed, you must execute the following command to set up **impTest**:

`npm i -g imptest`


## Test Project Configuration

A configuration file is a JSON file that contains the following settings:

| Key | Description |
| --- | --- |
| __apiKey__ | [Build API key](https://electricimp.com/docs/ideuserguide/account) provides access to [Electric Imp Build API](https://electricimp.com/docs/buildapi/). For security reasons we strongly recommend to define the Build API key as [environment variables](#environment-variables-settings). |
| __devices__ | A set of Device IDs that specify the devices that must be used for tests execution. |
| __modelId__ | A Model Id that is attached to the devices. |
| __deviceFile__ | A path to the source code file of an additional device. This code must be deployed on an imp device as part of every Test Case. `false` is used if no additional code is needed. |
| __agentFile__ | A path to the source code file of an additional agent. This code must be deployed on an imp agent as part of every Test Case. `false` is used if no additional code is needed. |
| __tests__ | A set of patterns that impTest uses to search for files with Test Cases. If `**` is alone in the path portion, then it matches zero or more directories and subdirectories that need to be searched. It does not crawl symlinked directories. The pattern default value is `["*.test.nut", "tests/**/*.test.nut"]`. Do not change this value if there is a plan to run [agent and device test code together](#tests-for-bidirectional-device-agent-communication) |
| __stopOnFailure__ | Set this option to `true` if you want to stop an execution after a test failure. The default value is `false`. |
| __timeout__ | A timeout period (in seconds) after which the tests are considered as failed. Async tests to be interrupted. Default value: 10 sec. |

Format of the configuration file (the settings can be listed in an arbitrary order):

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

### Project Configuration Generation

Test Project Configuration file can be created or updated by the following command:

`imptest init [-c <configuration_file>] [-d] [-f]`

where:

* `-d` &mdash; prints the debug output
* `-c` &mdash; used to provide a path to the configuration file. A relative or absolute path can be used. Generation fails if any intermediate directory in the path does not exist. If the `-c` option is not specified, the `.imptest` file in the current directory is assumed.
* `-f` &mdash; used to update (overwrite) an existing configuration. If the specified configuration file already exists, this option must be explicitly specified to update the file.

During the command execution you will be asked for [configuration settings](#test-project-configuration) in either of the following cases:
- if a new Test Project Configuration is being created, the default values of the settings are offered;
- if the existing Test Project Configuration is being updated, the settings from the existing configuration file are offered as defaults.

### GitHub Credentials Configuration

Sources from [GitHub](https://github.com/electricimp/Builder#from-github) can be included into test files.

For unauthenticated requests, GitHub API allows you to make up to 60 requests per hour - [GitHub API rate limit exceeding](https://developer.github.com/v3/#rate-limiting).
To overcome this limitation, you can provide user credentials.

For security reasons we strongly recommend to provide the credentials via [Environment Variables](#environment-variables-settings).

But there is also a way to store the credentials in a special file (one file per Test Project).
The file can be created or updated by the following command:

`imptest github [-g <credentials_file>] [-d] [-f]`

where:

* `-d` &mdash; prints the debug output
* `-g` &mdash; used to provide a path to the file with GitHub credentials. A relative or absolute path can be used. Generation fails if any intermediate directory in the path does not exist. If `-c` option is not specified, the `.imptest-auth` file in the current directory is assumed.
* `-f` &mdash; used to update (overwrite) an existing file. If the specified file already exists, this option must be explicitly specified to update it.

The file syntax is as follows:

```
{
    "github-user": "user",
    "github-token": "password_or_token"
}
```

### Environment Variables Settings

For security reasons we strongly recommend to define Build API key and GitHub credentials as environment variables as follows:
- [**apiKey**](#test-project-configuration) – `IMP_BUILD_API_KEY` - to deploy and run the code on imp devices via [Electric Imp Build API](https://electricimp.com/docs/buildapi/).
- [**github-user**](#github-credentials-configuration) – `GITHUB_USER` - to include external sources from GitHub.
- [**github-token**](#github-credentials-configuration) – `GITHUB_TOKEN` - to include external sources from GitHub.

## Writing Tests

Basic steps to write tests:
- Choose the name and location of your file with tests. You can have several files with tests in the same or different locations.
  - The name with the path, relative to Project Home, must conform to the patterns specified in [Test Project Configuration](#test-project-configuration) of your Test Project.
  - The file is treated as imp agent test code if `agent` is present in the file name. Otherwise the file is treated as imp device test code.
  - By default, the test code runs either on imp device or on imp agent. If your Test Case must run on both the imp device and imp agent, there is a way that allows you to execute [agent and device test code together](#tests-for-bidirectional-device-agent-communication).
- Add a class (Test Case) inherited from the `ImpTestCase` class. Every file can have several Test Cases (classes).
Test Cases (classes) can have identical names if they are in different files.
- Add and implement tests - method names start with `test`. Every Test Case (class) can have several tests (methods).
- Additionally, any Test Case can have `setUp()` and `tearDown()` methods for the environment setup before the tests execution and cleaning-up afterwards. Add and implement them, if needed.

A test method can be designed as synchronous (by default) or [asynchronous](#asynchronous-testing).

A test file must not contain any `#require` statement. [An include from GitHub](#github-credentials-configuration) must be used instead of it.

For example: `#require "messagemanager.class.nut:1.0.2"` must be replaced with `@include "github:electricimp/MessageManager/MessageManager.class.nut@v1.0.2"`.

Below is an example of a simple Test Case:

```squirrel
class MyTestCase extends ImpTestCase {
  function testAssertTrue() {
    this.assertTrue(true);
  }
  function testAssertEqual() {
    this.assertEqual(1000 * 0.01, 100 * 0.1);
  }
}
```

### Tests for Bidirectional Device-Agent Communication

To test interaction between a device and an agent, `impTest` allows developers to extend tests with a corresponding logic implemented on the other side (agent or device respectively). The test "extensions" can be used to emulate a real device-agent interaction and communication.

To identify partners file uniquely, there are some restrictions imposed on the test extensions:

- [Test case](#overview)(class) must be either in the device code or agent code, not in both. Let's name the file with test's implementation as *TestFile*,  the other file will be named *PartnerFile*.
- *TestFile* and *PartnerFile* must be located in the same folder (directory) on the disk.
- *TestFile* and *PartnerFile* names must conform to the `TestName.(agent | device)[.test].nut`special pattern, which means they need to have the same `TestName` prefix and the same `.nut` suffix. *TestFile* is indicated by the `.test` string in the suffix. *PartnerFile*  **must not** feature this string in the suffix. Otherwise the *PartnerFile* will perform the `TestFile` role and the *TestFile* will perform the `PartnerFile` role.
- The type of the execution environment is indicated by either `.device` or `.agent` in the suffix of the *TestFile* name, for example, `"Test1.agent.test.nut"`.
- The *PartnerFile* is found by replacing `(agent | device).test.nut`  with `(device | agent).nut` in the file name suffix.
- Due to partner special naming **do not** change the default value of ["Test file search pattern"](#test-project-configuration).

Examples of test extensions can be found at [sample7](./samples/sample7).

### Asynchronous Testing

Every test method (as well as `setUp()` and `tearDown()`) can be either synchronous (by default) or asynchronous.

Method must return an instance of [**Promise**](https://github.com/electricimp/Promise) to notify that it needs to do some work asynchronously.

The Promise resolution means all test have been passed successfully. The Promise rejection denotes a failure.

Example:

```squirrel
function testSomethingAsyncronously() {
  return Promise(function (resolve, reject){
    resolve("It's all good, man!");
  });
}
```

### Builder Language

[**Builder**](https://github.com/electricimp/Builder) is supported by **impTest**.
**Builder** language combines a preprocessor with an expression language and advanced imports. 

Example:

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

[*\_\_FILE\_\_* and *\_\_LINE\_\_*](https://github.com/electricimp/Builder#variables) variables are defined in the [**Builder**](https://github.com/electricimp/Builder),
they can be useful for debugging information. Below is a usage example:

```squirrel
this.assertEqual(
  expected,
  actual,
  "Failed to assert that values are"
    + " equal in '@{__FILE__}'"
    + " at line @{__LINE__}"
);
```

It is possible to define and propagate [`custom variables`](https://github.com/electricimp/Builder#variables) through a separate configuration file which syntax is similar to [`github credential file`](#github-credentials-configuration):

```
{
    "pollServer": "http://example.com",
    "expectedAnswer": "data ready"
}
```

The default file name is `.imptest-builder` but an alternative name can be selected with the  `-b <builder_config_file>` command line option as follows:

``` bash
imptest test -b tests/test1/.test1-builder-config
```

After that [`Builder`](https://github.com/electricimp/Builder) will be able to process custom variables met in the source codes.

```squirrel
local response = http.get("@{pollServer}", {}).sendsync();
this.assertEqual(
  "@{expectedAnswer}",
  response,
  "Failed to get expected answer"
);
```

### External Commands

A test can call a host operating system command as follows:

```squirrel
// within the test case/method
this.runCommand("echo 123");
// the host operating system command `echo 123` is executed
```

If the execution timeout of an external command expires (the timeout is specified by the _timeout_ parameter in [Test Project Configuration](#test-project-configuration)) or exits with a status code other than 0, the test session fails.

### Assertions

The following assertions are available in tests:

#### assertTrue()

`this.assertTrue(condition, [message])`

Asserts that the condition is truthful.

Example:

```squirrel
 // ok
this.assertTrue(1 == 1);

// fails
this.assertTrue(1 == 2);
```

#### assertEqual()

`this.assertEqual(expected, actual, [message])`

Asserts that two values are equal.

Example:

```squirrel
// ok
this.assertEqual(1000 * 0.01, 100 * 0.1);

// Failure: Expected value: 1, got: 2
this.assertEqual(1, 2);
```

#### assertGreater()

`this.assertGreater(actual, cmp, [message])`

Asserts that a value is greater than some other value.

Example:

```squirrel
// ok
this.assertGreater(1, 0);

// Failure: Failed to assert that 1 > 2
this.assertGreater(1, 2);
```

#### assertLess()

`this.assertLess(actual, cmp, [message])`

Asserts that a value is less than some other value.

Example:

```squirrel
// ok
this.assertLess(0, 1);

// Failure: Failed to assert that 2 < 2
this.assertLess(2, 2);
```

#### assertClose()

`this.assertClose(expected, actual, maxDiff, [message])`

Asserts that a value is within some tolerance from an expected value.

Example:

```squirrel
// ok
this.assertClose(10, 9, 2);

// Failure: Expected value: 10пїЅ0.5, got: 9
this.assertClose(10, 9, 0.5);
```

#### assertDeepEqual()

`this.assertDeepEqual(expected, actual, [message])`

Performs a deep comparison of tables, arrays and classes.

Example:

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

Example:

```squirrel
// ok
this.assertBetween(10, 9, 11);

// Failure: Expected value in the range of 11..12, got 10
this.assertBetween(10, 11, 12);
```

#### assertThrowsError

`this.assertThrowsError(func, ctx, [args = []], [message])`

Asserts that the  _func_ function throws an error when it is called with the  _args_ arguments and the _ctx_ context. Returns an error thrown by _func_.

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

Return values (other than *null*) are displayed in the console when a test succeeds and can be used to output the following diagnostic messages:

<img src="./docs/diagnostic-messages.png" width=497>

[Test cases](#overview) can also output informational messages with:

```squirrel
this.info(<message>)
```

A log of a failed test looks as follows:

<img src="./docs/diagnostic-messages2.png" width=497>

This means that the execution of the `testMe` method in the `MyTestCase` class has failed:
Incorrect syntax is in line 6 of the test file (containing the `MyTestCase` class).

### [Test Case](#overview) Example

The utility file `myFile.nut` code is as follows:
```squirrel

  // (optional) Async version, can also be synchronous

  function setUp() {
    return Promise(function (resolve, reject){
      resolve("we're ready");
    }.bindenv(this));
  }
```

[Test Case](#overview) code is as follows:
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

Use this command to run the tests as follows:

`imptest test [-c <configuration_file>] [-g <credentials_file>] [-d] [testcase_pattern]`

where:

* `-c` &mdash; this option is used to provide a path to the Test Project Configuration file. A relative or absolute path can be used. If the `-c` option is left out, the `.imptest` file in the current directory is assumed.
* `-g` &mdash; this option is used to provide a path to file with GitHub credentials. A relative or absolute path can be used. If the `-g` option is left out, the `.imptest-auth` file in the current directory is assumed.
* `-b` &mdash; this option is used to provide a path to file with [`Builder variables`](https://github.com/electricimp/Builder#usage). A relative or absolute path can be used. If the `-b` option is left out, the `.imptest-builder` file in the current directory is assumed.
* `-d` &mdash; prints [debug output](#debug-mode), stores device and agent code
* `testcase_pattern` &mdash; a pattern for [selective test runs](#selective-test-runs)

The impTest tool searches all files that matche the file name patterns specified in the [Test Project Configuration](#test-project-configuration). The search starts with Project Home. The tool looks for all Test Cases (classes) in the files. And all test methods from those classes are considered as tests for the current Test Project.

Optional `testcase_pattern` selects a specific test or a set of tests for execution from all the found tests.

If `testcase_pattern` is not specified, all the found tests are selected for execution.

The selected tests are executed in an arbitrary order.

Every test is treated as failed if an error has been thrown. Otherwise the test is treated as passed.

### Selective Test Runs

[`testcase_pattern`](#running-tests) allows to execute a single test or a set of tests from one or several Test Cases.

The syntax of the pattern is as follows: `[testFileName]:[testClass].[testMethod]`

where:

* `testFileName` &mdash; the name of the Test Case file. A pattern to filter required file among all conforming to [`Test file search pattern`](#test-project-configuration)
* `testClass` &mdash; the name of the Test Case class. Note: Test Cases with identical names can exist in different files that belong to the same Test Project, all of them must be selected.
* `testMethod` &mdash; a test method name

Example `testcase_pattern` usage:

E.g. a test file `TestFile1.test.nut` contains:
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

And a test file `TestFile2.test.nut` contains:
```
class MyTestClass extends ImpTestCase {
    function testMe() {...}
    function testMe_1() {...}
}
```

In this case:
- `imptest test TestFile1:MyTestClass.testMe` runs the `testMe()` method in the `MyTestClass` class of the `TestFile1.test.nut` file.
- `imptest test :MyTestClass.testMe` runs the `testMe()` method in the `MyTestClass` class from the `TestFile1` __and__ `TestFile2.test.nut` file.
- `imptest test :MyTestClass_1` runs all test methods from the `MyTestClass_1` class of the first file since it is the only file with the required class.
- `imptest test TestFile2` runs all test methods from the `TestFile2.test.nut` file.
- `imptest test :.testMe_1` runs the `testMe_1()` methods in all classes of all files.

*Note* that search patterns are allowed for test file names only. A test class and a test method **must be** fully qualified.

*Note* that if no colon is present in the testcase filter, it is assumed that  the only pattern of a file name is specified.

*Note* an internal class can play the role of a test case. To denote this use case, put `"."` at the end of the filter, for example, `"imptest test :Inner.TestClass."` executes all test methods from the `Inner.TestClass` class.

### Debug Mode

The `-d` option is used to run tests in the debug mode:
- a debug output is switched on. JSON is used to communicate between [impUnit](https://github.com/electricimp/impUnit) test framework and **impTest**. Communication messages are printed.
- device and agent code are stored in the `./build` folder that is created in Project Home.

The debug mode is useful for the analysis of failures.

An example of a debug log can be found below:

<img src="./docs/diagnostic-messages3.png" width=497>

## [For **impTest** Tools Developers](./docs/forImptestToolsDevelopers.md)

## License

The code in this repository is licensed under [MIT License](./LICENSE).
