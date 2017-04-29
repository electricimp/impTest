**Electric Imp Test Runner** provides ability to execute set of tests.

- [Installation](#installation)
- [Command Line Interface](#command-line-interface)
- [.imptest File Specification](#imptest-file-specification)
  - [Agent code and device code together](#agent-code-and-device-code-together)
  - [Environment Variables](#environment-variables)
- [Writing Tests](./docs/writing-tests.md)
- [Development](#development)
  - [Installation](#installation-1)
  - [Running](#running)
  - [Testing impTest](#testing-imptest)
- [License](#license)

## Installation

`npm i -g imptest`

Node.js 4.0+ is required.


## Command Line Interface

- *init* &mdash; Generation or updating the test confiduration file

```
imptest init [options]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
  -f, --force          overwrite existing configuration
```

- *test* &mdash; Start the test execution process

```
imptest test [options] [testcase_pattern]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
```

*testcase_pattern* specifyes testcase to be executed. The syntax of the _Test case pattern_ is: ```[testClass].[testMethod]```

*testClass* is the name of the test class.

*testMethod* is the test method in the test class.

**Example** of *testcase_pattern*:

Let code of test file is:
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

- case *imptest test MyTestClass.testMe*

*testMe()* method in *MyTestClass* class will be executed.

- case *imptest test MyTestClass_1.*

All methods in *MyTestClass_1* class will be executed.

- case *imptest test .testMe_1*

Two *testMe_1()* methods in both classes will be executed.

- case *imptest test .*

*imptest test .* is the same as *imptest test* - All test methods in all test classes will be executed.

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

### Agent code and device code together

It is possible to use agent and device specific test code together. The rules for the using are:
- The test's implementation should be either in device code nor agent, not in both. Let's name the file with test's implementation as *TestFile*, another file will have name - *PartnerFile*
- *TestFile* and *PartnerFile* names should conform the pattern ```[TestName].[agent | device].test.nut```.
- *TestFile* and *PartnerFile* should be in the same folder(directory).
- *TestFile* **should** be found by "Test file search pattern".
- *PartnerFile* **should not** be found by "Test file search pattern". Otherwise the *PartnerFile* will be in *TestFile* role and the *TestFile* becomes to be in *PartnerFile* role. impTest doesn't add `ImpTestCase` class to the partner code. As a result an execution will fail.

for more details see ![sample8](./samples/sample8)

### Environment Variables

Environment variables used in place of missing keys:
- **apiKey** – `IMP_BUILD_API_KEY`

## [Writing Tests](./docs/writing-tests.md)

## Development

### Installation

```bash
git clone <repo-url-goes-here> imptest
cd imptest
npm i
```

### Running

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
