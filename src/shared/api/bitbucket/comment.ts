import type { ForgeAccount, ForgeComment } from '../forge/contracts';

export interface User {
  display_name: string;
  nickname?: string;
  links?: { avatar?: { href: string } };
}

export interface Comment {
  id: number;
  content?: { raw?: string };
  deleted?: boolean;
  inline?: { path: string } | null;
  parent?: { id: number } | null;
  user?: User;
  created_on: string;
}

export const mapAccount = (user: User): ForgeAccount => ({
  name: user.display_name,
  username: user.nickname,
  avatarUrl: user.links?.avatar?.href,
});

export const mapComment = (value: Comment): ForgeComment => ({
  id: String(value.id),
  body: value.content?.raw ?? '',
  author: value.user ? mapAccount(value.user) : undefined,
  createdAt: value.created_on,
});
