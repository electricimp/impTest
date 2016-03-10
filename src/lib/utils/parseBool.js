/**
 * Parse value to boolean
 *
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 * @version 1.0.0
 */

'use strict';

/**
 * @param {*} val
 * @returns {boolean}
 */
module.exports = function parseBool(val) {

  if (undefined === val || null === val) {
    return false;
  }

  switch (val.toString().toLowerCase()) {
    case '0':
    case 'false':
    case 'no':
    case 'n':
    case '':
      return false;
  }

  return true;
};
