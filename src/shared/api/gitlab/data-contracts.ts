export interface GitLabProjectDC {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  avatar_url?: string | null;
  last_activity_at?: string | null;
  default_branch?: string | null;
}

export interface GitLabMergeRequestDC {
  id: number;
  iid: number;
  title: string;
  web_url: string;
  state: string;
  draft?: boolean;
  work_in_progress?: boolean;
  source_branch: string;
  target_branch: string;
  updated_at: string;
  created_at?: string;
  merged_at?: string | null;
  closed_at?: string | null;
  description?: string | null;
  labels?: string[];
  merge_status?: string;
  has_conflicts?: boolean;
  user_notes_count?: number;
  changes_count?: string;
  author?: {
    name?: string;
    avatar_url?: string | null;
  };
  assignees?: Array<{ name?: string }>;
  diff_refs?: {
    base_sha?: string;
    head_sha?: string;
    start_sha?: string;
  } | null;
}

export interface GitLabMergeRequestChangeDC {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  too_large?: boolean;
  collapsed?: boolean;
  generated_file?: boolean;
  added_lines?: number;
  removed_lines?: number;
  file_hash?: string;
}

export interface GitLabNotePositionLinePointDC {
  type?: string | null;
  old_line?: number | null;
  new_line?: number | null;
  line_code?: string | null;
}

export interface GitLabNotePositionDC {
  old_path?: string | null;
  new_path?: string | null;
  old_line?: number | null;
  new_line?: number | null;
  line_range?: {
    start?: GitLabNotePositionLinePointDC | null;
    end?: GitLabNotePositionLinePointDC | null;
  } | null;
}

export interface GitLabNoteDC {
  id: number;
  type?: string | null;
  body: string;
  author?: {
    name?: string;
    username?: string;
    avatar_url?: string | null;
  };
  created_at: string;
  updated_at: string;
  system?: boolean;
  resolvable?: boolean;
  resolved?: boolean;
  position?: GitLabNotePositionDC | null;
}

export interface GitLabDiscussionDC {
  id: string;
  individual_note: boolean;
  notes: GitLabNoteDC[];
}

export interface GitLabUserDC {
  id: number;
  name: string;
  username: string;
  avatar_url?: string | null;
}

export interface GitLabMergeRequestApprovalsDC {
  approvals_required?: number;
  approvals_left?: number;
  approved?: boolean;
  approved_by?: Array<{
    user: GitLabUserDC;
    approved_at: string;
  }>;
}

export interface GitLabMergeRequestReviewerDC {
  user: GitLabUserDC;
  state: string;
  created_at: string;
}

export interface GitLabProjectReadmeDC {
  file_name: string;
  file_path: string;
  content: string;
  encoding?: string;
}
