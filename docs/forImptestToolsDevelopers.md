# For impTest Tools Developers

This information is intended for those who want to update the test tools.

[Node.js 4.0+](https://nodejs.org/en/) is required for development.
Once `node` and `npm` are installed, to install *impTest*, download the impTest source using the following command:
```
git clone --recursive <repo-url-goes-here> impTest
```

The command downloads the *impTest* source and the required *impUnit* submodule. It is possible however to manage the *impUnit* submodule as an independent repository and download it manually as follows:

```
git clone <imptest-repo-url-goes-here> impTest
cd imptest/src
git clone <impunit-repo-url-goes-here> impUnit
```

Then install all dependencies:

```
cd impTest
npm i
```

*impTest* is prepared to be executed now:

```bash
src/cli/imptest.js <command> [options] [arguments]
```

A set of available options and commands can be found in the [Test Project Configuration](../README.md#test-project-configuration)
and [Running Tests](../README.md#running-tests) sections.

Example:

```bash
src/cli/imptest.js test -c samples/sample1/.imptest
```

## Testing impTest

Jasmine test suite is included into the project.

The following environment variables need to be set before spec run: 

- SPEC_DEBUG {true|false} – Enables/disables debug output
- SPEC_MODEL_ID – Model Id to use for tests
- SPEC_DEVICE_ID/SPEC_DEVICE_IDS – Device Id/Ids (comma-separated) to use for tests

Then run the `npm test` command. Some tests are designed to fail, so the result of test execution is printed at the end of a log.

**IMPORTANT**: Tests need to be run either on imp001 or imp002 as some of them are designed to fail with an `Out of memory` error, which does not happen on devices with more memory available.

On *Windows* you have to correct _package.json_ file, the `    "test": "node_modules/jasmine/bin/jasmine.js"` line must be replaced with `    "test": "node node_modules/jasmine/bin/jasmine.js"`.

For example:

```bash
SPEC_DEBUG=false SPEC_MODEL_ID=Lu55555OJHZT SPEC_DEVICE_IDS=237d555558a609ee npm test
```

## License

The code in this repository is licensed under [MIT License](../LICENSE).
