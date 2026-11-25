import { reaction } from 'mobx';
import { createRef } from 'yummies/mobx';
import { VM } from '@/shared/lib/view-models/vm';

interface LoadMorePayload {
  disabled: boolean;
  onLoadMore: () => void;
}

export class LoadMoreSentinelVM extends VM<LoadMorePayload> {
  readonly sentinel = createRef<HTMLDivElement>();
  private observer: IntersectionObserver | null = null;

  willMount() {
    reaction(
      () =>
        [
          this.payload.disabled,
          this.sentinel.current,
          this.payload.onLoadMore,
        ] as const,
      ([disabled, node, onLoadMore]) => {
        this.observer?.disconnect();
        this.observer = null;
        if (disabled || !node || typeof IntersectionObserver === 'undefined')
          return;

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (observer === this.observer && entry?.isIntersecting)
              onLoadMore();
          },
          { rootMargin: '240px' },
        );
        this.observer = observer;
        observer.observe(node);
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  didUnmount() {
    this.observer?.disconnect();
    this.observer = null;
  }
}
