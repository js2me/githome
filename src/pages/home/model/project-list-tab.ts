import type { FetchQueryParams } from "@/shared/lib/create-fetch-query";

export const PROJECT_LIST_TABS = [
  { id: "contributed", label: "Участие" },
  { id: "starred", label: "Избранные" },
  { id: "personal", label: "Личные" },
  { id: "member", label: "Участник" },
  { id: "inactive", label: "Неактивные" },
] as const;

export type ProjectListTab = (typeof PROJECT_LIST_TABS)[number]["id"];

export const PROJECTS_PER_PAGE = 50;

type BuildProjectListParamsOptions = {
  tab: ProjectListTab;
  perPage: number;
  userId: number | null | undefined;
};

export const buildProjectListParams = ({
  tab,
  perPage,
  userId,
}: BuildProjectListParamsOptions): Pick<
  FetchQueryParams,
  "path" | "query"
> | null => {
  const query = {
    order_by: "last_activity_at",
    sort: "desc",
    per_page: perPage,
    simple: false,
  } as const;

  switch (tab) {
    case "contributed":
      if (!userId) {
        return null;
      }

      return {
        path: `/users/${userId}/contributed_projects`,
        query,
      };
    case "starred":
      return {
        path: "/projects",
        query: { ...query, starred: true },
      };
    case "personal":
      return {
        path: "/projects",
        query: { ...query, owned: true },
      };
    case "member":
      return {
        path: "/projects",
        query: { ...query, membership: true },
      };
    case "inactive":
      return {
        path: "/projects",
        query: { ...query, membership: true, active: false },
      };
  }
};
