# For impTest Tools Developers

This information is intended for those who want to update the test tools.

[Node.js 4.0+](https://nodejs.org/en/) is required for development.
Once `node` and `npm` are installed, to install *impTest* please download impTest source:
```
git clone --recursive <repo-url-goes-here> impTest
```

This command will download *impTest* source and required *impUnit* submodule. It is possible hoverer to manage *impUnit* submodule as independent repository and download it manually:

```
git clone <imptest-repo-url-goes-here> impTest
cd imptest/src
git clone <impunit-repo-url-goes-here> impUnit
```

Then install all dependency:

```
cd impTest
npm i
```

*impTest* is prepared to be executed now:

```bash
src/cli/imptest.js <command> [options] [arguments]
```

A set of available options and commands can be found in [Test Project Configuration](../README.md#test-project-configuration)
and [Running Tests](../README.md#running-tests) sections

example:

```bash
src/cli/imptest.js test -c samples/sample1/.imptest
```

## Testing impTest

Jasmine test suite is included with the project.

The following environment variables need to be set before spec run: 

- SPEC_DEBUG {true|false} – Enables/disables debug output
- SPEC_MODEL_ID – Model Id to use for tests
- SPEC_DEVICE_ID/SPEC_DEVICE_IDS – Device Id/Ids (comma-separated) to use for tests

Then `npm test`. Some tests are designed to be failed, so the result of test execution will be printed at the end of log.

On *Windows* you have to correct _package.json_ file, line `    "test": "node_modules/jasmine/bin/jasmine.js"` have to be replaced with `    "test": "node node_modules/jasmine/bin/jasmine.js"`.

For example:

```bash
SPEC_DEBUG=false SPEC_MODEL_ID=Lu55555OJHZT SPEC_DEVICE_IDS=237d555558a609ee npm test
```

## License

The code in this repository is licensed under [MIT License](../LICENSE).
