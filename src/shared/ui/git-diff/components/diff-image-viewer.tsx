import { Minus, Plus, Xmark } from "@gravity-ui/icons";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const MAX_SCALE = 4;
const ZOOM_STEP = 1.25;
const toolButton =
  "grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-semibold hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-accent-blue disabled:opacity-40";

export function DiffImageViewer({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number | null>(null);
  const anchor = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);

  const fitScale = size.width && viewport.width
    ? Math.min(1, viewport.width / size.width, viewport.height / size.height)
    : 1;
  const scale = zoom ?? fitScale;
  const canPan = size.width * scale > viewport.width || size.height * scale > viewport.height;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const view = viewportRef.current;
    if (!dialog || !view) return;

    dialog.showModal();
    const measure = () => setViewport({ width: view.clientWidth, height: view.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, []);

  const changeScale = useCallback((value: number | null, point?: { clientX: number; clientY: number }) => {
    const view = viewportRef.current;
    const image = imageRef.current;
    if (!view || !image || !size.width) return;

    const nextScale = value === null ? null : Math.min(MAX_SCALE, Math.max(fitScale, value));
    if (nextScale === zoom) return;

    const rect = image.getBoundingClientRect();
    const bounds = view.getBoundingClientRect();
    const clientX = point?.clientX ?? bounds.left + view.clientWidth / 2;
    const clientY = point?.clientY ?? bounds.top + view.clientHeight / 2;
    if (rect.width && rect.height) {
      anchor.current = {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
        clientX,
        clientY,
      };
    }
    setZoom(nextScale);
  }, [fitScale, size.width, zoom]);

  useLayoutEffect(() => {
    const view = viewportRef.current;
    const image = imageRef.current;
    const point = anchor.current;
    if (!view || !image || !point) return;

    anchor.current = null;
    const rect = image.getBoundingClientRect();
    view.scrollLeft += rect.left + rect.width * point.x - point.clientX;
    view.scrollTop += rect.top + rect.height * point.y - point.clientY;
  }, [scale, zoom]);

  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY === 0) return;
      changeScale(scale * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), event);
    };
    view.addEventListener("wheel", handleWheel, { passive: false });
    return () => view.removeEventListener("wheel", handleWheel);
  }, [changeScale, scale]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="fixed inset-0 m-auto h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-none overflow-hidden rounded-xl border border-border-default bg-canvas-overlay p-0 text-fg-default shadow-2xl backdrop:bg-black/70 sm:h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-default px-3 py-2">
          <h2 title={title} className="min-w-0 flex-1 basis-44 truncate text-sm font-semibold">{title}</h2>
          <div className="flex items-center gap-1">
            <button type="button" className={toolButton} aria-label="Уменьшить" title="Уменьшить"
              disabled={scale <= fitScale} onClick={() => changeScale(scale / ZOOM_STEP)}>
              <Minus className="size-4" aria-hidden />
            </button>
            <output aria-label="Масштаб" className="min-w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</output>
            <button type="button" className={toolButton} aria-label="Приблизить" title="Приблизить"
              disabled={!size.width || scale >= MAX_SCALE} onClick={() => changeScale(scale * ZOOM_STEP)}>
              <Plus className="size-4" aria-hidden />
            </button>
            <button type="button" className={toolButton} onClick={() => changeScale(null)}>Вписать</button>
            <button type="button" className={toolButton} aria-label="Исходный размер" title="Исходный размер"
              onClick={() => changeScale(1)}>
              1:1
            </button>
            <button type="button" className={toolButton} aria-label="Закрыть изображение" title="Закрыть"
              onClick={() => dialogRef.current?.close()}>
              <Xmark className="size-5" aria-hidden />
            </button>
          </div>
        </header>
        <div
          ref={viewportRef}
          role="region"
          aria-label="Область просмотра"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-auto overscroll-contain bg-canvas-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-blue"
        >
          <div
            className={`flex min-h-full min-w-full w-max ${canPan ? "cursor-grab active:cursor-grabbing" : ""}`}
            onPointerDown={(event) => {
              const view = viewportRef.current;
              if (!view || !canPan || event.pointerType !== "mouse" || event.button !== 0) return;

              drag.current = {
                pointerId: event.pointerId, x: event.clientX, y: event.clientY,
                left: view.scrollLeft, top: view.scrollTop,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (!start || start.pointerId !== event.pointerId) return;
              viewportRef.current?.scrollTo(start.left + start.x - event.clientX, start.top + start.y - event.clientY);
            }}
            onLostPointerCapture={() => { drag.current = null; }}
          >
            <img
              ref={imageRef}
              src={url}
              alt={title}
              draggable={false}
              className="m-auto block max-w-none shrink-0 select-none"
              style={{ width: size.width * scale, height: size.height * scale }}
              onLoad={({ currentTarget }) => setSize({
                width: currentTarget.naturalWidth,
                height: currentTarget.naturalHeight,
              })}
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}
