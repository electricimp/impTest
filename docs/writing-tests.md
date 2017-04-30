- [Agent and device together](#agent-and-device-together)
- [Test Case Lifecycle: setUp() and tearDown()](#test-case-lifecycle-setup-and-teardown)
- [Asynchronous Testing](#asynchronous-testing)
- [Timeouts](#timeouts)
- [Assertions](#assertions)
  - [assertTrue()](#asserttrue)
  - [assertEqual()](#assertequal)
  - [assertGreater()](#assertgreater)
  - [assertLess()](#assertless)
  - [assertClose()](#assertclose)
  - [assertDeepEqual()](#assertdeepequal)
  - [assertBetween()](#assertbetween)
  - [assertThrowsError](#assertthrowserror)
- [Environment Variables](#environment-variables)
- [\_\_FILE\_\_ & \_\_LINE\_\_](#__file__--__line__)
- [Builder language](#builder-language)
- [Diagnostic Messages](#diagnostic-messages)
- [External Commands](#external-commands)
- [Running Tests Manually](#running-tests-manually)
- [Test Case Example](#test-case-example)
- [License](#license)


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

## Agent and device together

It is possible to use agent and device specific test code together. The rules for the using are:
- The test's implementation should be either in device code nor agent, not in both. Let's name the file with test's implementation as *TestFile*, another file will have name - *PartnerFile*
- *TestFile* and *PartnerFile* names should conform the pattern ```[TestName].[agent | device].test.nut```.
- *TestFile* and *PartnerFile* should be in the same folder(directory).
- *TestFile* **should** be found by "Test file search pattern" (in the imptest [configuration file](../README.md#imptest-file-specification)).
- *PartnerFile* **should not** be found by "Test file search pattern" (in the imptest [configuration file](../README.md#imptest-file-specification)). Otherwise the *PartnerFile* will be in `TestFile` role and the *TestFile* becomes to be in `PartnerFile` role. impTest doesn't add `ImpTestCase` class to the partner code. As a result an execution will fail.

for more details see ![sample7](../samples/sample7)

## Test Case Lifecycle: setUp() and tearDown()

Each test case can have __setUp()__ and __tearDown()__ methods for instantiating the environment and cleaning-up afterwards.

## Asynchronous Testing

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

## Timeouts

__timeout__ parameter on ImpUnitRunner instance sets the timeout after which the tests will fail. Async tests will be interrupted

## Assertions

The following assertions are available in test cases.

### assertTrue()

`this.assertTrue(condition, [message])`

Asserts that the condition is truthful.

example:

```squirrel
 // ok
this.assertTrue(1 == 1);

// fails
this.assertTrue(1 == 2);
```

### assertEqual()

`this.assertEqual(expected, actual, [message])`

Asserts that two values are equal

example:

```squirrel
// ok
this.assertEqual(1000 * 0.01, 100 * 0.1);

// Failure: Expected value: 1, got: 2
this.assertEqual(1, 2);
```

### assertGreater()

`this.assertGreater(actual, cmp, [message])`

Asserts that value is greater than some other value.

example:

```squirrel
// ok
this.assertGreater(1, 0);

// Failure: Failed to assert that 1 > 2
this.assertGreater(1, 2);
```

### assertLess()

`this.assertLess(actual, cmp, [message])`

Asserts that value is less than some other value.

example:

```squirrel
// ok
this.assertLess(0, 1);

// Failure: Failed to assert that 2 < 2
this.assertLess(2, 2);
```

### assertClose()

`this.assertClose(expected, actual, maxDiff, [message])`

Asserts that value is within some tolerance from expected value.

example:

```squirrel
// ok
this.assertClose(10, 9, 2);

// Failure: Expected value: 10±0.5, got: 9
this.assertClose(10, 9, 0.5);
```

### assertDeepEqual()

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

### assertBetween()

`this.assertBetween(actual, from, to, [message])`

Asserts that a value belongs to the range from _from_ to _to_.

example:

```squirrel
// ok
this.assertBetween(10, 9, 11);

// Failure: Expected value in the range of 11..12, got 10
this.assertBetween(10, 11, 12);
```

### assertThrowsError

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

## Environment Variables

New impTest version doesn't support `#{env:VARNAME}` syntax. Please use the [Builder language](#builder-language) instead of.

## \_\_FILE\_\_ & \_\_LINE\_\_

*\_\_FILE\_\_* and *\_\_LINE\_\_* variables are defined in Squirrel source code and test cases, which may be useful for debugging information. Here is the usage example:

```squirrel
this.assertEqual(
  expected,
  actual,
  "Failed to assert that values are"
    + " equal in '@{__FILE__}'"
    + " at line @{__LINE__}"
);
```
## Builder language

A Builder language is supported in impTest. The Builder language combines a preprocessor with an expression language and advanced imports.
Builder language sytax is [here](https://github.com/electricimp/Builder). 

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

## Diagnostic Messages

Return values (other than *null*) are displayed in the console when test succeeds and can be used to output diagnostic messages, like:

<img src="diagnostic-messages.png" width=497>

Test cases can also outout informational messages with:

```squirrel
this.info(<message>)
```

## External Commands

External commands can be triggered by test case like so:

```squirrel
// within the test case/method
this.runCommand("echo 123");
```

The command `echo 123` then will be executed by impTest.

If external command times out (the time it's given is controlled by the _timeout_ parameter in [.imptest](./imptest-spec.md)) or exits with status code other than 0, the test session fails.

## Running Tests Manually

Tests can be executed manually with human-readable output with the following bootstrapping procedure:

```squirrel
testRunner <- ImpTestRunner();
testRunner.timeout = 1 /* [seconds] */;
testRunner.readableOutput = true;
testRunner.stopOnFailure = true;
testRunner.run();
```

Please note that external command execution is not available when tests are executed manually.

## Test Case Example

lib or util file myFile.nut code:
```squirrel

  // (optional) Async version, can also be synchronous

  function setUp() {
    return Promise(function (resolve, reject){
      resolve("we're ready");
    }.bindenv(this));
  }
```

test file code:
```squirrel
class TestCase1 extends ImpUnitTestCase {

@inclide __PATH__+"/myFile.nut"

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
## License

The code in this repository is licensed under [MIT License](../LICENSE).