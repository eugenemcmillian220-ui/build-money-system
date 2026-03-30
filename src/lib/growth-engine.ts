/**
 * Growth Engine Module for Phase 6 - Autonomous AI Company Builder
 * Generates growth strategies, channel recommendations, and reach estimates
 */

export interface Channel {
  name: string;
  type: 'organic' | 'paid' | 'viral' | 'partnership';
  estimatedReach: string;
  costLevel: 'free' | 'low' | 'medium' | 'high';
  timeToResult: string;
}

export interface GrowthStrategy {
  idea: string;
  channels: Channel[];
  strategy: string;
  estimatedReach: string;
  estimatedReachNumber: number;
  tactics: string[];
  kpis: string[];
  timeline: string;
  timestamp: string;
}

const CHANNEL_LIBRARY: Channel[] = [
  { name: 'TikTok', type: 'viral', estimatedReach: '10k-1M', costLevel: 'free', timeToResult: '2-4 weeks' },
  { name: 'YouTube', type: 'organic', estimatedReach: '1k-100k', costLevel: 'free', timeToResult: '1-3 months' },
  { name: 'SEO / Content', type: 'organic', estimatedReach: '5k-500k', costLevel: 'low', timeToResult: '3-6 months' },
  { name: 'Product Hunt', type: 'viral', estimatedReach: '1k-20k', costLevel: 'free', timeToResult: '1-3 days' },
  { name: 'Twitter/X', type: 'viral', estimatedReach: '500-50k', costLevel: 'free', timeToResult: '1-2 weeks' },
  { name: 'LinkedIn', type: 'organic', estimatedReach: '500-10k', costLevel: 'free', timeToResult: '2-4 weeks' },
  { name: 'Google Ads', type: 'paid', estimatedReach: '10k-500k', costLevel: 'high', timeToResult: '1-7 days' },
  { name: 'Affiliate Program', type: 'partnership', estimatedReach: '1k-100k', costLevel: 'low', timeToResult: '1-3 months' },
  { name: 'API / Developer Community', type: 'organic', estimatedReach: '500-20k', costLevel: 'free', timeToResult: '1-2 months' },
];

const B2B_CHANNELS = ['LinkedIn', 'SEO / Content', 'Google Ads', 'Affiliate Program'];
const B2C_CHANNELS = ['TikTok', 'YouTube', 'Twitter/X', 'Product Hunt'];
const DEVELOPER_CHANNELS = ['API / Developer Community', 'Twitter/X', 'Product Hunt', 'SEO / Content'];

function selectChannels(idea: string): Channel[] {
  const lower = idea.toLowerCase();
  let channelNames: string[] = [];

  if (lower.includes('developer') || lower.includes('api') || lower.includes('engineer')) {
    channelNames = DEVELOPER_CHANNELS;
  } else if (lower.includes('business') || lower.includes('enterprise') || lower.includes('b2b')) {
    channelNames = B2B_CHANNELS;
  } else {
    channelNames = B2C_CHANNELS;
  }

  return CHANNEL_LIBRARY.filter(c => channelNames.includes(c.name));
}

function buildTactics(idea: string): string[] {
  const lower = idea.toLowerCase();
  const tactics = [
    'Launch on Product Hunt with a compelling story',
    'Create short-form video demos showing core value',
    'Publish weekly SEO content targeting problem keywords',
  ];

  if (lower.includes('ai')) tactics.push('Showcase AI capabilities with live demos and case studies');
  if (lower.includes('api')) tactics.push('Publish open-source tools and SDKs to attract developers');
  if (lower.includes('saas') || lower.includes('platform')) {
    tactics.push('Implement a referral program with mutual incentives');
  }

  return tactics;
}

export class GrowthEngine {
  launchGrowth(idea: string): GrowthStrategy {
    const channels = selectChannels(idea);
    const tactics = buildTactics(idea);
    const reach = this.estimateReach(channels);

    return {
      idea,
      channels,
      strategy: 'Short-form viral content + SEO-driven organic growth + community building',
      estimatedReach: `${(reach / 1000).toFixed(0)}k users in 90 days`,
      estimatedReachNumber: reach,
      tactics,
      kpis: ['Monthly Active Users', 'Conversion Rate', 'Customer Acquisition Cost', 'Churn Rate', 'NPS'],
      timeline: '30-90 days to first 1,000 users',
      timestamp: new Date().toISOString(),
    };
  }

  identifyChannels(idea: string): Channel[] {
    return selectChannels(idea);
  }

  estimateReach(channels: Channel[]): number {
    const estimates: Record<string, number> = {
      viral: 50000,
      organic: 20000,
      paid: 100000,
      partnership: 15000,
    };
    return channels.reduce((sum, c) => sum + (estimates[c.type] ?? 10000), 0);
  }
}

export const growthEngine = new GrowthEngine();
