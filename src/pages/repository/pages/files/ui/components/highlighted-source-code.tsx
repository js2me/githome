import { withPropsViewModel } from "mobx-view-model";
import { HighlightedSourceCodeVM } from "./highlighted-source-code/model";

const sourceCodeClassName =
  "m-0 overflow-auto whitespace-pre font-mono text-[13px] leading-relaxed text-slate-800 dark:text-slate-300";

export const HighlightedSourceCode = withPropsViewModel(
  HighlightedSourceCodeVM,
  ({ model }) => {
    if (model.usePlainText || !model.html) {
      return (
        <pre className={sourceCodeClassName}>{model.payload.content}</pre>
      );
    }

    return (
      <pre className={sourceCodeClassName}>
        <code dangerouslySetInnerHTML={{ __html: model.html }} />
      </pre>
    );
  },
);
