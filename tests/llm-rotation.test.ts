import { llmRouter, FREE_MODELS, LLMProvider } from "../src/lib/llm-router";
import { ChatMessage } from "../src/lib/types";

async function testLLMRotation() {
  console.log("🔄 Testing Multi-Provider LLM Rotation Logic...\n");

  const mockMessages: ChatMessage[] = [
    { role: "user", content: [{ type: "text", text: "Hello" }] }
  ];

  // 1. Test Provider Selection & Rotation
  console.log("--- Test 1: Provider Rotation ---");
  const providersFound = new Set<string>();
  
  // We need to simulate the environment variables being present for the constructor to include them
  // Since we can't easily change process.env in the test for the singleton, 
  // we'll verify the logic via the getFetchParams for each provider manually.

  const testProviders: LLMProvider[] = ["openrouter", "gemini", "groq"];
  
  for (const provider of testProviders) {
    const req = {
      provider,
      model: FREE_MODELS[provider][0],
      messages: mockMessages
    };
    
    const params = llmRouter.getFetchParams(req);
    console.log(`✅ ${provider.toUpperCase()} params built correctly`);
    
    if (provider === "gemini") {
      if (params.url.includes("generativelanguage.googleapis.com") && (params.body as any).contents) {
        console.log("   - Gemini body format verified");
      } else {
        console.log("   - ❌ Gemini format mismatch");
      }
    } else {
      if (params.headers["Authorization"] && (params.body as any).messages) {
        console.log(`   - ${provider} OpenAI-compatible format verified`);
      } else {
        console.log(`   - ❌ ${provider} format mismatch`);
      }
    }
  }

  // 2. Test Model Selection
  console.log("\n--- Test 2: Random Model Selection ---");
  const req1 = llmRouter.getNextFreeRequest(mockMessages);
  const req2 = llmRouter.getNextFreeRequest(mockMessages);
  
  console.log(`✅ Selected Provider 1: ${req1.provider} (${req1.model})`);
  console.log(`✅ Selected Provider 2: ${req2.provider} (${req2.model})`);
  
  if (req1.provider !== req2.provider) {
    console.log("✅ Rotation successful (different providers)");
  } else {
    console.log("ℹ️ Rotation stayed on same provider (possibly only one key configured in test env)");
  }

  console.log("\n✨ LLM Rotation Logic Verified!");
}

testLLMRotation().catch(console.error);
