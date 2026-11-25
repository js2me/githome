import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';
import { isImagePath } from '@/shared/lib/image-path';

export const isImageChange = (change: GitLabMergeRequestChangeDC) =>
  isImagePath(change.old_path) || isImagePath(change.new_path);
