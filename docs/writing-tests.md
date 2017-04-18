<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Writing Tests](#writing-tests)
  - [Agent and device together](#agent-and-device-together)
  - [Test Case Lifecycle: setUp() and tearDown()](#test-case-lifecycle-setup-and-teardown)
  - [Asynchronous Testing](#asynchronous-testing)
  - [Timeouts](#timeouts)
  - [[Assertions](./assertions.md)](#assertionsassertionsmd)
  - [Environment Variables](#environment-variables)
  - [\_\_FILE\_\_ & \_\_LINE\_\_](#%5C_%5C_file%5C_%5C_-&-%5C_%5C_line%5C_%5C_)
  - [Builder language](#builder-language)
  - [Diagnostic Messages](#diagnostic-messages)
  - [External Commands](#external-commands)
  - [Running Tests Manually](#running-tests-manually)
  - [Test Case Example](#test-case-example)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Writing Tests

impTest looks for classes inherited from the `ImpUnitTestCase` and treats them as test cases.

Methods named as _test..._ are considered to be the test methods, or, simply _tests_.

The simplest test case looks like:

```squirrel
class MyTestCase extends ImpUnitTestCase {
  function testSomething() {
    this.assertTrue(true);
  }
}
```

### Agent and device together

It is possible to use agent and device specific test code together. The rules for the using are:
- The test's implementation should be either in device code nor agent, not in both. Let's name the file with test's implementation as *TestFile*, another file will have name - *PartnerFile*
- *TestFile* and *PartnerFile* names should conform the pattern ```[TestName].[agent | device].test.nut```.
- *TestFile* and *PartnerFile* should be in the same folder(directory).
- *TestFile* **should** be found by "Test file search pattern" (in the imptest [configuration file](./imptest-spec.md)).
- *PartnerFile* **should not** be found by "Test file search pattern" (in the imptest [configuration file](./imptest-spec.md)). Otherwise the *TestFile* becomes to be in *PartnerFile* role. impTest doesn't add `ImpUnitTestCase` to the partner code. As a result a execution will fail.

for more details see ![sample8](../samples/sample8)

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

### Timeouts

__timeout__ parameter on ImpUnitRunner instance sets the timeout after which the tests will fail. Async tests will be interrupted

### [Assertions](./assertions.md)

### Environment Variables

Environment variables can be used in Squirrel source code and test cases like `#{env:VARNAME}`. Access to _IMP_BUILD_API_KEY_ (used in place of missing _apiKey_ parameter in _.imptest_ file) is not allowed.

### \_\_FILE\_\_ & \_\_LINE\_\_

**DEPRECATED** see [Builder language](#builder-language)

*\_\_FILE\_\_* and *\_\_LINE\_\_* variables are defined in Squirrel source code and test cases, which may be useful for debugging information. Here is the usage example:

```squirrel
this.assertEqual(
  expected,
  actual,
  "Failed to assert that values are"
    + " equal in '#{__FILE__}'"
    + " at line #{__LINE__}"
);
```
### Builder language

A Builder language is supported in impTest. The Builder language combines a preprocessor with an expression language and advanced imports.
Builder language sytax is [here](https://github.com/electricimp/Builder). 

```squirrel
this.assertEqual(
  expected,
  actual,
  "Failed to assert that values are"
    + " equal in '@{__FILE__}'"
    + " at line @{__LINE__}"
);
```

### Diagnostic Messages

Return values (other than *null*) are displayed in the console when test succeeds and can be used to output diagnostic messages, like:

![diagnostic messages](./diagnostic-messages.png)

Test cases can also outout informational messages with:

```squirrel
this.info(<message>)
```

### External Commands

External commands can be triggered by test case like so:

```squirrel
// within the test case/method
this.runCommand("echo 123");
```

The command `echo 123` then will be executed by impTest.

If external command times out (the time it's given is controlled by the _timeout_ parameter in [.imptest](./imptest-spec.md)) or exits with status code other than 0, the test session fails.

### Running Tests Manually

Tests can be executed manually with human-readable output with the following bootstrapping procedure:

```squirrel
testRunner <- ImpTestRunner();
testRunner.timeout = 1 /* [seconds] */;
testRunner.readableOutput = true;
testRunner.stopOnFailure = true;
testRunner.run();
```

Please note that external command execution is not available when tests are executed manually.

### Test Case Example

lib or util file myFile.nut:
```squirrel
  /**
   * (optional) Async version, can also be synchronous
   */
  function setUp() {
    return Promise(function (resolve, reject){
      resolve("we're ready");
    }.bindenv(this));
  }
```

test file:
```squirrel
class TestCase1 extends ImpUnitTestCase {

@inclide __PATH__+"/myFile.nut"

  /**
   * Sync test method
   */
  function testSomethingSync() {
     this.assertTrue(true); // ok
     this.assertTrue(false); // fails
  }

  /**
   * Async test method
   */
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
