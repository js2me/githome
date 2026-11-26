import { observable, runInAction } from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';

const minimumNoticeMs = 1_000;

export class RefreshShortcut {
  @observable accessor isVisible = false;

  connect(target: EventTarget, signal: AbortSignal) {
    let refreshing = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const setVisible = (visible: boolean) =>
      runInAction(() => {
        this.isVisible = visible;
      });

    const onKeyDown = async (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.code !== 'KeyR' ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing ||
        event.defaultPrevented
      ) {
        return;
      }

      event.preventDefault();
      if (event.repeat || refreshing) return;

      clearTimeout(hideTimer);
      const startedAt = Date.now();
      refreshing = true;
      setVisible(true);
      await queryClient.refetchQueries(
        { type: 'active' },
        { cancelRefetch: false },
      );
      refreshing = false;
      if (signal.aborted) return;

      const remaining = minimumNoticeMs - (Date.now() - startedAt);
      if (remaining > 0) {
        hideTimer = setTimeout(() => setVisible(false), remaining);
      } else {
        setVisible(false);
      }
    };

    target.addEventListener(
      'keydown',
      (event) => {
        void onKeyDown(event as KeyboardEvent);
      },
      { signal },
    );
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(hideTimer);
        setVisible(false);
      },
      { once: true },
    );
  }
}
