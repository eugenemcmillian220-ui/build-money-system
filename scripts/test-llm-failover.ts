import { aiComplete } from "../src/lib/ai";
import { logger } from "../src/lib/logger";

// Mock the keyManager and providers to simulate a real environment
// This script assumes it's running in an environment with some keys configured

async function testFailover() {
  console.log("Testing AI failover logic...");

  try {
    // Test with a model that only exists on one provider (opencodezen_go_openai)
    // and see if it correctly skips other providers like OpenAI/Groq instead of 404ing
    const result = await aiComplete({
      messages: [{ role: "user", content: "Say 'Hello' only." }],
      model: "deepseek-v4-flash", // This is in ZEN_GO_OPENAI_MODELS
      timeout: 10000,
    });

    console.log("Success!", {
      provider: result.provider,
      model: result.model,
      content: result.content
    });
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testFailover();
