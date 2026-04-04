import { supabase } from '@/lib/db/client';
import type { ComplianceIssueComment } from '@/types';

const TABLE = 'compliance_issue_comments';

export async function findByIssueId(
  issueId: string,
): Promise<ComplianceIssueComment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function create(
  input: Omit<ComplianceIssueComment, 'id' | 'created_at'>,
): Promise<ComplianceIssueComment> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
