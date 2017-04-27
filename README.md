<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [impTest](#imptest)
  - [Installation](#installation)
  - [Command Line Interface](#command-line-interface)
  - [[Quick Start](docs/quick-start.md)](#quick-startdocsquick-startmd)
  - [[Writing Tests](docs/writing-tests.md)](#writing-testsdocswriting-testsmd)
    - [[Assertions](./docs/assertions.md)](#assertionsdocsassertionsmd)
  - [[.imptest Specification](docs/imptest-spec.md)](#imptest-specificationdocsimptest-specmd)
  - [Development](#development)
    - [Installation](#installation-1)
    - [Running](#running)
    - [Testing impTest](#testing-imptest)
  - [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# impTest

**Electric Imp Test Runner**

## Installation

`npm i -g imptest`

Node.js 4.0+ is required.

[Usage at development time](#running)

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
imptest test [options] [test_files_pattern]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
```

```[test_files_pattern]``` can be used for specifying the single test(indivitual test). The syntax of the `test_files_pattern` see in [.imptest](docs/imptest-spec.md).

## [Quick Start](docs/quick-start.md)

## [Writing Tests](docs/writing-tests.md)

### [Assertions](./docs/assertions.md)

## [.imptest Specification](docs/imptest-spec.md)

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

For example:

```bash
SPEC_DEBUG=false SPEC_MODEL_ID=Lu55555OJHZT SPEC_DEVICE_IDS=237d555558a609ee npm test
```

## License

The code in this repository is licensed under [MIT License](./LICENSE).
