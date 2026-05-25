// src/app/api/v1/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiError, zodErrorToApiError, unknownErrorToApiError } from '@/lib/api/response';
import { ErrorCode } from '@/lib/error-codes';
import { CreateProjectSchema, PaginationQuerySchema } from '@/lib/schemas';
import type { PaginatedResponse } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const { searchParams } = new URL(req.url);
    const pagination = PaginationQuerySchema.safeParse({
      cursor: searchParams.get('cursor'),
      limit: searchParams.get('limit'),
    });
    if (!pagination.success) return zodErrorToApiError(pagination.error);

    const { cursor, limit } = pagination.data;

    let query = supabase
      .from('projects')
      .select('id,name,description,status,created_at,updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) return unknownErrorToApiError(error, 'projects/list');

    const hasMore = (data?.length ?? 0) > limit;
    const items = hasMore ? data!.slice(0, limit) : (data ?? []);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.created_at : null;

    const response: PaginatedResponse<typeof items[0]> = {
      data: items,
      next_cursor: nextCursor,
      has_more: hasMore,
    };
    return apiSuccess(response);
  } catch (err) {
    return unknownErrorToApiError(err, 'projects/list');
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const body = await req.json().catch(() => null);
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) return zodErrorToApiError(parsed.error);

    const { data: project, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, ...parsed.data })
      .select('id,name,status,created_at')
      .single();

    if (error) return unknownErrorToApiError(error, 'projects/create');
    return apiSuccess(project, 201);
  } catch (err) {
    return unknownErrorToApiError(err, 'projects/create');
  }
}
