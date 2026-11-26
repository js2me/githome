import { useDiffSearchRegistrationOptional } from './components/diff-search';
import { GitDiffView } from './git-diff-view';
import type { GitDiffProps } from './model/git-diff-vm';

export const GitDiff = (props: GitDiffProps) => {
  const searchRegistration = useDiffSearchRegistrationOptional();
  return <GitDiffView {...props} searchRegistration={searchRegistration} />;
};
