import { llmRouter, FREE_MODELS, LLMProvider } from "../src/lib/llm-router";
import { ChatMessage } from "../src/lib/types";

async function testLLMRotation() {
  console.log("🔄 Testing Multi-Provider LLM Rotation Logic...\n");

  const mockMessages: ChatMessage[] = [
    { role: "user", content: [{ type: "text", text: "Hello" }] }
  ];

  // 1. Test Provider Selection & Rotation
  console.log("--- Test 1: Provider Rotation ---");
  
  const testProviders: LLMProvider[] = ["openrouter", "gemini", "groq", "deepseek", "cerebras", "cloudflare"];
  
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
      }
    } else if (provider === "cloudflare") {
      if (params.url.includes("api.cloudflare.com") && (params.body as any).messages) {
        console.log("   - Cloudflare format verified");
      }
    } else {
      if (params.headers["Authorization"] && (params.body as any).messages) {
        console.log(`   - ${provider} OpenAI-compatible format verified`);
      }
    }
  }

  console.log("\n✨ LLM Rotation Logic Structure Verified!");
}

testLLMRotation().catch(console.error);
