import type { MaybeFalsy } from '@/shared/lib/query/create-fetch-query';
import {
  type CreateGitlabApiQueryOptions,
  type CreateGitlabListQueryOptions,
  type CreateGitlabQueryOptions,
  type CreateInfiniteGitlabQueryOptions,
  createGitlabApiQuery,
  createGitlabListQuery,
  createGitlabQuery,
  createInfiniteGitlabQuery,
} from './create-query';

type Params<T> = () => MaybeFalsy<T>;

export const defineGitlabApiQuery =
  <TData, TParams extends object>(
    definition: Pick<
      CreateGitlabApiQueryOptions<TData, TParams>,
      'queryFn' | 'queryKey'
    > &
      Partial<
        Pick<CreateGitlabApiQueryOptions<TData, TParams>, 'queryOptions'>
      >,
  ) =>
  (
    options: Omit<
      CreateGitlabApiQueryOptions<TData, TParams>,
      'queryFn' | 'queryKey'
    >,
  ) =>
    createGitlabApiQuery({
      ...options,
      ...definition,
      queryOptions: { ...definition.queryOptions, ...options.queryOptions },
    });

const resolve =
  <TParams, TResult>(
    params: Params<TParams>,
    build: (params: TParams) => TResult,
  ) =>
  () => {
    const input = params();
    return input ? build(input) : null;
  };

export const defineGitlabQuery =
  <TData, TParams extends object>(
    build: (
      params: TParams,
    ) => ReturnType<CreateGitlabQueryOptions<TData>['params']>,
  ) =>
  (
    options: Omit<CreateGitlabQueryOptions<TData>, 'params'> & {
      params: Params<TParams>;
    },
  ) =>
    createGitlabQuery<TData>({
      ...options,
      params: resolve(options.params, build),
    });

export const defineInfiniteGitlabQuery =
  <TData, TParams extends object>(
    build: (
      params: TParams,
    ) => ReturnType<CreateInfiniteGitlabQueryOptions['params']>,
  ) =>
  (
    options: Omit<CreateInfiniteGitlabQueryOptions, 'params'> & {
      params: Params<TParams>;
    },
  ) =>
    createInfiniteGitlabQuery<TData>({
      ...options,
      params: resolve(options.params, build),
    });

export const defineGitlabListQuery =
  <TData, TParams extends object>(
    build: (
      params: TParams,
    ) => ReturnType<CreateGitlabListQueryOptions<TData>['params']>,
  ) =>
  (
    options: Omit<CreateGitlabListQueryOptions<TData>, 'params'> & {
      params: Params<TParams>;
    },
  ) =>
    createGitlabListQuery<TData>({
      ...options,
      params: resolve(options.params, build),
    });
