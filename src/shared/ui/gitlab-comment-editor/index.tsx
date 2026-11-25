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
} from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { useGitLabConnection } from '@/shared/lib/gitlab/connection-context';
import { type GitlabCommentEditorProps, GitlabCommentEditorVM } from './model';

const toolbarButtons = [
  ['bold', 'Жирный', Bold],
  ['italic', 'Курсив', Italic],
  ['strikethrough', 'Зачёркнутый', Strikethrough],
  ['quote', 'Цитата', QuoteOpen],
  ['code', 'Код', Code],
  ['link', 'Ссылка', Link],
  ['list', 'Маркированный список', ListUl],
  ['orderedList', 'Нумерованный список', ListOl],
] as const;

const buttonClassName =
  'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-[var(--glass-hover)] hover:text-fg-default disabled:cursor-not-allowed disabled:opacity-40';

const Editor = withPropsViewModel(
  GitlabCommentEditorVM,
  ({ model, textareaProps, wrapperClassName, editorClassName }) => {
    const { value, defaultValue, disabled, className, ...attributes } =
      textareaProps;
    return (
      <div className={wrapperClassName}>
        <div
          className={cn(
            'glass-input overflow-hidden rounded-xl',
            disabled && 'opacity-60',
            editorClassName,
          )}
        >
          <div className="flex flex-wrap items-center gap-0.5 border-[var(--glass-border)] border-b bg-[var(--glass-surface)] px-2 py-1.5">
            {toolbarButtons.map(([command, title, Icon]) => (
              <button
                key={command}
                className={buttonClassName}
                type="button"
                title={title}
                aria-label={title}
                disabled={model.toolbarDisabled}
                onClick={() => model.formatSelection(command)}
              >
                <Icon width={14} height={14} />
              </button>
            ))}
            <button
              className={buttonClassName}
              type="button"
              title="Изображение"
              aria-label="Изображение"
              disabled={!model.canUploadImage}
              onClick={model.openFilePicker}
            >
              <Picture width={14} height={14} />
            </button>
            <input
              ref={model.fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={model.selectImage}
            />
          </div>
          {model.isUploadingImage && (
            <div className="px-3 pt-2 text-[13px] text-slate-500 dark:text-slate-400">
              Загрузка изображения...
            </div>
          )}
          {model.uploadError && (
            <div className="px-3 pt-2 text-[13px] text-red-700 dark:text-red-300">
              {model.uploadError}
            </div>
          )}
          <textarea
            {...attributes}
            ref={model.textareaRef}
            className={cn(
              'min-h-[72px] w-full resize-y border-0 bg-transparent px-3 py-2.5 text-fg-default outline-none disabled:cursor-not-allowed',
              className,
            )}
            value={value}
            defaultValue={
              value === undefined ? (defaultValue ?? '') : undefined
            }
            disabled={disabled}
            onChange={model.changeText}
            onPaste={model.paste}
          />
        </div>
      </div>
    );
  },
);

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
