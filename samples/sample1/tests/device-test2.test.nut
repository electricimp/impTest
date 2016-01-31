i <- 0;

function w() {
  server.log(++i);
  imp.wakeup(1, w);
}

class DeviceTestCase1 extends ImpUnitCase {
  function testSomethingSync() {
    w();
  }
}

