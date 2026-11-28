import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { CLOUD_API, CLOUD_PROXY_PREFIX } from './cloud-origins';

export const createCloudClient = (
  provider: keyof typeof CLOUD_API,
  headers: Record<string, string>,
) => {
  const { origin, prefix } = CLOUD_API[provider];

  const validateUrl = (input: string) => {
    const url = new URL(input, origin);
    if (
      url.origin !== origin ||
      !url.pathname.startsWith(prefix) ||
      url.username ||
      url.password
    ) {
      throw new Error('Invalid provider API URL');
    }
    return url;
  };

  const request = async <T>(
    input: string,
    signal: AbortSignal,
    body?: object,
  ): Promise<{ data: T; headers: Headers }> => {
    const url = validateUrl(input);
    const path = url.pathname + url.search;
    const proxied =
      import.meta.env.DEV || import.meta.env.VITE_ELECTRON === true;
    const response = await fetch(
      proxied ? `${CLOUD_PROXY_PREFIX}/${provider}${path}` : url.href,
      {
        method: body ? 'POST' : 'GET',
        headers: {
          ...headers,
          Accept: 'application/json',
          ...(body && { 'Content-Type': 'application/json' }),
        },
        body: body && JSON.stringify(body),
        cache: 'no-store',
        redirect: 'error',
        signal,
      },
    );
    if (!response.ok) {
      throw new LocalizedError('connection.requestFailedHttp', {
        v1: response.status,
      });
    }
    return { data: (await response.json()) as T, headers: response.headers };
  };

  return request;
};

export type CloudRequest = ReturnType<typeof createCloudClient>;
