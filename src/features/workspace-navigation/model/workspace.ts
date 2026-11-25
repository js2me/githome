import type { AnyViewModel, AnyViewModelSimple } from 'mobx-view-model';
import type { Repository } from '@/entities/gitlab-repositories';
import type { NavTreeStore } from '@/shared/lib/navigation/nav-tree';
import type { Router } from '@/shared/lib/navigation/router';
import { VM } from '@/shared/lib/view-models/vm';
import type { Globals } from '@/shared/model/globals';
import type { MergeRequestNavAdapter } from './merge-request-nav';

export interface Workspace extends Pick<Router, 'routes' | 'query'>, Globals {
  readonly stores: Globals['stores'] & {
    readonly repository: Repository;
    readonly navTree: NavTreeStore;
  };
  readonly navigation: { readonly mergeRequests: MergeRequestNavAdapter };
}

export class WorkspaceVM<
  Payload extends AnyObject = EmptyObject,
  Parent extends AnyViewModel | AnyViewModelSimple | null = null,
> extends VM<Payload, Parent, AnyObject, Workspace> {}
