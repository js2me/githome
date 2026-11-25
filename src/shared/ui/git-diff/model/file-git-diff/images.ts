import {
  actionBound,
  compareShallow,
  observable,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import { isImagePath } from '@/shared/lib/image-path';
import type { FileGitDiff } from '.';
import { DisposableModel } from './disposable';

export type DiffImageLoader = (
  path: string,
  ref: string,
  signal: AbortSignal,
) => Promise<Blob>;

type ImageSide = 'before' | 'after';

export type DiffImagePreview =
  | { status: 'missing' | 'unavailable' | 'loading' | 'error' }
  | { status: 'ready'; path: string; url: string };

export class FileGitDiffImages extends DisposableModel {
  @observableRef accessor before: DiffImagePreview = { status: 'loading' };
  @observableRef accessor after: DiffImagePreview = { status: 'loading' };
  @observable accessor visible = false;
  @observableRef accessor opened: { url: string; title: string } | null = null;
  private visibilityObserver?: IntersectionObserver;

  @actionBound open(url: string, title: string) {
    this.opened = { url, title };
  }

  @actionBound close() {
    this.opened = null;
  }

  @actionBound attach(container: HTMLDivElement | null) {
    this.visibilityObserver?.disconnect();
    if (!container) {
      this.close();
      return;
    }
    if (this.visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      this.show();
      return;
    }
    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          this.visibilityObserver?.disconnect();
          this.show();
        }
      },
      { rootMargin: '240px 0px' },
    );
    this.visibilityObserver.observe(container);
  }

  private controller?: AbortController;

  constructor(file: FileGitDiff) {
    super();
    this.disposers.push(
      reaction(
        () => {
          if (!this.visible) return null;

          const {
            change,
            parent: { payload },
          } = file;
          return {
            beforePath: change.new_file ? null : change.old_path,
            afterPath: change.deleted_file ? null : change.new_path,
            baseRef: payload.baseRef,
            headRef: payload.headRef,
            load: payload.loadFileImage,
          };
        },
        (source) => {
          if (!source) return;

          this.clearImages();
          const controller = new AbortController();
          this.controller = controller;
          void this.loadSide(
            'before',
            source.beforePath,
            source.baseRef,
            source.load,
            controller.signal,
          );
          void this.loadSide(
            'after',
            source.afterPath,
            source.headRef,
            source.load,
            controller.signal,
          );
        },
        { equals: compareShallow },
      ),
    );
  }

  @actionBound
  show() {
    this.visible = true;
  }

  @actionBound
  decodeFailed(side: ImageSide, url: string) {
    const preview = this[side];
    if (preview.status === 'ready' && preview.url === url) {
      URL.revokeObjectURL(url);
      this[side] = { status: 'error' };
    }
  }

  protected override onDispose() {
    this.clearImages();
  }

  private clearImages() {
    this.controller?.abort();
    for (const preview of [this.before, this.after]) {
      if (preview.status === 'ready') URL.revokeObjectURL(preview.url);
    }
  }

  private async loadSide(
    side: ImageSide,
    path: string | null,
    ref: string | null | undefined,
    load: DiffImageLoader | undefined,
    signal: AbortSignal,
  ) {
    if (!path) {
      this[side] = { status: 'missing' };
      return;
    }
    if (!ref || !load || !isImagePath(path)) {
      this[side] = { status: 'unavailable' };
      return;
    }

    this[side] = { status: 'loading' };
    try {
      const blob = await load(path, ref, signal);
      if (!signal.aborted) {
        const url = URL.createObjectURL(blob);
        runInAction(() => {
          this[side] = { status: 'ready', path, url };
        });
      }
    } catch {
      if (!signal.aborted) {
        runInAction(() => {
          this[side] = { status: 'error' };
        });
      }
    }
  }
}
