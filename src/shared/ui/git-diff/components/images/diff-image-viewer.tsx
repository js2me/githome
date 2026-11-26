import { Minus, Plus, Xmark } from '@gravity-ui/icons';
import { withPropsViewModel } from 'mobx-view-model-react';
import { useLayoutEffect } from 'react';
import {
  DiffImageViewerVM,
  MAX_SCALE,
  ZOOM_STEP,
} from '../../model/image-viewer';

const toolButton =
  'grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-semibold hover:bg-canvas-muted focus-visible:outline-2 focus-visible:outline-accent-blue disabled:opacity-40';

export const DiffImageViewer = withPropsViewModel(
  DiffImageViewerVM,
  ({ model }) => {
    const {
      payload: { url, title, onClose },
      dialogRef,
      viewportRef,
      imageRef,
      size,
      canPan,
      scale,
      fitScale,
      changeScale,
      setSize,
      restoreAnchor,
    } = model;
    useLayoutEffect(restoreAnchor);

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
          <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-border-default border-b px-3 py-2">
            <h2
              title={title}
              className="min-w-0 flex-1 basis-44 truncate font-semibold text-sm"
            >
              {title}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={toolButton}
                aria-label="Уменьшить"
                title="Уменьшить"
                disabled={scale <= fitScale}
                onClick={() => changeScale(scale / ZOOM_STEP)}
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <output
                aria-label="Масштаб"
                className="min-w-12 text-center text-xs tabular-nums"
              >
                {Math.round(scale * 100)}%
              </output>
              <button
                type="button"
                className={toolButton}
                aria-label="Приблизить"
                title="Приблизить"
                disabled={!size.width || scale >= MAX_SCALE}
                onClick={() => changeScale(scale * ZOOM_STEP)}
              >
                <Plus className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className={toolButton}
                onClick={() => changeScale(null)}
              >
                Вписать
              </button>
              <button
                type="button"
                className={toolButton}
                aria-label="Исходный размер"
                title="Исходный размер"
                onClick={() => changeScale(1)}
              >
                1:1
              </button>
              <button
                type="button"
                className={toolButton}
                aria-label="Закрыть изображение"
                title="Закрыть"
                onClick={() => dialogRef.current?.close()}
              >
                <Xmark className="size-5" aria-hidden />
              </button>
            </div>
          </header>
          <div
            ref={viewportRef}
            role="region"
            aria-label="Область просмотра"
            tabIndex={0}
            className="min-h-0 flex-1 overflow-auto overscroll-contain bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-accent-blue focus-visible:-outline-offset-2"
          >
            <div
              className={`flex min-h-full w-max min-w-full ${canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
              onPointerDown={model.startDrag}
              onPointerMove={model.moveDrag}
              onLostPointerCapture={model.endDrag}
            >
              <img
                ref={imageRef}
                src={url}
                alt={title}
                draggable={false}
                className="m-auto block max-w-none shrink-0 select-none"
                style={{
                  width: size.width * scale,
                  height: size.height * scale,
                }}
                onLoad={({ currentTarget }) =>
                  setSize({
                    width: currentTarget.naturalWidth,
                    height: currentTarget.naturalHeight,
                  })
                }
              />
            </div>
          </div>
        </div>
      </dialog>
    );
  },
);
