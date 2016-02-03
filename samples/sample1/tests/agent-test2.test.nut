// test file

i <- 0;

function w() {
  server.log(++i);
  imp.wakeup(1, w);
}

class DeviceTestCase1 extends ImpUnitCase {
  function testSomethingSync() {
//    this.assertClose(10, 11, 0.5);
    w();
  }

  function testSomethingSync2() {
//    this.assertTrue(false);
  }
}

