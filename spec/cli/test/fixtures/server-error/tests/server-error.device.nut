
class DeviceTestCase extends ImpTestCase {
  function testDeviceServerError() {
      assertTrue(10 > 1, "Simple assert");
      local test = DeviceServerError();
      test.sendError();
      this.error("There is no way to see this message in the log.");
      assertTrue(10 > 1, "Agent's server error passed");
  }
}
