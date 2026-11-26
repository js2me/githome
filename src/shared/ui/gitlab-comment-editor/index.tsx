import { useGitLabConnection } from '@/shared/lib/gitlab/connection/connection-context';
import { Editor } from './editor';
import type { GitlabCommentEditorProps } from './model';

export const GitlabCommentEditor = ({
  inputRef,
  onChange,
  onInput,
  onPaste,
  projectId,
  wrapperClassName,
  editorClassName,
  ...textareaProps
}: GitlabCommentEditorProps) => (
  <Editor
    connection={useGitLabConnection()}
    inputRef={inputRef}
    onChange={onChange}
    onInput={onInput}
    onPaste={onPaste}
    projectId={projectId}
    wrapperClassName={wrapperClassName}
    editorClassName={editorClassName}
    textareaProps={textareaProps}
  />
);
