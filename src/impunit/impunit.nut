// @see https://github.com/electricimp/Promise
#require "promise.class.nut:1.0.0"



class ImpTestCase {
  constructor() {
  }

  function setUp() {
    return true;
  }

  function tearDown() {

  }
}


class TestCase1 extends ImpTestCase {
  function setUp() {
    // async version
    return Promise(function (resolve, reject){
      resolve();
    });
  }

  function testSomething() {

  }
}

class ImpTestRunner {

  function iterateOverTestFunctions() {
    local testFunctions = [];

    foreach (rootKey, rootValue in getroottable()) {
      if (type(rootValue) == "class" && rootValue.getbase() == ImpTestCase) {
        foreach (memberKey, memberValue in rootValue) {

          if (memberKey.len() >= 4 && memberKey.slice(0, 4) == "test") {
            // testFunctions.push([])
          }

        }
      }
    }

    return null;
  }


  function run() {

    foreach (rootKey, rootValue in getroottable()) {

      // look for classes derived from ImpTestCase
      if (type(rootValue) == "class" && rootValue.getbase() == ImpTestCase) {

        server.log("# test case found: " + rootKey);

        local testInstance = rootValue();

        local res = testInstance.setUp();



        foreach (memberKey, memberValue in rootValue) {
          // look for test* methods
          if (memberKey.len() >= 4 && memberKey.slice(0, 4) == "test") {
            server.log("# running " + rootKey + "::" + memberKey);
            // testInstance[memberKey]();
            memberValue.bindenv(testInstance)();
          }
        }

        testInstance.tearDown();

      }

    }

  }
}

ImpTestRunner().run();






