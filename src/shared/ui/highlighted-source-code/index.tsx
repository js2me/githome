import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import {
  codeFontSizeKey,
  wrapSourceCodeKey,
} from '@/shared/lib/code-view-preferences';
import { HighlightedSourceCodeVM } from './model';

export const HighlightedSourceCode = withPropsViewModel(
  HighlightedSourceCodeVM,
  ({ model }) => {
    return (
      <pre
        className={cn(
          'm-0 overflow-auto font-mono text-slate-800 leading-relaxed dark:text-slate-300',
          wrapSourceCodeKey.value
            ? 'whitespace-pre-wrap [overflow-wrap:anywhere]'
            : 'whitespace-pre',
        )}
        style={{ fontSize: `${codeFontSizeKey.value}px` }}
      >
        {model.tokens ? (
          <code>
            {model.tokens.map((token) => {
              const flags = token.fontStyle ?? 0;
              return (
                <span
                  key={token.offset}
                  style={{
                    color: token.color,
                    fontStyle: flags & 1 ? 'italic' : undefined,
                    fontWeight: flags & 2 ? 'bold' : undefined,
                    textDecoration: flags & 4 ? 'underline' : undefined,
                  }}
                >
                  {token.content}
                </span>
              );
            })}
          </code>
        ) : (
          model.payload.content
        )}
      </pre>
    );
  },
);
