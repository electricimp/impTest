// @see https://github.com/electricimp/Promise
#require "promise.class.nut:1.0.0"

class ImpTestCase {
  constructor() {
  }

  function setUp() {
  }

  function tearDown() {
  }
}

class TestCase1 extends ImpTestCase {

  function setUp() {
    // async version
    return Promise(function (resolve, reject){
      resolve("something useful");
    }.bindenv(this));
  }

  function testSomething() {

  }
}

class ImpTestRunner {

  testFunctions = null;

  constructor() {
    this.testFunctions = this._getTestFunctions();
  }

  function _getTestFunctions() {

    foreach (rootKey, rootValue in getroottable()) {

      if (type(rootValue) == "class" && rootValue.getbase() == ImpTestCase) {

        local testInstance = rootValue();

        server.log(rootKey + "::setUp()");
        yield testInstance.setUp.bindenv(testInstance);

        foreach (memberKey, memberValue in rootValue) {

          if (memberKey.len() >= 4 && memberKey.slice(0, 4) == "test") {
            server.log(rootKey + "::" + memberKey + "()");
            yield memberValue.bindenv(testInstance);
          }

        }

        server.log(rootKey + "::tearDown()");
        yield testInstance.tearDown.bindenv(testInstance);

      }
    }

    return null;
  }

  function run() {
    local testFunc = resume this.testFunctions;

    if (testFunc) {
      local result = testFunc();

      if (result instanceof Promise) {

        result.then(function (e) {
          this.run.bindenv(this)();
        }.bindenv(this));

      } else {
        this.run();
      }

    }
  }
}

ImpTestRunner().run();
