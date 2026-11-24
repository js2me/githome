import { withPropsViewModel } from "mobx-view-model-react";
import { codeFontSizeKey, wrapSourceCodeKey } from "@/shared/lib/code-view-preferences";
import { cn } from "@/shared/lib/cn";
import { HighlightedSourceCodeVM } from "./highlighted-source-code/model";

export const HighlightedSourceCode = withPropsViewModel(
  HighlightedSourceCodeVM,
  ({ model }) => {
    return (
      <pre
        className={cn(
          "m-0 overflow-auto font-mono leading-relaxed text-slate-800 dark:text-slate-300",
          wrapSourceCodeKey.value ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "whitespace-pre",
        )}
        style={{ fontSize: `${codeFontSizeKey.value}px` }}
      >
        {model.usePlainText || !model.html ? model.payload.content : (
          <code dangerouslySetInnerHTML={{ __html: model.html }} />
        )}
      </pre>
    );
  },
);
