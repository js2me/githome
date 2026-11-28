import { cn } from '@/shared/lib/cn';

interface Tab {
  label: string;
  active: boolean;
  onSelect: () => void;
}

export const GithubTabs = ({ label, tabs }: { label: string; tabs: Tab[] }) => (
  <div
    role="group"
    aria-label={label}
    className="flex flex-wrap items-center gap-1"
  >
    {tabs.map((tab) => (
      <button
        key={tab.label}
        className={cn(
          'cursor-pointer rounded-lg px-3 py-2 font-semibold text-sm transition-colors',
          tab.active
            ? 'bg-[var(--glass-selected)] text-[var(--glass-accent)]'
            : 'text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg-default',
        )}
        aria-pressed={tab.active}
        type="button"
        onClick={tab.onSelect}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
