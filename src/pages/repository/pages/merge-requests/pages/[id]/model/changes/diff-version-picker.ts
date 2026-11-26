import { actionBound, computed, observable } from 'mobx';
import { createRef } from 'yummies/mobx';
import type { GitLabMergeRequestVersionDC } from '@/shared/api/gitlab';
import { VM } from '@/shared/lib/view-models/vm';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getVersionLabel = (
  version: GitLabMergeRequestVersionDC,
  index: number,
  total: number,
) => {
  if (index === 0) {
    return 'последняя версия';
  }

  const pushNumber = total - index;
  return `push ${pushNumber} от ${formatDate(version.created_at)}`;
};

interface DiffVersionPickerProps {
  versions: GitLabMergeRequestVersionDC[];
  selectedVersionId: number | null;
  onSelectVersion: (id: number | null) => void;
}

export class DiffVersionPickerVM extends VM<DiffVersionPickerProps> {
  readonly container = createRef<HTMLDivElement>();
  @observable accessor isOpen = false;
  private listeners?: AbortController;

  @computed
  get currentLabel() {
    const { selectedVersionId, versions } = this.payload;
    const selectedVersion = selectedVersionId
      ? versions.find((v) => v.id === selectedVersionId)
      : null;

    const selectedIndex = selectedVersion
      ? versions.indexOf(selectedVersion)
      : 0;

    return versions.length > 0
      ? getVersionLabel(
          selectedVersion ?? versions[0],
          selectedIndex,
          versions.length,
        )
      : 'последняя версия';
  }

  @actionBound
  toggle() {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.isOpen = true;
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal };
    document.addEventListener(
      'mousedown',
      (event) => {
        if (!this.container.current?.contains(event.target as Node))
          this.close();
      },
      options,
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') this.close();
      },
      options,
    );
  }

  @actionBound
  private close() {
    this.isOpen = false;
    this.listeners?.abort();
    this.listeners = undefined;
  }

  @actionBound
  select(id: number | null) {
    this.payload.onSelectVersion(id);
    this.close();
  }

  didUnmount() {
    this.listeners?.abort();
  }
}
