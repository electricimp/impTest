/**
 * ImpUnit
 * Imp testing framework
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */

/**
 * Promise class for Squirrel (Electric Imp)
 * This file is licensed under the MIT License
 *
 * Initial version: 08-12-2015
 *
 * @see https://www.promisejs.org/implementing/
 *
 * @copyright (c) 2015 SMS Diagnostics Pty Ltd
 * @author Aron Steg
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 */
class Promise {

    static version = [1, 0, 0];

    _state = null;
    _value = null;
    _handlers = null;

    constructor(fn) {

        const PROMISE_STATE_PENDING = 0;
        const PROMISE_STATE_FULFILLED = 1;
        const PROMISE_STATE_REJECTED = 2;

        _state = PROMISE_STATE_PENDING;
        _handlers = [];
        _doResolve(fn, _resolve, _reject);
    }

    // **** Private functions ****

    function _fulfill(result) {
        _state = PROMISE_STATE_FULFILLED;
        _value = result;
        foreach (handler in _handlers) {
            _handle(handler);
        }
        _handlers = null;
    }

    function _reject(error) {
        _state = PROMISE_STATE_REJECTED;
        _value = error;
        foreach (handler in _handlers) {
            _handle(handler);
        }
        _handlers = null;
    }

    function _resolve(result) {
        try {
            local then = _getThen(result);
            if (then) {
                _doResolve(then.bindenv(result), _resolve, _reject);
                return;
            }
            _fulfill(result);
        } catch (e) {
            _reject(e);
        }
    }

   /**
    * Check if a value is a Promise and, if it is,
    * return the `then` method of that promise.
    *
    * @param {Promise|*} value
    * @return {function|null}
    */
    function _getThen(value) {
        local t = typeof value;

        if (value && (t == "instance") && ("then" in value)) {
            local then = value.then;

            if (typeof then == "function") {
                return then;
            }
        }

        return null;
    }

    function _doResolve(fn, onFulfilled, onRejected) {
        local done = false;
        try {
            fn(
                function (value = null /* allow resolving without argument */) {
                    if (done) return;
                    done = true;
                    onFulfilled(value)
                }.bindenv(this),

                function (reason = null /* allow rejection without argument */) {
                    if (done) return;
                    done = true;
                    onRejected(reason)
                }.bindenv(this)
            )
        } catch (ex) {
            if (done) return;
            done = true;
            onRejected(ex);
        }
    }

    function _handle(handler) {
        if (_state == PROMISE_STATE_PENDING) {
            _handlers.push(handler);
        } else {
            if (_state == PROMISE_STATE_FULFILLED && typeof handler.onFulfilled == "function") {
                handler.onFulfilled(_value);
            }
            if (_state == PROMISE_STATE_REJECTED && typeof handler.onRejected == "function") {
                handler.onRejected(_value);
            }
        }
    }

    // **** Public functions ****

    /**
     * Execute handler once the Promise is resolved/rejected
     * @param {function|null} onFulfilled
     * @param {function|null} onRejected
     */
    function then(onFulfilled = null, onRejected = null) {
        // ensure we are always asynchronous
        imp.wakeup(0, function () {
            _handle({ onFulfilled=onFulfilled, onRejected=onRejected });
        }.bindenv(this));

        return this;
    }

    /**
     * Execute handler on failure
     * @param {function|null} onRejected
     */
    function fail(onRejected = null) {
        return then(null, onRejected);
    }

    /**
     * Execute handler both on success and failure
     * @param {function|null} always
     */
    function finally(always = null) {
      return then(always, always);
    }
}

/**
 * JSON encoder.
 * @author Mikhail Yurasov <mikhail@electricimp.com>
 * @verion 0.3.2
 */
