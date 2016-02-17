// test file

class Case extends ImpTestCase {
  function testSomethingSync() {
    this.assertTrue(true);
//        local s = "123";
//        while(1) {
//          s+=s;
//        }

    local s = hardware.millis();
    while(hardware.millis() - s < 3500) {
    }

      return 100500;
  }

  function testSomethingAsync() {
    return Promise(function(ok, err) {
      imp.wakeup(4, function() {
        ok();
      }.bindenv(this));
    });
  }
}
