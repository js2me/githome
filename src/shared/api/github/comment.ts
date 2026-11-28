import type { ForgeAccount, ForgeComment } from '../forge/contracts';

export interface User {
  login: string;
  name?: string | null;
  avatar_url?: string;
}

export interface Comment {
  id: number;
  body: string;
  user: User | null;
  created_at: string;
}

export const mapAccount = (user: User): ForgeAccount => ({
  name: user.name || user.login,
  username: user.login,
  avatarUrl: user.avatar_url,
});

export const mapComment = (value: Comment): ForgeComment => ({
  id: String(value.id),
  body: value.body,
  author: value.user ? mapAccount(value.user) : undefined,
  createdAt: value.created_at,
});