JSON <- {

  version = [0, 3, 2],

  // max structure depth
  // anything above probably has a cyclic ref
  _maxDepth = 32,

  /**
   * Encode value to JSON
   * @param {table|array|*} value
   * @returns {string}
   */
  stringify = function (value) {
    return JSON._encode(value);
  },

  /**
   * @param {table|array} val
   * @param {integer=0} depth – current depth level
   * @private
   */
  _encode = function (val, depth = 0) {

    // detect cyclic reference
    if (depth > JSON._maxDepth) {
      throw "Possible cyclic reference";
    }

    local
      r = "",
      s = "",
      i = 0;

    switch (type(val)) {

      case "table":
      case "class":
        s = "";

        // serialize properties, but not functions
        foreach (k, v in val) {
          if (type(v) != "function") {
            s += ",\"" + k + "\":" + JSON._encode(v, depth + 1);
          }
        }

        s = s.len() > 0 ? s.slice(1) : s;
        r += "{" + s + "}";
        break;

      case "array":
        s = "";

        for (i = 0; i < val.len(); i++) {
          s += "," + JSON._encode(val[i], depth + 1);
        }

        s = (i > 1) ? s.slice(1) : s;
        r += "[" + s + "]";
        break;

      case "integer":
      case "float":
      case "bool":
        r += val;
        break;

      case "null":
        r += "null";
        break;

      case "instance":

        if ("_serialize" in val && type(val._serialize) == "function") {

          // serialize instances by calling _serialize method
          r += JSON._encode(val._serialize(), depth + 1);

        } else {

          s = "";

          try {

            // iterate through instances which implement _nexti meta-method
            foreach (k, v in val) {
              s += ",\"" + k + "\":" + JSON._encode(v, depth + 1);
            }

          } catch (e) {

            // iterate through instances w/o _nexti
            // serialize properties, but not functions
            foreach (k, v in val.getclass()) {
              if (type(v) != "function") {
                s += ",\"" + k + "\":" + JSON._encode(val[k], depth + 1);
              }
            }

          }

          s = s.len() > 0 ? s.slice(1) : s;
          r += "{" + s + "}";
        }

        break;

      // strings and all other
      default:
        r += "\"" + this._escape(val.tostring()) + "\"";
        break;
    }

    return r;
  },

  /**
   * Escape strings according to http://www.json.org/ spec
   * @param {string} str
   */
  _escape = function (str) {
    local res = "";

    for (local i = 0; i < str.len(); i++) {

      local ch1 = (str[i] & 0xFF);

      if ((ch1 & 0x80) == 0x00) {
        // 7-bit Ascii

        ch1 = format("%c", ch1);

        if (ch1 == "\"") {
          res += "\\\"";
        } else if (ch1 == "\\") {
          res += "\\\\";
        } else if (ch1 == "/") {
          res += "\\/";
        } else if (ch1 == "\b") {
          res += "\\b";
        } else if (ch1 == "\f") {
          res += "\\f";
        } else if (ch1 == "\n") {
          res += "\\n";
        } else if (ch1 == "\r") {
          res += "\\r";
        } else if (ch1 == "\t") {
          res += "\\t";
        } else {
          res += ch1;
        }

      } else {

        if ((ch1 & 0xE0) == 0xC0) {
          // 110xxxxx = 2-byte unicode
          local ch2 = (str[++i] & 0xFF);
          res += format("%c%c", ch1, ch2);
        } else if ((ch1 & 0xF0) == 0xE0) {
          // 1110xxxx = 3-byte unicode
          local ch2 = (str[++i] & 0xFF);
          local ch3 = (str[++i] & 0xFF);
          res += format("%c%c%c", ch1, ch2, ch3);
        } else if ((ch1 & 0xF8) == 0xF0) {
          // 11110xxx = 4 byte unicode
          local ch2 = (str[++i] & 0xFF);
          local ch3 = (str[++i] & 0xFF);
          local ch4 = (str[++i] & 0xFF);
          res += format("%c%c%c%c", ch1, ch2, ch3, ch4);
        }

      }
    }

    return res;
  }
}

// extend Promise for our needs
// don't do this, children
class Promise extends Promise {
  timedOut = false;
  timerId = null;
}

/**
 * Base for test cases
 */
