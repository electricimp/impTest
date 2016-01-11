

class ImpTestCase {
  constructor() {

  }

  function setup() {

  }

  function teardown() {

  }
}


class TestCase1 extends ImpTestCase {
  function setup() {

  }

  function testSomething() {
    server.log("TestCase1.testSomething()");
  }
}

function run() {
  foreach (rootKey, rootValue in getroottable()) {

    // look for classes derived from ImpTestCase
    if (type(rootValue) == "class" && rootValue.getbase() == ImpTestCase) {
      server.log("# test case found: " + rootKey);

      local testInstance = rootValue();

      foreach (memberKey, memberValue in rootValue) {
        server.log(rootKey + "::" + memberKey);
        testInstance[memberKey]();
      }
    }
  }

}

run();





