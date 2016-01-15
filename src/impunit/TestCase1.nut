/**
 * Test test case
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
