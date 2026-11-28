export const PROJECT_LIST_TABS = [
  {
    id: 'contributed',
    labelKey: 'home.contributed',
  },
  {
    id: 'starred',
    labelKey: 'home.starred',
  },
  {
    id: 'personal',
    labelKey: 'home.personal',
  },
  {
    id: 'member',
    labelKey: 'home.member',
  },
  {
    id: 'inactive',
    labelKey: 'home.inactive',
  },
] as const;

export type ProjectListTab = (typeof PROJECT_LIST_TABS)[number]['id'];

export const PROJECTS_PER_PAGE = 50;
