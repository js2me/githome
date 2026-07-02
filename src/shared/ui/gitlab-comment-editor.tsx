import {
  Bold,
  Code,
  Italic,
  Link,
  ListOl,
  ListUl,
  Picture,
  QuoteOpen,
  Strikethrough,
} from "@gravity-ui/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { gitlabApi } from "@/shared/api/gitlab";
import {
  insertMarkdownCode,
  insertMarkdownLink,
  prefixMarkdownLines,
  wrapMarkdownSelection,
  type MarkdownSelection,
  type MarkdownSelectionResult,
} from "@/shared/lib/markdown/insert-markdown-at-selection";
import { useGitLabConnection } from "@/shared/lib/gitlab/connection-context";
import { cn } from "@/shared/lib/cn";

const getClipboardImageFile = (
  clipboardData: DataTransfer | null,
): File | null => {
  if (!clipboardData) {
    return null;
  }

  for (const item of Array.from(clipboardData.items)) {
    if (!item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile();
    if (file) {
      return file;
    }
  }

  return null;
};

const ToolbarButton = ({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

type GitlabCommentEditorProps = Omit<
  ComponentPropsWithoutRef<"textarea">,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  editorClassName?: string;
  projectId?: number | null;
};

export const GitlabCommentEditor = ({
  value,
  onChange,
  disabled,
  className,
  wrapperClassName,
  editorClassName,
  projectId = null,
  onPaste,
  ...textareaProps
}: GitlabCommentEditorProps) => {
  const connection = useGitLabConnection();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSelectionRef = useRef<{
    start: number;
    end: number;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingSelectionRef.current === null || !textareaRef.current) {
      return;
    }

    const { start, end } = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    textareaRef.current.selectionStart = start;
    textareaRef.current.selectionEnd = end;
    textareaRef.current.focus();
  }, [value]);

  const getCurrentSelection = useCallback((): MarkdownSelection | null => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return null;
    }

    return {
      value,
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    };
  }, [value]);

  const applyMarkdown = useCallback(
    (
      transform: (selection: MarkdownSelection) => MarkdownSelectionResult,
    ) => {
      const selection = getCurrentSelection();
      if (!selection || disabled || isUploadingImage) {
        return;
      }

      const result = transform(selection);
      pendingSelectionRef.current = {
        start: result.selectionStart,
        end: result.selectionEnd,
      };
      onChange(result.value);
    },
    [disabled, getCurrentSelection, isUploadingImage, onChange],
  );

  const insertUploadedImageMarkdown = useCallback(
    async (imageFile: File, selectionStart: number, selectionEnd: number) => {
      if (!connection || !projectId) {
        return;
      }

      setIsUploadingImage(true);
      setUploadError(null);

      try {
        const upload = await gitlabApi.uploadProjectMarkdown(
          connection,
          projectId,
          imageFile,
        );
        const markdown = upload.markdown;
        const nextValue =
          value.slice(0, selectionStart) +
          markdown +
          value.slice(selectionEnd);

        pendingSelectionRef.current = {
          start: selectionStart + markdown.length,
          end: selectionStart + markdown.length,
        };
        onChange(nextValue);
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить изображение",
        );
      } finally {
        setIsUploadingImage(false);
      }
    },
    [connection, onChange, projectId, value],
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent<HTMLTextAreaElement>) => {
      onPaste?.(event);
      if (event.defaultPrevented) {
        return;
      }

      const imageFile = getClipboardImageFile(event.clipboardData);
      if (!imageFile) {
        return;
      }

      event.preventDefault();

      const textarea = event.currentTarget;
      await insertUploadedImageMarkdown(
        imageFile,
        textarea.selectionStart,
        textarea.selectionEnd,
      );
    },
    [insertUploadedImageMarkdown, onPaste],
  );

  const handleImageSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const imageFile = event.target.files?.[0];
      event.target.value = "";

      if (!imageFile) {
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      await insertUploadedImageMarkdown(
        imageFile,
        textarea.selectionStart,
        textarea.selectionEnd,
      );
    },
    [insertUploadedImageMarkdown],
  );

  const isDisabled = disabled || isUploadingImage;

  return (
    <div className={wrapperClassName}>
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-canvas-default",
          isDisabled && "opacity-60",
          editorClassName,
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-2 py-1.5 dark:border-slate-700">
          <ToolbarButton
            title="Жирный"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown((selection) =>
                wrapMarkdownSelection(selection, "**", "**"),
              );
            }}
          >
            <Bold width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Курсив"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown((selection) =>
                wrapMarkdownSelection(selection, "_", "_"),
              );
            }}
          >
            <Italic width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Зачёркнутый"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown((selection) =>
                wrapMarkdownSelection(selection, "~~", "~~"),
              );
            }}
          >
            <Strikethrough width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Цитата"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown((selection) => prefixMarkdownLines(selection, "> "));
            }}
          >
            <QuoteOpen width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Код"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown(insertMarkdownCode);
            }}
          >
            <Code width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Ссылка"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown(insertMarkdownLink);
            }}
          >
            <Link width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Маркированный список"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown((selection) => prefixMarkdownLines(selection, "- "));
            }}
          >
            <ListUl width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Нумерованный список"
            disabled={isDisabled}
            onClick={() => {
              applyMarkdown((selection) => prefixMarkdownLines(selection, "1. "));
            }}
          >
            <ListOl width={14} height={14} />
          </ToolbarButton>
          <ToolbarButton
            title="Изображение"
            disabled={isDisabled || !connection || !projectId}
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <Picture width={14} height={14} />
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleImageSelect(event);
            }}
          />
        </div>

        <textarea
          {...textareaProps}
          ref={textareaRef}
          className={cn(
            "min-h-[72px] w-full resize-y border-0 bg-transparent px-3 py-2.5 text-slate-900 outline-none focus:ring-0 disabled:cursor-not-allowed dark:text-slate-200",
            className,
          )}
          value={value}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => {
            void handlePaste(event);
          }}
        />
      </div>

      {isUploadingImage && (
        <div className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
          Загрузка изображения...
        </div>
      )}

      {uploadError && (
        <div className="mt-2 text-[13px] text-red-700 dark:text-red-300">
          {uploadError}
        </div>
      )}
    </div>
  );
};