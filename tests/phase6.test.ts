import { IdeaValidator, ideaValidator } from '../src/lib/idea-validator';
import { ProductPlanner, productPlanner } from '../src/lib/product-planner';
import { AITeam, aiTeam } from '../src/lib/ai-team';
import { GrowthEngine, growthEngine } from '../src/lib/growth-engine';
import { MonetizationEngine, monetizationEngine } from '../src/lib/monetization';
import { AnalyticsEngine } from '../src/lib/analytics';
import { Marketplace } from '../src/lib/marketplace';
import { BillingSystem } from '../src/lib/billing';
import { CompanyOrchestrator } from '../src/lib/company-orchestrator';

/**
 * Unit Tests for Phase 6 Modules
 * Tests the full Autonomous AI Company Builder system
 */

async function testPhase6() {
  console.log('--- Starting Phase 6 Module Tests ---');

  // 1. Idea Validator Tests
  console.log('\n1. Testing Idea Validator:');
  try {
    const validator = new IdeaValidator();
    const result = await validator.validateIdea('AI SaaS platform for developers');
    console.log(`- Validation Result: ${result.score !== undefined ? 'PASSED' : 'FAILED'}`);
    console.log(`- Verdict Defined: ${result.verdict ? 'PASSED' : 'FAILED'}`);
    console.log(`- Risks Array: ${Array.isArray(result.risks) ? 'PASSED' : 'FAILED'}`);
    console.log(`- Suggestions Array: ${Array.isArray(result.suggestions) ? 'PASSED' : 'FAILED'}`);
    console.log(`- Timestamp Set: ${result.timestamp ? 'PASSED' : 'FAILED'}`);

    const market = await validator.analyzeMarket('AI SaaS platform');
    console.log(`- Market Analysis: ${market.targetAudience ? 'PASSED' : 'FAILED'}`);

    const risks = await validator.assessRisks('AI marketplace');
    console.log(`- Risk Assessment: ${risks.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Risk Has Severity: ${risks[0].severity ? 'PASSED' : 'FAILED'}`);
    console.log(`- Risk Has Mitigation: ${risks[0].mitigation ? 'PASSED' : 'FAILED'}`);

    const notViable = await validator.validateIdea('x');
    console.log(`- Short Idea Low Score: ${notViable.score < 80 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Idea Validator tests failed:', e);
  }

  // 2. Product Planner Tests
  console.log('\n2. Testing Product Planner:');
  try {
    const planner = new ProductPlanner();
    const plan = planner.planProduct('AI SaaS builder with marketplace');
    console.log(`- Plan Has Features: ${plan.features.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Plan Has Stack: ${plan.stack.frontend.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Plan Has Timeline: ${plan.timeline ? 'PASSED' : 'FAILED'}`);
    console.log(`- Plan Has MVP Features: ${plan.mvpFeatures.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Plan Has Phases: ${plan.phases.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Phases Have Deliverables: ${plan.phases[0].deliverables.length > 0 ? 'PASSED' : 'FAILED'}`);

    const features = planner.generateFeatures('marketplace shop payment');
    console.log(`- Marketplace Features: ${features.some(f => f.toLowerCase().includes('payment')) ? 'PASSED' : 'FAILED'}`);

    const stack = planner.determineTechStack('AI automation platform');
    console.log(`- AI Stack Addition: ${stack.backend.some(s => s.includes('OpenRouter')) ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Product Planner tests failed:', e);
  }

  // 3. AI Team Tests
  console.log('\n3. Testing AI Team:');
  try {
    const team = new AITeam();
    const tasks = [
      { role: 'pm' as const, input: 'Build a SaaS dashboard' },
      { role: 'engineer' as const, input: 'Build a SaaS dashboard' },
      { role: 'designer' as const, input: 'Design the UI' },
    ];
    const results = await team.runTeamTasks(tasks);
    console.log(`- Team Tasks Count: ${results.length === 3 ? 'PASSED' : 'FAILED'}`);
    console.log(`- PM Result: ${results[0].role === 'pm' ? 'PASSED' : 'FAILED'}`);
    console.log(`- Engineer Artifacts: ${results[1].artifacts.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Completed At Set: ${results[2].completedAt ? 'PASSED' : 'FAILED'}`);

    const singleResult = await team.assignRole('marketer', 'Launch campaign');
    console.log(`- Single Role Assignment: ${singleResult.role === 'marketer' ? 'PASSED' : 'FAILED'}`);
    console.log(`- Marketer Has Artifacts: ${singleResult.artifacts.length > 0 ? 'PASSED' : 'FAILED'}`);

    const roles = team.getAllRoles();
    console.log(`- All 5 Roles Defined: ${roles.length === 5 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('AI Team tests failed:', e);
  }

  // 4. Growth Engine Tests
  console.log('\n4. Testing Growth Engine:');
  try {
    const engine = new GrowthEngine();
    const strategy = await engine.launchGrowth('AI developer tool');
    console.log(`- Strategy Has Channels: ${strategy.channels.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Strategy Has Content Calendar: ${strategy.contentCalendar.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Viral Mechanics Defined: ${strategy.viralMechanics.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Milestones Defined: ${strategy.milestones.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Partnerships Defined: ${strategy.partnerships.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- GeneratedAt Set: ${strategy.generatedAt ? 'PASSED' : 'FAILED'}`);

    const strategy2 = await engine.launchGrowth('b2b enterprise software');
    console.log(`- B2B Strategy Has Channels: ${strategy2.channels.length > 0 ? 'PASSED' : 'FAILED'}`);

    console.log(`- Channel Has Tactics: ${strategy2.channels[0]?.tactics.length > 0 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Growth Engine tests failed:', e);
  }

  // 5. Monetization Engine Tests
  console.log('\n5. Testing Monetization Engine:');
  try {
    const engine = new MonetizationEngine();
    const plan = await engine.startMonetization('AI SaaS builder');
    console.log(`- Plan Has Model: ${plan.model ? 'PASSED' : 'FAILED'}`);
    console.log(`- Plan Has Tiers: ${plan.tiers.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Rationale Set: ${plan.rationale ? 'PASSED' : 'FAILED'}`);
    console.log(`- Upsell Strategies Set: ${plan.upsellStrategies.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Revenue Projection MRR: ${plan.revenueProjection.month12MRR ? 'PASSED' : 'FAILED'}`);
    console.log(`- Churn Mitigation Set: ${plan.churnMitigation.length > 0 ? 'PASSED' : 'FAILED'}`);

    const plan2 = await engine.startMonetization('api marketplace');
    console.log(`- API Plan Has Tiers: ${plan2.tiers.length > 0 ? 'PASSED' : 'FAILED'}`);

    const plan3 = await engine.generateMonetizationPlan('marketplace platform');
    console.log(`- Marketplace Plan Generated: ${plan3.upsellStrategies.length > 0 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Monetization Engine tests failed:', e);
  }

  // 6. Analytics Engine Tests
  console.log('\n6. Testing Analytics Engine:');
  try {
    const engine = new AnalyticsEngine();
    const metric = engine.trackMetric({ name: 'page_view', value: 1, category: 'engagement' });
    console.log(`- Metric Tracked: ${metric.id ? 'PASSED' : 'FAILED'}`);
    console.log(`- Metric Has Timestamp: ${metric.timestamp ? 'PASSED' : 'FAILED'}`);
    console.log(`- Metric Has TS: ${metric.ts > 0 ? 'PASSED' : 'FAILED'}`);

    engine.trackMetric({ name: 'page_view', value: 2, category: 'engagement' });
    engine.trackMetric({ name: 'conversion', value: 1, category: 'revenue' });

    const all = engine.getMetrics();
    console.log(`- Get All Metrics: ${all.length === 3 ? 'PASSED' : 'FAILED'}`);

    const filtered = engine.getMetrics({ name: 'page_view' });
    console.log(`- Filtered Metrics: ${filtered.length === 2 ? 'PASSED' : 'FAILED'}`);

    const report = engine.generateReport({ from: new Date(Date.now() - 3600000), to: new Date() });
    console.log(`- Report Generated: ${report.totalMetrics === 3 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Report Has Summary: ${report.summary.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Top Events: ${report.topEvents.length > 0 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Analytics Engine tests failed:', e);
  }

  // 7. Marketplace Tests
  console.log('\n7. Testing Marketplace:');
  try {
    const market = new Marketplace();
    const listing = market.addListing({
      title: 'AI Code Generator Module',
      description: 'Generates production-ready code with AI',
      category: 'AI Tools',
      price: 49,
      sellerId: 'seller-001',
      tags: ['ai', 'code'],
    });
    console.log(`- Listing Created: ${listing.id ? 'PASSED' : 'FAILED'}`);
    console.log(`- Listing Status Active: ${listing.status === 'active' ? 'PASSED' : 'FAILED'}`);
    console.log(`- Purchase Count Zero: ${listing.purchaseCount === 0 ? 'PASSED' : 'FAILED'}`);

    const listings = market.getListings();
    console.log(`- Get Listings: ${listings.length === 1 ? 'PASSED' : 'FAILED'}`);

    const filtered = market.getListings({ category: 'AI Tools' });
    console.log(`- Category Filter: ${filtered.length === 1 ? 'PASSED' : 'FAILED'}`);

    const noMatch = market.getListings({ maxPrice: 10 });
    console.log(`- Price Filter: ${noMatch.length === 0 ? 'PASSED' : 'FAILED'}`);

    const purchase = market.purchaseListing(listing.id, 'buyer-001');
    console.log(`- Purchase Created: ${purchase.id ? 'PASSED' : 'FAILED'}`);
    console.log(`- Purchase Amount: ${purchase.amount === 49 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Purchase Status: ${purchase.status === 'completed' ? 'PASSED' : 'FAILED'}`);

    const history = market.getPurchaseHistory('buyer-001');
    console.log(`- Purchase History: ${history.length === 1 ? 'PASSED' : 'FAILED'}`);

    const review = market.addReview(listing.id, 'buyer-001', 5, 'Excellent module!');
    console.log(`- Review Created: ${review.id ? 'PASSED' : 'FAILED'}`);

    const reviewed = market.getListing(listing.id);
    console.log(`- Listing Rating Updated: ${reviewed?.rating === 5 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Review Count Updated: ${reviewed?.reviewCount === 1 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Marketplace tests failed:', e);
  }

  // 8. Billing System Tests
  console.log('\n8. Testing Billing System:');
  try {
    const billing = new BillingSystem();
    const plans = billing.getAvailablePlans();
    console.log(`- Plans Available: ${plans.length === 3 ? 'PASSED' : 'FAILED'}`);

    const proPlan = billing.getPlan('pro');
    console.log(`- Get Plan By ID: ${proPlan?.name === 'Pro' ? 'PASSED' : 'FAILED'}`);

    const notFound = billing.getPlan('nonexistent');
    console.log(`- Null For Unknown Plan: ${notFound === null ? 'PASSED' : 'FAILED'}`);

    const subscription = billing.createSubscription('user-001', proPlan!, 'monthly');
    console.log(`- Subscription Created: ${subscription.id ? 'PASSED' : 'FAILED'}`);
    console.log(`- Subscription Active: ${subscription.status === 'active' ? 'PASSED' : 'FAILED'}`);
    console.log(`- Billing Cycle Set: ${subscription.billingCycle === 'monthly' ? 'PASSED' : 'FAILED'}`);
    console.log(`- Period Dates Set: ${subscription.currentPeriodStart && subscription.currentPeriodEnd ? 'PASSED' : 'FAILED'}`);

    const fetched = billing.getSubscription('user-001');
    console.log(`- Get Subscription: ${fetched?.id === subscription.id ? 'PASSED' : 'FAILED'}`);

    const noSub = billing.getSubscription('nonexistent-user');
    console.log(`- Null For No Subscription: ${noSub === null ? 'PASSED' : 'FAILED'}`);

    const payment = billing.processPayment('user-001', 29, 'Monthly Pro plan');
    console.log(`- Payment Processed: ${payment.id ? 'PASSED' : 'FAILED'}`);
    console.log(`- Payment Succeeded: ${payment.status === 'succeeded' ? 'PASSED' : 'FAILED'}`);
    console.log(`- Payment Amount: ${payment.amount === 29 ? 'PASSED' : 'FAILED'}`);

    const invoice = billing.generateInvoice('user-001', subscription.id, [
      { description: 'Pro Plan', amount: 29, quantity: 1 },
    ]);
    console.log(`- Invoice Generated: ${invoice.id ? 'PASSED' : 'FAILED'}`);
    console.log(`- Invoice Amount: ${invoice.amount === 29 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Invoice Unpaid: ${invoice.status === 'unpaid' ? 'PASSED' : 'FAILED'}`);

    const cancelled = billing.cancelSubscription('user-001');
    console.log(`- Subscription Cancelled: ${cancelled?.status === 'cancelled' ? 'PASSED' : 'FAILED'}`);

    const afterCancel = billing.getSubscription('user-001');
    console.log(`- No Active Sub After Cancel: ${afterCancel === null ? 'PASSED' : 'FAILED'}`);

    const enterprisePlan = billing.getPlan('enterprise')!;
    const yearlySub = billing.createSubscription('user-002', enterprisePlan, 'yearly');
    console.log(`- Yearly Subscription: ${yearlySub.billingCycle === 'yearly' ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Billing System tests failed:', e);
  }

  // 9. Company Orchestrator Tests
  console.log('\n9. Testing Company Orchestrator:');
  try {
    const orchestrator = new CompanyOrchestrator();
    const result = await orchestrator.buildCompany('AI SaaS builder for startups');
    console.log(`- Build Company Result: ${result.buildId ? 'PASSED' : 'FAILED'}`);
    console.log(`- Validation Defined: ${result.validation !== undefined ? 'PASSED' : 'FAILED'}`);
    console.log(`- Plan Defined: ${result.plan !== undefined ? 'PASSED' : 'FAILED'}`);
    console.log(`- Team Output: ${result.teamOutput.length === 5 ? 'PASSED' : 'FAILED'}`);
    console.log(`- Growth Defined: ${result.growth !== undefined ? 'PASSED' : 'FAILED'}`);
    console.log(`- Revenue Defined: ${result.revenue !== undefined ? 'PASSED' : 'FAILED'}`);
    console.log(`- Completed At Set: ${result.completedAt ? 'PASSED' : 'FAILED'}`);
    console.log(`- Viable Boolean: ${typeof result.viable === 'boolean' ? 'PASSED' : 'FAILED'}`);

    const validation = await orchestrator.validateOnly('AI automation tool for developers');
    console.log(`- Validate Only: ${validation.score !== undefined ? 'PASSED' : 'FAILED'}`);

    const plan = await orchestrator.planOnly('marketplace for AI modules');
    console.log(`- Plan Only: ${plan.features.length > 0 ? 'PASSED' : 'FAILED'}`);
  } catch (e) {
    console.error('Company Orchestrator tests failed:', e);
  }

  console.log('\n--- Phase 6 Module Tests Completed ---');
}

testPhase6();
