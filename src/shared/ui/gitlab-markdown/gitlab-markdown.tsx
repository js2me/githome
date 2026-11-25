import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { GitlabMarkdownVM } from './model';
import './styles.css';

export const GitLabMarkdown = withPropsViewModel(
  GitlabMarkdownVM,
  ({ model }) => {
    const { className, italic, text } = model.payload;
    const { html, hasError, hasScope, container } = model;

    if (!text.trim()) {
      return null;
    }

    if (!hasScope || hasError) {
      return (
        <div
          className={cn(
            'whitespace-pre-wrap break-words text-sm leading-relaxed',
            italic && 'text-slate-500 italic dark:text-slate-400',
            className,
          )}
        >
          {text}
        </div>
      );
    }

    if (html === null) {
      return (
        <div
          className={cn(
            'animate-pulse rounded-md bg-slate-100 text-slate-400 text-sm dark:bg-slate-800',
            className,
          )}
        >
          &nbsp;
        </div>
      );
    }

    return (
      <div
        ref={container}
        className={cn(
          'gitlab-markdown min-w-0 max-w-full',
          italic && 'text-slate-500 italic dark:text-slate-400',
          className,
        )}
      />
    );
  },
);
