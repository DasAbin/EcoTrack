import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing score id' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error, count } = await supabase
      .from('scores')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete score error:', error);
      return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
    }

    if ((count ?? 0) < 1) {
      return NextResponse.json(
        {
          error: 'Could not delete this log',
          hint: 'Your Supabase project likely needs Row Level Security policies for DELETE (and SELECT on your own rows). Open supabase/fix_scores_delete_rls.sql in this repo and run it in the Supabase SQL editor.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete score route:', e);
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}
