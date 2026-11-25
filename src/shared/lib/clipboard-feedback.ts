import { actionBound, observable, runInAction } from 'mobx';

export class ClipboardFeedback {
  @observable accessor status: 'idle' | 'copied' | 'failed' = 'idle';
  private timer?: number;
  private attempt = 0;

  constructor(private readonly signal: AbortSignal) {
    signal.addEventListener('abort', () => window.clearTimeout(this.timer), {
      once: true,
    });
  }

  @actionBound
  async copy(getValue: () => string | Promise<string>) {
    const attempt = ++this.attempt;
    window.clearTimeout(this.timer);
    this.status = 'idle';
    let status: 'copied' | 'failed';
    try {
      const value = getValue();
      const text = typeof value === 'string' ? value : await value;
      if (this.signal.aborted || attempt !== this.attempt) return;
      await navigator.clipboard.writeText(text);
      status = 'copied';
    } catch {
      status = 'failed';
    }
    if (this.signal.aborted || attempt !== this.attempt) return;
    runInAction(() => {
      this.status = status;
    });
    this.timer = window.setTimeout(
      () =>
        runInAction(() => {
          this.status = 'idle';
        }),
      status === 'copied' ? 1200 : 1600,
    );
  }
}
