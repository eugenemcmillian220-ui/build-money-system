export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { feedbackLoop } from '@/lib/feedback-loop';
import { security, SecurityError } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get('projectId');

    if (projectId) {
      const feedback = feedbackLoop.getFeedbackForProject(projectId);
      return NextResponse.json({ success: true, data: { feedback } });
    }

    const feedback = feedbackLoop.getAllFeedback();
    const trends = feedbackLoop.analyzeFeedbackTrends();

    return NextResponse.json({ success: true, data: { feedback, trends } });
  } catch (error) {
    console.error('Feedback GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve feedback' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await req.json();
    const { projectId, rating, comment, category } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be a number between 1 and 5' }, { status: 400 });
    }

    if (!category || !['accuracy', 'performance', 'style', 'completeness', 'other'].includes(category)) {
      return NextResponse.json({ error: 'category must be one of: accuracy, performance, style, completeness, other' }, { status: 400 });
    }

    // Sanitize comment if provided
    const sanitizedComment = comment ? security.sanitizeInput(comment) : undefined;

    const feedback = await feedbackLoop.recordFeedback({
      projectId,
      rating,
      comment: sanitizedComment,
      category,
    });

    return NextResponse.json({ success: true, data: feedback }, { status: 201 });
  } catch (error) {
    console.error('Feedback POST Error:', error);
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
