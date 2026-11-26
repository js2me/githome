import { withPropsViewModel } from 'mobx-view-model-react';
import { ChangesActiveFileLinkVM } from '../../../model/changes/changes-active-file-link';
import './changes-active-file-link.css';

export const ChangesActiveFileLink = withPropsViewModel(
  ChangesActiveFileLinkVM,
  ({ model }) => {
    const { path } = model;
    if (!path) {
      return null;
    }

    return (
      <svg className="changes-active-file-link" aria-hidden="true">
        <path className="changes-active-file-link__line" d={path} fill="none" />
      </svg>
    );
  },
);
