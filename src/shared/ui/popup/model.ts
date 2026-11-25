import { reaction } from 'mobx';
import type { ReactNode } from 'react';
import { createRef } from 'yummies/mobx';
import { VM } from '@/shared/lib/view-models/vm';

interface PopupPayload {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

export class PopupVM extends VM<PopupPayload> {
  readonly trigger = createRef<HTMLElement>();
  readonly panel = createRef<HTMLDivElement>();
  private listeners: AbortController | null = null;

  willMount() {
    reaction(
      () => this.payload.isOpen,
      (isOpen) => {
        this.listeners?.abort();
        this.listeners = null;
        if (!isOpen) return;

        this.listeners = new AbortController();
        const { signal } = this.listeners;
        document.addEventListener(
          'mousedown',
          (event) => {
            const target = event.target as Node;
            if (
              !this.panel.current?.contains(target) &&
              !this.trigger.current?.contains(target)
            ) {
              this.payload.onClose();
            }
          },
          { signal },
        );
        document.addEventListener(
          'keydown',
          (event) => {
            if (event.key === 'Escape') this.payload.onClose();
          },
          { signal },
        );
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  didUnmount() {
    this.listeners?.abort();
  }
}
