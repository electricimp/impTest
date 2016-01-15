/**
 * Agent test case #1
 */
class AgentTestCase1 extends ImpUnitCase {

  i = null;

  /**
   * Init our test
   */
  function setUp() {
    this.i = AA();
  }

  /**
   * Do sync test
   */
  function testSomethingSync() {
     // ensure our setup was done
     this.assertTrue(this.i instanceof AA);

     // ensure that 5+4.9 is close enough to 10
     this.assertClose(10, this.i.addTwoNums(5, 4.9), 0.25);
  }

  /**
   * Do async test
   */
  function testSomethingAsync() {
    return Promise(function (resolve, reject) {
      imp.wakeup(2 /* 2 seconds */, function () {
          try {
            // ensure that 5+4.9 is close enough to 10
            this.assertClose(10, this.i.addTwoNums(5, 4.9), 0.25);
            resolve();
          } catch (e) {
            reject(e);
          }
      }.bindenv(this));
    }.bindenv(this));
  }

  /**
   * Teardown
   */
  function tearDown() {
    this.i = null;
  }
}

