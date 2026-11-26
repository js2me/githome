import { actionBound, computed, observable, runInAction } from 'mobx';
import type {
  ChangeEvent,
  ClipboardEvent,
  ComponentPropsWithoutRef,
} from 'react';
import { createRef } from 'yummies/mobx';
import { gitlabApi } from '@/shared/api/gitlab';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import {
  insertMarkdownAtSelection,
  insertMarkdownCode,
  insertMarkdownLink,
  type MarkdownSelection,
  prefixMarkdownLines,
  wrapMarkdownSelection,
} from '@/shared/lib/markdown/insert-markdown-at-selection';
import { VM } from '@/shared/lib/view-models/vm';

type TextareaProps = Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'onChange' | 'onInput' | 'onPaste' | 'value' | 'defaultValue'
> & { value?: string; defaultValue?: string };

interface EditorOptions {
  inputRef?: { readonly current: HTMLTextAreaElement | null };
  onChange?: (value: string) => void;
  onInput?: () => void;
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  projectId?: number | null;
  wrapperClassName?: string;
  editorClassName?: string;
}

export type GitlabCommentEditorProps = TextareaProps & EditorOptions;

interface EditorPayload extends EditorOptions {
  connection: GitLabConnection | null;
  textareaProps: TextareaProps;
}

const markdownCommands = {
  bold: (selection: MarkdownSelection) =>
    wrapMarkdownSelection(selection, '**', '**'),
  italic: (selection: MarkdownSelection) =>
    wrapMarkdownSelection(selection, '_', '_'),
  strikethrough: (selection: MarkdownSelection) =>
    wrapMarkdownSelection(selection, '~~', '~~'),
  quote: (selection: MarkdownSelection) => prefixMarkdownLines(selection, '> '),
  code: insertMarkdownCode,
  link: insertMarkdownLink,
  list: (selection: MarkdownSelection) => prefixMarkdownLines(selection, '- '),
  orderedList: (selection: MarkdownSelection) =>
    prefixMarkdownLines(selection, '1. '),
};

export class GitlabCommentEditorVM extends VM<EditorPayload> {
  private readonly internalTextarea = createRef<HTMLTextAreaElement>();
  readonly fileInput = createRef<HTMLInputElement>();
  @observable accessor isUploadingImage = false;
  @observable accessor uploadError: string | null = null;

  get textareaRef() {
    return this.payload.inputRef ?? this.internalTextarea;
  }

  @computed
  get toolbarDisabled() {
    return this.payload.textareaProps.disabled || this.isUploadingImage;
  }

  @computed
  get canUploadImage() {
    return (
      !this.toolbarDisabled &&
      !!this.payload.connection &&
      !!this.payload.projectId
    );
  }

  private notifyValueChange(value: string) {
    this.payload.onChange?.(value);
    this.payload.onInput?.();
  }

  @actionBound
  changeText(event: ChangeEvent<HTMLTextAreaElement>) {
    this.notifyValueChange(event.currentTarget.value);
  }

  private applySelection(
    textarea: HTMLTextAreaElement,
    result: MarkdownSelection,
    focus: boolean,
  ) {
    textarea.value = result.value;
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    this.notifyValueChange(result.value);
    if (focus) textarea.focus();
  }

  @actionBound
  formatSelection(command: keyof typeof markdownCommands) {
    const textarea = this.textareaRef.current;
    if (!textarea || this.toolbarDisabled) return;
    this.applySelection(textarea, markdownCommands[command](textarea), true);
  }

  @actionBound
  openFilePicker() {
    if (this.canUploadImage) this.fileInput.current?.click();
  }

  @actionBound
  selectImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (image && this.canUploadImage) void this.uploadImage(image, 'picker');
  }

  @actionBound
  paste(event: ClipboardEvent<HTMLTextAreaElement>) {
    this.payload.onPaste?.(event);
    if (
      event.defaultPrevented ||
      !this.payload.connection ||
      !this.payload.projectId
    )
      return;
    for (const item of Array.from(event.clipboardData?.items ?? [])) {
      const image = item.type.startsWith('image/') && item.getAsFile();
      if (image) {
        event.preventDefault();
        void this.uploadImage(image, 'clipboard');
        return;
      }
    }
  }

  private async uploadImage(image: File, source: 'picker' | 'clipboard') {
    const textarea = this.textareaRef.current;
    const { connection, projectId } = this.payload;
    if (!textarea || !connection || !projectId) return;

    const { selectionStart, selectionEnd } = textarea;
    const signal = this.unmountSignal;
    const fromPicker = source === 'picker';
    if (fromPicker) {
      this.isUploadingImage = true;
      this.uploadError = null;
    }

    const isCurrent = () =>
      !signal.aborted &&
      this.textareaRef.current === textarea &&
      this.payload.projectId === projectId &&
      this.payload.connection === connection;

    try {
      const upload = await gitlabApi.uploadProjectMarkdown(
        connection,
        projectId,
        image,
        signal,
      );
      if (isCurrent()) {
        const result = insertMarkdownAtSelection(
          { value: textarea.value, selectionStart, selectionEnd },
          upload.markdown,
        );
        this.applySelection(textarea, result, fromPicker);
      }
    } catch (error) {
      if (fromPicker && isCurrent()) {
        runInAction(() => {
          this.uploadError =
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить изображение';
        });
      }
    } finally {
      if (fromPicker && !signal.aborted) {
        runInAction(() => {
          this.isUploadingImage = false;
        });
      }
    }
  }
}
