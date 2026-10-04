export interface GitLabProjectDC {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  avatar_url?: string | null;
  last_activity_at?: string | null;
  default_branch?: string | null;
  permissions?: {
    project_access?: { access_level?: number | null } | null;
    group_access?: { access_level?: number | null } | null;
  } | null;
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
  head_pipeline?: {
    id: number;
    status: string;
    web_url: string;
  } | null;
}

export interface GitLabPipelineDC {
  id: number;
  iid: number;
  project_id: number;
  status: string;
  source?: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  queued_duration?: number | null;
  user?: {
    name?: string;
    username?: string;
    avatar_url?: string | null;
  } | null;
}

export interface GitLabJobDC {
  id: number;
  name: string;
  stage: string;
  status: string;
  allow_failure?: boolean;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  web_url?: string;
  failure_reason?: string | null;
}

export interface GitLabPipelineVariableDC {
  key: string;
  value: string;
  variable_type?: "env_var" | "file";
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

export interface GitLabHighlightedDiffLineDC {
  type?: string | null;
  old_line?: number | null;
  new_line?: number | null;
  text?: string | null;
  rich_text?: string | null;
}

export interface GitLabDiffsBatchFileDC {
  old_path: string;
  new_path: string;
  diff?: string;
  new_file?: boolean;
  renamed_file?: boolean;
  deleted_file?: boolean;
  too_large?: boolean;
  collapsed?: boolean;
  generated_file?: boolean;
  added_lines?: number;
  removed_lines?: number;
  file_hash?: string;
  highlighted_diff_lines?: GitLabHighlightedDiffLineDC[];
}

export interface GitLabMergeRequestVersionDC {
  id: number;
  head_commit_sha: string;
  base_commit_sha: string;
  start_commit_sha: string;
  created_at: string;
}

export interface GitLabDiffsBatchResponseDC {
  diff_files: GitLabDiffsBatchFileDC[];
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
    id?: number;
    name?: string;
    username?: string;
    avatar_url?: string | null;
  };
  created_at: string;
  updated_at: string;
  system?: boolean;
  resolvable?: boolean;
  resolved?: boolean;
  can_update?: boolean;
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

export interface GitLabCommitDC {
  id: string;
  short_id: string;
  title: string;
  author_name: string;
  committed_date: string;
  created_at: string;
  message: string;
}

export interface GitLabBranchDC {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
}

export interface GitLabRepositoryTreeItemDC {
  id: string;
  name: string;
  type: "tree" | "blob";
  path: string;
  mode: string;
}

export interface GitLabSearchBlobDC {
  basename: string;
  data: string;
  path: string;
  filename: string;
  id: string | null;
  ref: string;
  startline: number;
  project_id: number;
  group_id: number | null;
}

export interface GitLabProjectReadmeDC {
  file_name: string;
  file_path: string;
  content: string;
  encoding?: string;
}

export interface GitLabMarkdownUploadDC {
  id: number;
  alt: string;
  url: string;
  full_path: string;
  markdown: string;
}
