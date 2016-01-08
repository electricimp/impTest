<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [impTest – Electric Imp Test Runner](#imptest-%E2%80%93-electric-imp-test-runner)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [imptest commands](#imptest-commands)
    - [init](#init)
    - [test](#test)
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
  -a, --agent [bool]   push agent code [default: true]
  -i, --imp [bool]     push device code [default: true]
```

## .imptest file specification

__.imptest__ file is used to deploy tests to a certain device/model.

```json
{
    "apiKey": "<key> {string} Build API key",
    "modelId": "<id> {string} Model ID",
    "modelName": "(optional) <name> {string} Model name",
    "devices": [
        "<id> {string} Electric Imp module ID #1 to run on",
        "<id> {string} Electric Imp module ID #2 to run on"
    ],
    "deviceFile": "<path> {string} Device code",
    "agentFile": "<path> {string} Agent code"
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

Copy __spec/config.js.dist" to __config.js__ and fill-in the neccesary settings, then:

```bash
npm test
```
