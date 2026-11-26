import { type MessageKey, t } from './index';

export class LocalizedError extends Error {
  constructor(
    private readonly key: MessageKey,
    private readonly values?: Record<string, unknown>,
    private readonly detail?: string,
  ) {
    super();
  }

  override get message() {
    const text = t(this.key, this.values);
    return this.detail ? `${text} — ${this.detail}` : text;
  }
}