class ImpUnitCase {

  assertions = 0;

  /**
   * Assert that something is true
   * @param {bool} condition
   * @param {string|false} message
   */
  function assertTrue(condition, message = false) {
    this.assertions++;
    if (!condition) {
      throw message ? message : "Failed to assert that condition is true";
    }
  }

  /**
   * Assert that two values are equal
   * @param {bool} condition
   * @param {string|false} message
   */
   function assertEqual(expected, actual, message = false) {
    this.assertions++;
    if (expected != actual) {
      throw message ? message : "Expected value: " + expected + ", got: " + actual;
    }
  }

  /**
   * Assert that two values are within a certain range
   * @param {bool} condition
   * @param {string|false} message
   */
  function assertClose(expected, actual, maxDiff, message = false) {
    this.assertions++;
    if (math.abs(expected - actual) > maxDiff) {
      throw message ? message :
        "Expected value: " + expected + "±" + maxDiff + ", got: " + actual;
    }
  }

  /**
   * Setup test case
   * Can be async
   * @return {Promise|*}
   */
  function setUp() {}

  /**
   * Teardown test case
   * Can be async
   * @return {Promise|*}
   */
  function tearDown() {
  }

}

/**
 *
 */
class TestCase1 extends ImpUnitCase {

  function setUp() {
    // async version
    return Promise(function (resolve, reject){
      resolve("something useful");
    }.bindenv(this));
  }

  function testSomethingSync() {
     this.assertTrue(true);
     this.assertClose(10, 11, 0.5);
  }

  function testSomethingAsync() {
    // async version
    return Promise(function (resolve, reject){
      imp.wakeup(2 /* 2 seconds */, function () {
        this.assertTrue(true);
        resolve("something useful");
      }.bindenv(this));
    }.bindenv(this));
  }

  function testSomethingAsync2() {
    // async version
    return Promise(function (resolve, reject){
      imp.wakeup(2 /* 2 seconds */, function () {
        this.assertTrue(true);
        resolve("something useful");
      }.bindenv(this));
    }.bindenv(this));
  }


  function testSomethingAsync3() {
    // async version
    return Promise(function (resolve, reject){
      imp.wakeup(2 /* 2 seconds */, function () {
        this.assertTrue(true);
        resolve("something useful");
      }.bindenv(this));
    }.bindenv(this));
  }
}

// message types
enum ImpUnitMessageTypes {
  result = "RESULT",
  debug = "DEBUG",
  status = "STATUS",
  fail = "FAIL"
}

/**
 * Test message
 */
class ImpUnitMessage {

  type = "";
  message = "";

  /**
   * @param {ImpUnitMessageTypes} type - Message type
   * @param {string} message - Message
   */
  constructor(type, message = "") {
    this.type = type;
    this.message = message;
  }

  /**
   * Convert message to JSON
   */
  function toJSON() {
    return JSON.stringify({
      __IMPUNIT_MESSAGE__ = true,
      type = this.type,
      message = this.message
    });
  }

  /**
   * Convert to human-readable string
   */
  function _tostring() {
    return "[impUnit:" + this.type + "] "
      + (typeof this.message == "table"
          ? JSON.stringify(this.message)
          : this.message
        );
  }
}

/**
 * Imp test runner
 */
class ImpUnitRunner {

  // public options
  asyncTimeout = 2;
  readableOutput = true;
  stopOnFailure = false;

  tests = 0;
  assertions = 0;
  failures = 0;
  testFunctions = null;

  constructor() {
    this.readableOutput = readableOutput;
    this.testFunctions = this._getTestFunctions();
  }

  /**
   * Log message
   * @parame {ImpUnitMessage} message
   */
  function _log(message) {
    if (this.readableOutput) {
      server.log(message)
    } else {
      server.log(message.toJSON());
    }
  }

