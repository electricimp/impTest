
class AgentTestCase extends ImpTestCase {
  function testAgentServerError() {
      assertTrue(10 > 1, "Simple assert");
      local errorMaker = AgentServerError();
      errorMaker.sendError();
      this.error("There is no way to see this message in the log.");
      assertTrue(10 > 1, "Agent's server error passed");
  }
}
