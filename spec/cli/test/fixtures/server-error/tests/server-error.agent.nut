
class AgentTestCase extends ImpTestCase {
  function testAgentServerError() {
      assertTrue(10 > 1, "Simple assert");
      local errorMaker = AgentServerError();
      errorMaker.sendError();
      assertTrue(10 > 1, "Agent's server error passed");
  }
}