  /**
   * Loog for test cases/test functions
   * @returns {generator}
   */
  function _getTestFunctions() {

    // iterate through the
    foreach (rootKey, rootValue in getroottable()) {

      if (type(rootValue) == "class" && rootValue.getbase() == ImpUnitCase) {

        // create instance of the test class
        local testInstance = rootValue();

        // log setUp() execution
        this._log(ImpUnitMessage(ImpUnitMessageTypes.status, rootKey + "::setUp()"));

        // yield setUp method
        yield [testInstance, testInstance.setUp.bindenv(testInstance)];

        // iterate through members of test class
        foreach (memberKey, memberValue in rootValue) {
          // we need test* methods
          if (memberKey.len() >= 4 && memberKey.slice(0, 4) == "test") {
            // log test method execution
            this._log(ImpUnitMessage(ImpUnitMessageTypes.status, rootKey + "::" + memberKey + "()"));

            this.tests++;

            // yield test method
            yield [testInstance, memberValue.bindenv(testInstance)];
          }
        }

        // log tearDown() execution
        this._log(ImpUnitMessage(ImpUnitMessageTypes.status, rootKey + "::tearDown()"));

        // yield tearDown method
        yield [testInstance, testInstance.tearDown.bindenv(testInstance)];
      }

    }

    // we're done
    return null;
  }

  /**
   * We're done
   */
  function _finish() {
    // log result message
    this._log(ImpUnitMessage(ImpUnitMessageTypes.result, {
      tests = this.tests,
      assertions = this.assertions,
      failures = this.failures
    }));
  }

  /**
   * Called when test method is finished
   * @param {bool} success
   * @param {*} result - resolution/rejection argument
   * @param {integer} assertions - # of assettions made
   */
  function _done(success, result, assertions) {
      if (!success) {
        // log failure
        this.failures++;
        this._log(ImpUnitMessage(ImpUnitMessageTypes.fail, result));
      }

      // update assertions number
      this.assertions += assertions;

      // next
      if (!success && this.stopOnFailure) {
        this._finish();
      } else {
        this.run.call(this);
      }
  }

  /**
   * Run tests
   */
  function run() {

    local test = resume this.testFunctions;

    if (test) {

      local testInstance = test[0];
      local testMethod = test[1];
      local result = null;
      local assertionsMade;

      local syncSuccess = true;
      local syncMessage = "";

      // do GC before each run
      collectgarbage();

      try {
        assertionsMade = testInstance.assertions;
        result = testMethod();
      } catch (e) {

        // store sync test info
        syncSuccess = false;
        syncMessage = e;

      }

      if (result instanceof Promise) {

        // set the timeout timer

        result.timerId = imp.wakeup(this.asyncTimeout, function () {
          if (result._state == 0 /* pending*/) {
            // set the timeout flag
            result.timedOut = true;

            // update assertions counter to ignore assertions afrer the timeout
            assertionsMade = testInstance.assertions;

            this._done(false, "Timed out after " + this.asyncTimeout + "s", 0);
          }
        }.bindenv(this));

        // handle result

        result

          // we're fine
          .then(function (message) {
            if (!result.timedOut) {
              this._done(true, message, testInstance.assertions - assertionsMade);
            }
          }.bindenv(this))

          // we're screwed
          .fail(function (reason) {
            if (!result.timedOut) {
              this._done(false, reason, testInstance.assertions - assertionsMade);
            }
          }.bindenv(this))

          // anyways...
          .finally(function(e) {
            // cancel timeout detection
            if (result.timerId) {
              imp.cancelwakeup(result.timerId);
              result.timerId = null;
            }
          });

      } else {
        // test was sync one
        this._done(syncSuccess, syncMessage, testInstance.assertions - assertionsMade);
      }

    } else {
      this._finish();
    }

  }

}

//testRunner <- ImpUnitRunner();
//testRunner.asyncTimeout = 2;
//testRunner.readableOutput = false;
//testRunner.stopOnFailure = false;
//server.log("\n\n\n");
//testRunner.run();

// +todo: timeouts for async execution AND/OR global timeout
// todo: more assertion methods
// todo: run standalone test functions
// todo: propose public API for getting Promise state
