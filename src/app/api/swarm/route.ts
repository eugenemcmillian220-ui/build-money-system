import { NextRequest, NextResponse } from 'next/server';
import { AgentSwarm } from '@/lib/agent-swarm';
import { ProjectStatus } from '@/lib/types';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await req.json();
    const { prompt, projectId } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'A prompt string is required' }, { status: 400 });
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'A projectId string is required' }, { status: 400 });
    }

    const swarm = new AgentSwarm(projectId);

    // Execute swarm build with progress reporting
    const files = await swarm.executeSwarmBuild(prompt, (status: ProjectStatus) => {
      console.log(`[Swarm Progress] ${status.phase}: ${status.message}`);
    });

    return NextResponse.json({
      success: true,
      files,
      tasks: swarm.getTasks(),
      projectId,
    });
  } catch (error) {
    console.error('Swarm Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Swarm build failed' },
      { status: 500 }
    );
  }
}
