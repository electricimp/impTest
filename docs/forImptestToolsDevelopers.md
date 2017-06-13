# For impTest Tools Developers

This information is intended for those who want to update the test tools.

[Node.js 4.0 or greater](https://nodejs.org/en/) is required for development.

Once *node* and *npm* are installed, to install *impTest*, download the impTest source using the following command:

```bash
git clone --recursive <repo-url-goes-here> impTest
```

The command downloads the *impTest* source and the required *impUnit* submodule. It is possible to manage the *impUnit* submodule as an independent repository and it can be downloaded manually as follows:

```bash
git clone <imptest-repo-url-goes-here> impTest
cd imptest/src
git clone <impunit-repo-url-goes-here> impUnit
```

Then install all dependencies:

```bash
cd impTest
npm i
```

*impTest* is prepared to be executed now:

```bash
src/cli/imptest.js <command> [options] [arguments]
```

A set of available options and commands can be found in the [Test Project Configuration](../README.md#test-project-configuration) and [Running Tests](../README.md#running-tests) sections.

#### Example

```bash
src/cli/imptest.js test -c samples/sample1/.imptest
```

## Testing impTest

The Jasmine test suite is included with the project.

The following environment variables need to be set before spec run: 

- *IMP_BUILD_API_KEY* &mdash; Your Build API key
- *SPEC_DEBUG* {true|false} &mdash; Enables/disables debug output
- *SPEC_MODEL_ID* &mdash; Model ID to use for tests
- *SPEC_DEVICE_ID/SPEC_DEVICE_IDS* &mdash; The ID(s) of device(s) (comma-separated) to use for tests

Then run the command `npm test`. Some tests are designed to fail, so the result of test execution is printed at the end of a log.

#### Example

```bash
SPEC_DEBUG=false SPEC_MODEL_ID=Lu55555OJHZT SPEC_DEVICE_IDS=237d555558a609ee npm test
```

**Important** Tests need to be run either on an imp001 or an imp002 as some of them are designed to fail with an `"Out of memory"` error, which does not happen on imp modules with more memory available.

## Windows

If you are running the tests under Windows, you must first correct the `package.json` file as follows: the `    "test": "node_modules/jasmine/bin/jasmine.js"` line must be replaced with `    "test": "node node_modules/jasmine/bin/jasmine.js"`.

## License

The code in this repository is licensed under [MIT License](../LICENSE).
