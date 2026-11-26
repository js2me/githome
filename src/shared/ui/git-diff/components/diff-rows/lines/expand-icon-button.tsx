import { memo, type ReactNode } from 'react';

export const ExpandIconButton = memo(
  ({
    title,
    isLoading,
    onClick,
    children,
  }: {
    title: string;
    isLoading: boolean;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button
      className="git-diff-expand-button"
      type="button"
      title={title}
      aria-label={title}
      disabled={isLoading}
      onClick={onClick}
    >
      {children}
    </button>
  ),
);
