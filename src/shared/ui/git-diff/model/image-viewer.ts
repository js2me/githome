import { actionBound, computed, observable, observableRef } from 'mobx';
import type { PointerEvent } from 'react';
import { createRef } from 'yummies/mobx';
import { VM } from '@/shared/lib/view-models/vm';

export const MAX_SCALE = 4;
export const ZOOM_STEP = 1.25;

export class DiffImageViewerVM extends VM<{
  url: string;
  title: string;
  onClose: () => void;
}> {
  readonly dialogRef = createRef<HTMLDialogElement>({
    onSet: (dialog) => dialog.showModal(),
  });
  readonly imageRef = createRef<HTMLImageElement>({
    onChange: (image) => {
      this.imageResizeObserver?.disconnect();
      this.anchor = undefined;
      if (!image) return;
      this.imageResizeObserver = new ResizeObserver(this.restoreAnchor);
      this.imageResizeObserver.observe(image);
    },
  });
  readonly viewportRef = createRef<HTMLDivElement>({
    onChange: (view, previous) => {
      this.resizeObserver?.disconnect();
      previous?.removeEventListener('wheel', this.wheel);
      if (!view) return;
      this.resizeObserver = new ResizeObserver(this.measure);
      this.resizeObserver.observe(view);
      this.measure();
      view.addEventListener('wheel', this.wheel, { passive: false });
    },
  });

  @observableRef accessor size = { width: 0, height: 0 };
  @observableRef private accessor viewport = { width: 0, height: 0 };
  @observable accessor zoom: number | null = null;
  private resizeObserver?: ResizeObserver;
  private imageResizeObserver?: ResizeObserver;
  private anchor?: { x: number; y: number; clientX: number; clientY: number };
  private drag?: {
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
  };

  @computed get fitScale() {
    return this.size.width && this.viewport.width
      ? Math.min(
          1,
          this.viewport.width / this.size.width,
          this.viewport.height / this.size.height,
        )
      : 1;
  }

  @computed get scale() {
    return this.zoom ?? this.fitScale;
  }

  @computed get canPan() {
    return (
      this.size.width * this.scale > this.viewport.width ||
      this.size.height * this.scale > this.viewport.height
    );
  }

  @actionBound private measure() {
    const view = this.viewportRef.current;
    if (view)
      this.viewport = { width: view.clientWidth, height: view.clientHeight };
  }

  @actionBound setSize(size: { width: number; height: number }) {
    this.size = size;
  }

  @actionBound changeScale(
    value: number | null,
    point?: { clientX: number; clientY: number },
  ) {
    const view = this.viewportRef.current;
    const image = this.imageRef.current;
    if (!view || !image || !this.size.width) return;
    const nextScale =
      value === null
        ? null
        : Math.min(MAX_SCALE, Math.max(this.fitScale, value));
    if (nextScale === this.zoom) return;
    const rect = image.getBoundingClientRect();
    const bounds = view.getBoundingClientRect();
    const clientX = point?.clientX ?? bounds.left + view.clientWidth / 2;
    const clientY = point?.clientY ?? bounds.top + view.clientHeight / 2;
    if (
      (nextScale ?? this.fitScale) !== this.scale &&
      rect.width &&
      rect.height
    ) {
      this.anchor = {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
        clientX,
        clientY,
      };
    }
    this.zoom = nextScale;
  }

  @actionBound private restoreAnchor() {
    const view = this.viewportRef.current;
    const image = this.imageRef.current;
    const point = this.anchor;
    if (!view || !image || !point) return;
    this.anchor = undefined;
    const rect = image.getBoundingClientRect();
    view.scrollLeft += rect.left + rect.width * point.x - point.clientX;
    view.scrollTop += rect.top + rect.height * point.y - point.clientY;
  }

  private readonly wheel = (event: WheelEvent) => {
    event.preventDefault();
    if (event.deltaY)
      this.changeScale(
        this.scale * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        event,
      );
  };

  @actionBound startDrag(event: PointerEvent<HTMLDivElement>) {
    const view = this.viewportRef.current;
    if (
      !view ||
      !this.canPan ||
      event.pointerType !== 'mouse' ||
      event.button !== 0
    )
      return;
    this.drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: view.scrollLeft,
      top: view.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  @actionBound moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = this.drag;
    if (start && start.pointerId === event.pointerId) {
      this.viewportRef.current?.scrollTo(
        start.left + start.x - event.clientX,
        start.top + start.y - event.clientY,
      );
    }
  }

  @actionBound endDrag() {
    this.drag = undefined;
  }
}
