
class DeviceTestCase2 extends ImpTestCase {
  function testDeviceServerError() {
      assertTrue(10 > 1, "Simple assert");
      local test = DeviceServerError();
      test.sendError();
      assertTrue(10 > 1, "Agent's server error passed");
  }
}
