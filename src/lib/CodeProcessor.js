/**
 * Processes the code
 *  - replace the env variables
 *  - replace ${__LINE__}, ${__FILE__}
 *
 *  @author Mikhail Yurasov <mikhail@electricimp.com>
 */

'use strict';

const VARIABLE_PATTERN = '\\#\\{(env:)?([a-z_][a-z0-9_]*)\\}';

class CodeProcessor {

  constructor() {
    this.variables = {
      __FILE__: ''
    };

    this.source = '';
    this.blockedEnvVars = [];
  }

  process(source) {
    source = source.split(/\r\n|\n/);

    const lineVariablesRegex = new RegExp(VARIABLE_PATTERN, 'ig');
    const variablesPartsRegex = new RegExp(VARIABLE_PATTERN, 'i');

    for (let line = 0; line < source.length; line++) {

      const variables = source[line].match(lineVariablesRegex);
      if (!variables) continue;

      this._variables.__LINE__ = line + 1;

      for (const variable of variables) {

        const variableParts = variable.match(variablesPartsRegex);
        const isEnv = (variableParts[1] || '').toLowerCase() === 'env:';
        const name = variableParts[2];

        let value;

        if (isEnv) {

          // check if var is defined
          if (!process.env.hasOwnProperty(name)) {
            throw new Error('Environment variable "' + name + '" not defined');
          }

          // check if var is blocked
          if (this.blockedEnvVars.indexOf(name) !== -1) {
            throw new Error('Cannot access environment variable "' + name + '"');
          }

          value = process.env[name];
        } else {

          // check if var is defined
          if (!this._variables.hasOwnProperty(name)) {
            throw new Error('Variable "' + name + '" not defined');
          }

          value = this._variables[name];
        }

        source[line] = source[line].replace(variable, value);
      }
    }

    return source.join('\n');
  }

  // <editor-fold desc="Accessors" defaultstate="collapsed">

  get blockedEnvVars() {
    return this._blockedEnvVars;
  }

  set blockedEnvVars(value) {
    this._blockedEnvVars = value;
  }

  get variables() {
    return this._variables;
  }

  set variables(value) {
    this._variables = value;
  }

  // </editor-fold>
}

module.exports = CodeProcessor;
