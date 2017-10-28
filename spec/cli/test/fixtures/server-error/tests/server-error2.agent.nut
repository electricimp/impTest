
class AgentTestCase2 extends ImpTestCase {
  function testAgentServerError() {
      assertTrue(10 > 1, "Simple assert");
      local agent = AgentServerError();
      agent.sendError();
      this.error("There is no way to see this message in the log.");
      assertTrue(10 > 1, "Agent's server error passed");
  }
}
