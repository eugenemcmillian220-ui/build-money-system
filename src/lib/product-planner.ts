/**
 * Product Planner Module for Phase 6 - Autonomous AI Company Builder
 * Generates product plans, feature lists, and technology stacks from business ideas
 */

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
}

export interface ProductPlan {
  idea: string;
  features: string[];
  stack: TechStack;
  timeline: string;
  mvpFeatures: string[];
  phases: ProductPhase[];
  timestamp: string;
}

export interface ProductPhase {
  name: string;
  duration: string;
  deliverables: string[];
}

const BASE_STACK: TechStack = {
  frontend: ['Next.js', 'Tailwind CSS', 'React'],
  backend: ['Next.js API Routes', 'Node.js'],
  database: ['Supabase', 'PostgreSQL'],
  infrastructure: ['Vercel', 'GitHub'],
};

const AI_STACK_ADDITIONS: Partial<TechStack> = {
  backend: ['OpenRouter', 'LangChain'],
  infrastructure: ['OpenAI API'],
};

const MARKETPLACE_ADDITIONS: Partial<TechStack> = {
  backend: ['Stripe API'],
  database: ['Redis'],
};

function mergeStacks(base: TechStack, addition: Partial<TechStack>): TechStack {
  const merged = { ...base };
  for (const key of Object.keys(addition) as (keyof TechStack)[]) {
    if (addition[key]) {
      merged[key] = [...new Set([...base[key], ...(addition[key] as string[])])];
    }
  }
  return merged;
}

export class ProductPlanner {
  planProduct(idea: string): ProductPlan {
    const features = this.generateFeatures(idea);
    const stack = this.determineTechStack(idea);
    const phases = this.buildPhases(features);

    return {
      idea,
      features,
      stack,
      timeline: phases.map(p => p.duration).join(' → '),
      mvpFeatures: features.slice(0, 3),
      phases,
      timestamp: new Date().toISOString(),
    };
  }

  generateFeatures(idea: string): string[] {
    const lower = idea.toLowerCase();
    const features: string[] = ['User authentication', 'Dashboard', 'AI core engine'];

    if (lower.includes('marketplace') || lower.includes('shop')) {
      features.push('Product listings', 'Shopping cart', 'Payment processing');
    }
    if (lower.includes('api') || lower.includes('integration')) {
      features.push('REST API', 'Webhook support', 'API key management');
    }
    if (lower.includes('analytics') || lower.includes('data')) {
      features.push('Analytics dashboard', 'Custom reports', 'Data exports');
    }
    if (lower.includes('team') || lower.includes('collaboration')) {
      features.push('Team workspaces', 'Role-based access', 'Activity feed');
    }

    features.push('Notifications', 'Settings management', 'Billing & subscriptions');
    return features;
  }

  determineTechStack(idea: string): TechStack {
    const lower = idea.toLowerCase();
    let stack = { ...BASE_STACK };

    if (lower.includes('ai') || lower.includes('automation') || lower.includes('ml')) {
      stack = mergeStacks(stack, AI_STACK_ADDITIONS);
    }
    if (lower.includes('marketplace') || lower.includes('payment') || lower.includes('billing')) {
      stack = mergeStacks(stack, MARKETPLACE_ADDITIONS);
    }

    return stack;
  }

  private buildPhases(features: string[]): ProductPhase[] {
    return [
      {
        name: 'MVP',
        duration: '2-3 weeks',
        deliverables: features.slice(0, 3),
      },
      {
        name: 'Beta',
        duration: '3-4 weeks',
        deliverables: features.slice(3, 6),
      },
      {
        name: 'Launch',
        duration: '1-2 weeks',
        deliverables: features.slice(6),
      },
    ];
  }
}

export const productPlanner = new ProductPlanner();
