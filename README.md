<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [impTest](#imptest)
  - [Installation](#installation)
  - [Commands](#commands)
    - [init](#init)
    - [test](#test)
  - [Development](#development)
    - [Installation](#installation-1)
    - [Running](#running)
    - [Testing](#testing)
  - [[Writing Tests](docs/writing-tests.md)](#writing-testsdocswriting-testsmd)
  - [[.imptest File Specification](docs/imptest-spec.md)](#imptest-file-specificationdocsimptest-specmd)
  - [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

_Please note that this is still under development and published for preview purposes only._

# impTest

**Electric Imp Test Runner**

## Installation

`npm install -g imptest`

*Requirements:*

|Dependency|OS X Installation|
|:--|:--|
|Node.js 5.1+|`brew install nodejs`|

[Usage at development time](#running) 

## Commands

### init

```
imptest init [options]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
  -f, --force          overwrite existing configuration
```

### test

```
imptest test [options] [test_files_pattern]

Options:

  -d, --debug          debug output
  -c, --config [path]  config file path [default: .imptest]
```

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

### Testing

Copy __spec/config.js.dist__ to __config.js__ and fill-in the neccesary settings, then:

```bash
SPEC_DEBUG=<true|false> npm test
```

## [Writing Tests](docs/writing-tests.md)

## [.imptest File Specification](docs/imptest-spec.md)

## License

The code in this repository is licensed under [MIT License](https://github.com/electricimp/serializer/tree/master/LICENSE).
