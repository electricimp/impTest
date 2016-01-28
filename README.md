<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [impTest – Electric Imp Test Runner](#imptest-%E2%80%93-electric-imp-test-runner)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [imptest commands](#imptest-commands)
    - [init](#init)
    - [test](#test)
  - [[Writing tests](docs/writing-tests.md)](#writing-testsdocswriting-testsmd)
  - [.imptest file specification](#imptest-file-specification)
  - [Development](#development)
    - [Installation](#installation-1)
    - [Testing](#testing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# impTest – Electric Imp Test Runner

## Requirements

|Dependency|OS X Installation|
|:--|:--|
|Node.js 5.1+|`brew install nodejs`|

## Installation

_(not published yet)_

`npm install -g imptest`

## imptest commands

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

## [Writing tests](docs/writing-tests.md)

## .imptest file specification

__.imptest__ file is used to deploy tests to a certain device/model.

```js
{
    "apiKey":         {string},           // Build API key
    "modelId":        {string},           // Model id
    "devices":        {string[]},         // Device IDs
    "deviceFile":     {string},           // Device code file. Default: "device.nut"
    "agentFile":      {string},           // Agent code file. Default: "agent.nut"
    "tests":          {string|string[]},  // Test file search pattern. Default: ["*.test.nut", "tests/**/*.test.nut"]
    "stopOnFailure":  {boolean},          // Stop tests execution on failure? Default: false
    "timeout":        {number}            // Async test methods timeout, seconds. Default: 10
}
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
