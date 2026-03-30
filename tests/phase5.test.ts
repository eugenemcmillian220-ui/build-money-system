import { security, SecurityError } from "../src/lib/security";
import { AgentSwarm } from "../src/lib/agent-swarm";
import { aiDebugger } from "../src/lib/ai-debugger";
import { feedbackLoop } from "../src/lib/feedback-loop";
import { learningStore } from "../src/lib/learning-store";
import { scalingSimulation } from "../src/lib/scaling";
import { selfImprovementEngine } from "../src/lib/self-improve";

/**
 * Unit Tests for Phase 5 Modules
 * Tests each production-ready system to ensure functionality and robustness
 */

async function testPhase5() {
  console.log('--- Starting Phase 5 Module Tests ---');

  // 1. Security Layer Tests
  console.log('\n1. Testing Security Layer:');
  try {
    const validKey = 'sk-123456789012345678901';
    console.log(`- API Key Validation: ${security.validateApiKey(validKey) ? 'PASSED' : 'FAILED'}`);
    
    const input = 'Hello world! <script>alert(1)</script>';
    const sanitized = security.sanitizeInput(input);
    console.log(`- Input Sanitization: ${!sanitized.includes('<script>') ? 'PASSED' : 'FAILED'}`);
    
    try {
      security.sanitizeInput('Contains eval(');
      console.log('- Blocked Keywords: FAILED');
    } catch (e) {
      if (e instanceof SecurityError) console.log('- Blocked Keywords: PASSED');
    }
  } catch (e) {
    console.error('Security tests failed:', e);
  }

  // 2. Feedback Loop Tests
  console.log('\n2. Testing Feedback Loop:');
  try {
    const feedback = await feedbackLoop.recordFeedback({
      projectId: 'test-project',
      rating: 4,
      comment: 'Excellent code generation!',
      category: 'accuracy'
    });
    console.log(`- Feedback Recording: ${feedback.id ? 'PASSED' : 'FAILED'}`);
    
    const trend = feedbackLoop.analyzeFeedbackTrends();
    console.log(`- Feedback Analysis: ${trend.averageRating === 4 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Feedback tests failed:', e);
  }

  // 3. Learning Store Tests
  console.log('\n3. Testing Learning Store:');
  try {
    const data = await learningStore.addLearningData({
      source: 'debugger',
      type: 'pattern',
      content: 'New Tailwind CSS pattern for cards',
      impact: 'medium'
    });
    console.log(`- Learning Store Addition: ${data.id ? 'PASSED' : 'FAILED'}`);
    
    const summary = learningStore.summarizeLearning();
    console.log(`- Learning Store Summary: ${summary.totalCount > 0 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Learning store tests failed:', e);
  }

  // 4. Scaling Simulation Tests
  console.log('\n4. Testing Scaling Simulation:');
  try {
    const initialMetrics = scalingSimulation.getMetrics();
    console.log(`- Initial Instance Count: ${initialMetrics.instanceCount}`);
    
    scalingSimulation.updateMetrics({ cpuUsage: 90 });
    const check = scalingSimulation.checkScaling(scalingSimulation.getMetrics());
    console.log(`- Scale Up Check: ${check.scaleUp ? 'PASSED' : 'FAILED'}`);
    
    const newMetrics = scalingSimulation.scale('up');
    console.log(`- Post-Scaling Instance Count: ${newMetrics.instanceCount}`);
    console.log(`- Performance Improvement: ${newMetrics.cpuUsage < 90 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Scaling tests failed:', e);
  }

  // 5. AI Debugger Tests
  console.log('\n5. Testing AI Debugger:');
  try {
    const files = {
      'components/Card.tsx': 'export const Card = () => { const apiKey = "sk-123"; return <div>Card</div>; }',
      'lib/large.ts': 'A'.repeat(21000)
    };
    
    const reports = aiDebugger.analyzeProject(files);
    console.log(`- Issue Detection: ${reports.length === 2 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Security Issue Detected: ${reports.some(r => r.type === 'security') ? 'PASSED' : 'FAILED'}`);
    console.log(`- Performance Issue Detected: ${reports.some(r => r.type === 'performance') ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('AI Debugger tests failed:', e);
  }

  // 6. Self-Improvement Engine Tests
  console.log('\n6. Testing Self-Improvement Engine:');
  try {
    const result = await selfImprovementEngine.runSelfImprovement();
    console.log(`- Self-Improvement Execution: ${result.improved ? 'PASSED' : 'FAILED'}`);
    console.log(`- Changes Applied: ${result.changesApplied}`);
    
    const report = await selfImprovementEngine.getPerformanceReport();
    console.log(`- Performance Report Generation: ${report.learningSummary.appliedCount > 0 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Self-Improvement tests failed:', e);
  }

  console.log('\n--- Phase 5 Module Tests Completed ---');
}

testPhase5();
