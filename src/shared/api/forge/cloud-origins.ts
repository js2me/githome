export const CLOUD_PROXY_PREFIX = '/forge-proxy';

export const CLOUD_API = {
  github: { origin: 'https://api.github.com', prefix: '/' },
  bitbucket: { origin: 'https://api.bitbucket.org', prefix: '/2.0/' },
} as const;
