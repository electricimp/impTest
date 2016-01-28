<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [impTest](#imptest)
  - [Installation](#installation)
  - [Commands](#commands)
    - [init](#init)
    - [test](#test)
  - [Development](#development)
    - [Installation](#installation-1)
    - [Testing](#testing)
  - [[Writing tests](docs/writing-tests.md)](#writing-testsdocswriting-testsmd)
  - [[.imptest File Specification](docs/imptest-spec.md)](#imptest-file-specificationdocsimptest-specmd)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# impTest

**Electric Imp Test Runner**

## Installation

`npm install -g imptest`

*Requirements:*

|Dependency|OS X Installation|
|:--|:--|
|Node.js 5.1+|`brew install nodejs`|

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
imptest test [options]

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

### Testing

Copy __spec/config.js.dist__ to __config.js__ and fill-in the neccesary settings, then:

```bash
SPEC_DEBUG=<true|false> npm test
```

## [Writing tests](docs/writing-tests.md)

## [.imptest File Specification](docs/imptest-spec.md)
