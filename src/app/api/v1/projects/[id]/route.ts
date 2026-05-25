// src/app/api/v1/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiError, zodErrorToApiError, unknownErrorToApiError } from '@/lib/api/response';
import { ErrorCode } from '@/lib/error-codes';
import { UpdateProjectSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const body = await req.json().catch(() => null);
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) return zodErrorToApiError(parsed.error);

    const { data, error } = await supabase
      .from('projects')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id,name,status,updated_at')
      .single();

    if (error || !data) return apiError(ErrorCode.FORBIDDEN);
    return apiSuccess(data);
  } catch (err) {
    return unknownErrorToApiError(err, 'projects/update');
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(ErrorCode.NOT_AUTHENTICATED);

    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return apiError(ErrorCode.FORBIDDEN);
    return apiSuccess({ deleted: true });
  } catch (err) {
    return unknownErrorToApiError(err, 'projects/delete');
  }
}
