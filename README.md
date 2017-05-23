# impTest

**impTest** is a set of tools to run unit tests built with
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

**impTest** is a set of tools to run unit tests built with
[impUnit](https://github.com/electricimp/impUnit) test framework. **impTest** leverages
[Electric Imp Build API](https://electricimp.com/docs/buildapi/) to deploy and run the code
on imp devices. All tools are written in [Node.js](https://nodejs.org/en/) and fully
available in sources.

**Test Project** - is a directory (with all subdirectories) where the tests are located.

There is one **Test Project Configuration** per one Test Project. It's a file where all settings related to all tests of the corresponding Test Project are located.

**Project Home** - is a directory where Test Project Configuration is located.

All files located in Project Home (and in all subdirectories) which names match with the patterns specified in [Test Project Configuration](#test-project-configuration) are considered as files with Test Cases.

**Test Case** - is a class inherited from the `ImpTestCase` class. There may be several Test Cases (classes) in a file.

**Test** - is a method which name starts from `test`. (E.g. *testEverythingOk()*) There may be several tests (methods) in a Test Case (class).

In order to work with impTest you need to:
- [Install](#installation) impTest
- [Create or Update Test Project Configuration](#test-project-configuration)
- [Write or Update Tests](#writing-tests)
- [Run Tests](#running-tests)

Additionally, if you want to update impTest itself - see [For **impTest** Tools Developers](./docs/forImptestToolsDevelopers.md)

## Installation

[Node.js 4.0+](https://nodejs.org/en/) is required.
You can download the Node.js [pre-built binary](https://nodejs.org/en/download/) for your platform or install Node.js via [package manager](https://nodejs.org/en/download/package-manager).
Once `node` and `npm` are installed, to setup **impTest** please execute the command

`npm i -g imptest`


## Test Project Configuration

Configuration file is a JSON file that contains the following settings:

| Key | Description |
| --- | --- |
| __apiKey__ | [Build API key](https://electricimp.com/docs/ideuserguide/account) provides access to [Electric Imp Build API](https://electricimp.com/docs/buildapi/). For security reason we strongly recommend to define Build API key as [environment variables](#environment-variables-settings). |
| __devices__ | A set of Device IDs that specify the devices which to be used for tests execution. |
| __modelId__ | Model Id that is attached to the devices. |
| __deviceFile__ | A path to the additional device source code file. This code to be deployed on imp device as part of every Test Case. `false` is used if no additional code needed. |
| __agentFile__ | A path to the additional agent source code file. This code to be deployed on imp agent as part of every Test Case. `false` is used if no additional code needed. |
| __tests__ | A set of patterns that impTest uses to search files with Test Cases. If `**` is alone in the path portion, then it matches zero or more directories and subdirectories which to be searched. It does not crawl symlinked directories. The pattern default value is `["*.test.nut", "tests/**/*.test.nut"]`. |
| __stopOnFailure__ | Set this option to `true` if you want to stop execution after test failing. The default value is `false`. |
| __timeout__ | A timeout (in seconds) after which the tests are considered as failed. Async tests to be interrupted. Default value: 10 sec. |

Format of the configuration file (the settings may be in any order):

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

Test Project Configuration file can be created or updated by the command:

`imptest init [-c <configuration_file>] [-d] [-f]`

where:

* `-d` &mdash; print debug output
* `-c` &mdash; this option is used to provide a path to the configuration file. Relative or absolute path may be used. Generation will fail if any intermediate directory in the path does not exist. If `-c` option is missed then `.imptest` file in the current directory is assumed.
* `-f` &mdash; to update (overwrite) an existing configuration. If the specified configuration file already exists, this option should be explicitly specified to update the file.

During the command execution you will be asked for [configuration settings](#test-project-configuration):
- if a new Test Project Configuration is being created, the default values of the settings are offered;
- if the existing Test Project Configuration is being updated, the settings from the existing configuration file are offered as defaults.

### GitHub Credentials Configuration

Sources from [GitHub](https://github.com/electricimp/Builder#from-github) may be included to test files.

For unauthenticated requests, GitHub API allows you to make up to 60 requests per hour - [GitHub API rate limit exceeding](https://developer.github.com/v3/#rate-limiting).
To overcome this limitation you may provide user credentials.

For security reason we strongly recommend to provide the credentials via [Environment Variables](#environment-variables-settings).

But there is also a way to store the credentials in a special file (one file per Test Project).
The file can be created or updated by the command:

`imptest github [-g <credentials_file>] [-d] [-f]`

where:

* `-d` &mdash; print debug output
* `-g` &mdash; this option is used to provide a path to file with GitHub credentials. Relative or absolute path may be used. Generation will fail if any intermediate directory in the path does not exist. If `-c` option is missed then `.imptest-auth` file in the current directory is assumed.
* `-f` &mdash; to update (overwrite) an existing file. If the specified file already exists, this option should be explicitly specified to update it.

The file syntax is:

```
{
    "github-user": "user",
    "github-token": "password_or_token"
}
```

### Environment Variables Settings

For security reason we strongly recommend to define Build API key and GitHub credentials as environment variables:
- [**apiKey**](#test-project-configuration) – `IMP_BUILD_API_KEY` - to deploy and run the code on imp devices via [Electric Imp Build API](https://electricimp.com/docs/buildapi/).
- [**github-user**](#github-credentials-configuration) – `GITHUB_USER` - to include external sources from GitHub.
- [**github-token**](#github-credentials-configuration) – `GITHUB_TOKEN` - to include external sources from GitHub.

## Writing Tests

Basic steps to write tests:
- Choose a name and location of your file with tests. You may have several files with tests in the same or different locations.
  - The name with the path, relative to Project Home, should conform to the patterns specified in [Test Project Configuration](#test-project-configuration) of your Test Project.
  - The file is treated as imp agent test code if `agent` is present in the file name. Otherwise the file is treated as imp device test code.
  - By default, the test code runs either on imp device or on imp agent. If your Test Case should run on the both - there is a way that allows you to execute [agent and device test code together](#agent-code-and-device-code-together).
- Add a class (Test Case) inherited from the `ImpTestCase` class. Every file can have several Test Cases (classes).
Test Cases (classes) may have the same names if they is in different files.
- Add and implement tests - methods which name starts from `test`. Every Test Case (class) can have several tests (methods).
- Additionally, any Test Case can have `setUp()` and `tearDown()` methods for the environment setup before the tests execution and cleaning-up afterwards. Add and implement them, if needed.

Test method can be designed as synchronous (by default) or [asynchronous](#asynchronous-testing).

Test file should not contain any `#require` statement. [An include from GitHub](#github-credentials-configuration) should be used instead of it.

For example: `#require "messagemanager.class.nut:1.0.2"` should be replaced with `@include "github:electricimp/MessageManager/MessageManager.class.nut@v1.0.2"`.

Example of a simple Test Case:

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

### Tests for bidirectional Device-Agent Communication

To test interaction between device and agent `impTest` allows developers to extend tests with a corresponding logic implemented on the other side (agent or device respectively). The test "extensions" can be used to emulate real device-agent interaction and communication.

There are some restrictions imposed on the test extensions:

- [Test case](#overview)(class) should be either in device code nor agent code, not in both. Let's name the file with test's implementation as *TestFile*, another file will have name - *PartnerFile*
- *TestFile* and *PartnerFile* names should conform the pattern `[TestName].[agent | device].test.nut`. Which means they need to have the same prefix `[TestName]` and sufix `.test.nut`.
- *TestFile* and *PartnerFile* should be located in the same folder (directory) on the disk.
- *TestFile* **should** conform to ["Test file search pattern"](#test-project-configuration)
- *PartnerFile* **should not** be match to ["Test file search pattern"](#test-project-configuration). Otherwise the *PartnerFile* will be in `TestFile` role and the *TestFile* becomes to be in `PartnerFile` role. **impTest** doesn't add `ImpTestCase` class to the partner code. As a result an execution will fail.

Example of test extension can be found at [sample7](./samples/sample7).

### Asynchronous Testing

Every test method (as well as `setUp()` and `tearDown()`) can be either synchronous (by default) or asynchronous.

Method should return an instance of [**Promise**](https://github.com/electricimp/Promise) to notify that it needs to do some work asynchronously.

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
**Builder** language combines a preprocessor with an expression language and advanced imports. Example:

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
they may be useful for debugging information. Here is the usage example:

```squirrel
this.assertEqual(
  expected,
  actual,
  "Failed to assert that values are"
    + " equal in '@{__FILE__}'"
    + " at line @{__LINE__}"
);
```

### External Commands

A test can call a host operating system command. Like so:

```squirrel
// within the test case/method
this.runCommand("echo 123");
// the host operating system command `echo 123` is executed
```

If external command execution times out (the timeout is specified by the _timeout_ parameter in [Test Project Configuration](#test-project-configuration)) or exits with a status code other than 0, the test session fails.

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

Asserts that two values are equal

Example:

```squirrel
// ok
this.assertEqual(1000 * 0.01, 100 * 0.1);

// Failure: Expected value: 1, got: 2
this.assertEqual(1, 2);
```

#### assertGreater()

`this.assertGreater(actual, cmp, [message])`

Asserts that value is greater than some other value.

Example:

```squirrel
// ok
this.assertGreater(1, 0);

// Failure: Failed to assert that 1 > 2
this.assertGreater(1, 2);
```

#### assertLess()

`this.assertLess(actual, cmp, [message])`

Asserts that value is less than some other value.

Example:

```squirrel
// ok
this.assertLess(0, 1);

// Failure: Failed to assert that 2 < 2
this.assertLess(2, 2);
```

#### assertClose()

`this.assertClose(expected, actual, maxDiff, [message])`

Asserts that value is within some tolerance from expected value.

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

[Test cases](#overview) can also output informational messages with:

```squirrel
this.info(<message>)
```

Log of failed test looks like:

<img src="./docs/diagnostic-messages2.png" width=497>

This means that execution of `testMe` method in the `MyTestCase` class has been failed:
Incorrect syntax is in line 6 in test file (in which `MyTestCase` class).

### [Test Case](#overview) Example

utility file `myFile.nut` code is:
```squirrel

  // (optional) Async version, can also be synchronous

  function setUp() {
    return Promise(function (resolve, reject){
      resolve("we're ready");
    }.bindenv(this));
  }
```

[Test Case](#overview) code is:
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

Use this command to run the tests:

`imptest test [-c <configuration_file>] [-g <credentials_file>] [-d] [testcase_pattern]`

where:

* `-c` &mdash; this option is used to provide a path to Test Project Configuration file. Relative or absolute path may be used. If `-c` option is missed then `.imptest` file in the current directory is assumed.
* `-g` &mdash; this option is used to provide a path to file with GitHub credentials. Relative or absolute path may be used. If `-g` option is missed then `.imptest-auth` file in the current directory is assumed.
* `-b` &mdash; this option is used to provide a path to file with [`Builder variables`](https://github.com/electricimp/Builder#usage). Relative or absolute path may be used. If `-b` option is missed then `.imptest-builder` file in the current directory is assumed.
* `-d` &mdash; print [debug output](#debug-mode), store device and agent code
* `testcase_pattern` &mdash; pattern for [selective test runs](#selective-test-runs)

impTest tool searches all files which matches the file name patterns specified in [Test Project Configuration](#test-project-configuration). The search starts from Project Home. The tool looks for all Test Cases (classes) in that files. And all test methods from that classes are considered as tests for the current Test Project.

Optional `testcase_pattern` selects a specific test or set of tests for execution from all found tests.

If `testcase_pattern` is not specified, all found tests are selected for execution.

The selected tests are executed in an arbitrary order.

Every test is treated as failed if an error has been thrown. Otherwise the test is treated as passed.

### Selective Test Runs

[`testcase_pattern`](#running-tests) allows to execute a single test or a set of tests from one or several Test Cases.

The syntax of the pattern is: `[testFileName]:[testClass].[testMethod]`

where:

* `testFileName` &mdash; name of the Test Case file. Pattern to filter required file among all conforming to [`Test file search pattern`](#test-project-configuration)
* `testClass` &mdash; name of the Test Case class. Note: Test Cases with the same name may exist in different files belonged to the same Test Project, all of them to be selected.
* `testMethod` &mdash; test method name

Example `testcase_pattern` usage:

E.g. a test file `TestFile1` contains:
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

And a test file `TestFile2` contains:
```
class MyTestClass extends ImpTestCase {
    function testMe() {...}
    function testMe_1() {...}
}
```


In this case:
- `imptest test TestFile1:MyTestClass.testMe` runs `testMe()` method in `MyTestClass` class of the `TestFile1` file
- `imptest test MyTestClass.testMe` runs `testMe()` method in `MyTestClass` class from `TestFile1` __and__ `TestFile2` file
- `imptest test MyTestClass_1.` runs all test methods from `MyTestClass_1` class of the first file
- `imptest test TestFile2:` runs all test methods from `TestFile2` file
- `imptest test .testMe_1` runs `testMe_1()` methods in all classes of all files
- `imptest test .` is the same as calling `imptest test` w/o `testcase_pattern` - all found tests to be executed.


### Debug Mode

`-d` option is used to run tests in debug mode:
- debug output will be switched on. JSON is used to communicate between [impUnit](https://github.com/electricimp/impUnit) test framework and **impTest**. The communication messages will be printed.
- device and agent code will be stored in `./build` folder that will be created in Project Home.

Debug mode is useful for failures analyzing.

Example of debug log:

<img src="./docs/diagnostic-messages3.png" width=497>

## [For **impTest** Tools Developers](./docs/forImptestToolsDevelopers.md)

## License

The code in this repository is licensed under [MIT License](./LICENSE).
