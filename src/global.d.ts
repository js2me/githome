type AnyObject = Record<string, unknown>;
type EmptyObject = Record<string, never>;
type Class<T, Args extends unknown[] = unknown[]> = new (...args: Args) => T;
