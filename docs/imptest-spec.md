<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [.imptest File Specification](#imptest-file-specification)
  - [Environment Variables](#environment-variables)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## .imptest File Specification

__.imptest__ file is used to configure tests execution.

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

**WARNING** The "Test file search pattern" has a restriction see [agent and device together](./writing-tests.md#agent-and-device-together)

The syntax of the `Test file search pattern` is: ```<test_files_pattern>[:[testClass].[testMethod]]```

`test_files_pattern` is the pattern to search the files with test classes like `tests/**/*.test.nut`.

`testClass` is the name of the test class.

`testMethod` is the test method in the test class.

**Example:**

Let code of first test file _MyTestFile_1.agent.test.nut_ is:
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
Let code of second test file _MyTestFile_2.agent.test.nut_ is:
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
- case `tests/MyTestFile_1.agent.test.nut:MyTestClass.testMe`

The `testMe()` method in `MyTestClass` class in `MyTestFile_1.agent.test.nut` file will be executed.

- case `tests/*.agent.test.nut:MyTestClass.testMe`

Two `testMe()` methods in two `MyTestClass` classes in `MyTestFile_1.agent.test.nut` file and in `MyTestFile_2.agent.test.nut` file will be executed.

- case `tests/*.agent.test.nut:MyTestClass_1.`

All methods in `MyTestClass_1` classes in `MyTestFile_1.agent.test.nut` file and in `MyTestFile_2.agent.test.nut` file will be executed.

- case `tests/MyTestFile_2.agent.test.nut:.testMe_1`

Two `testMe_1` methods in `MyTestFile_2.agent.test.nut` file will be executed.

- case `tests/*.agent.test.nut:.` is the same as `tests/*.agent.test.nut`

### Environment Variables

Environment variables used in place of missing keys:
- **apiKey** – `IMP_BUILD_API_KEY`
