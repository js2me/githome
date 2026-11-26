export type { DiffSearchFindBarVisibility } from '../../model/diff-search';
export type { RowSearchHighlightState } from '../../model/search-highlights';
export {
  useDiffSearchOptional,
  useDiffSearchRegistration,
  useDiffSearchRegistrationOptional,
  useRowSearchHighlight,
} from './diff-search-context';
export { DiffSearchProvider } from './diff-search-provider';
export { DiffSearchStickyMiniBar } from './diff-search-sticky-mini-bar';
export {
  renderSearchHighlightedText,
  SearchHighlightedText,
} from './search-highlighted-text';
