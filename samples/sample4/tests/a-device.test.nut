// test file

class Case extends ImpUnitCase {
  function testSomethingSync() {
    this.assertTrue(true);
    local t = hardware.millis();
//    while(hardware.millis() - t < 100000); // 100 sec
//    while(1);
  }

  function testSomethingAsync() {
    return Promise(function(ok, err) {
      imp.wakeup(4, function() {
        ok();
      }.bindenv(this));
    });
  }
}
