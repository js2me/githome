export interface FindShortcutBridge {
  setHandler: (handler: (() => void) | null) => void;
}

declare global {
  interface Window {
    __githomeFindShortcut?: FindShortcutBridge;
  }
}

export const registerFindShortcutHandler = (handler: (() => void) | null) => {
  window.__githomeFindShortcut?.setHandler(handler);
};
