import type { ComponentClass, Entity } from '../ecs';
import type {
  $AnyEvil,
  BaseType,
  KeyedByType,
  NeverByType,
  PartialByType,
  QueryStep
} from '../types';
import type { Manager, Query } from '.';
import type { U } from 'ts-toolbelt';

import { Constraint } from '../types';

export interface BaseQueryBuilder<T extends BaseType = {}> {
  get(): Entity<T>[];
  first(): Entity<T> | null;
  [Symbol.iterator](): Iterator<Entity<T>>;
  components: ComponentQueryBuilder<T>;
  tags: TagQueryBuilder<T>;
}

interface ComponentQueryBuilder<T extends BaseType = {}>
  extends ComponentQueryFns<T> {
  <A extends ComponentClass[]>(...components: A): QueryBuilder<
    U.Merge<T & KeyedByType<A>>
  >;
}

interface TagQueryBuilder<T extends BaseType = {}> extends TagQueryFns<T> {
  (...tags: string[]): QueryBuilder<T>;
}

interface ComponentQueryFns<T extends BaseType = {}> {
  all<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & KeyedByType<A>>>;
  any<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & PartialByType<A>>>;
  some<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & PartialByType<A>>>;
  none<A extends ComponentClass[]>(
    ...components: A
  ): QueryBuilder<U.Merge<T & NeverByType<A>>>;
}

interface TagQueryFns<T extends BaseType = {}> {
  all(...tags: string[]): QueryBuilder<T>;
  any(...tags: string[]): QueryBuilder<T>;
  none(...tags: string[]): QueryBuilder<T>;
  some(...tags: string[]): QueryBuilder<T>;
}

export interface QueryState {
  tag: Constraint | null;
  ids: string[];
}

export class QueryBuilder<T extends BaseType = {}>
  implements BaseQueryBuilder<T>
{
  protected key: string = '';
  protected state!: QueryState;
  protected resolved: Query<T> | null = null;
  protected criteria: QueryStep[] = [];
  protected manager: Manager;

  protected reset(): this {
    if (this.state) {
      this.key += this.state.tag + '|' + this.state.ids.join(',') + '::';
      this.criteria.push({
        constraint: this.state.tag ?? Constraint.ALL,
        ids: this.state.ids.slice()
      });
    }
    this.state = { tag: null, ids: [] };
    return this;
  }

  protected tag(tag: Constraint): (...items: string[]) => this {
    return (...items: string[]) => {
      const tags = this.manager.registrations.tags;
      // get generated ID
      this.state.ids.push(...items.map(i => tags[i]));
      this.state.tag = tag;
      return this.reset();
    };
  }

  protected component(tag: Constraint) {
    return (...items: ComponentClass[]) => {
      this.state.ids.push(...items.map(item => item.type));
      this.state.tag = tag;
      return this.reset();
    };
  }

  protected handle: {
    components: ComponentQueryFns<T>;
    tags: TagQueryFns<T>;
  } = {
    components: {
      all: this.component(Constraint.ALL),
      any: this.component(Constraint.ANY),
      some: this.component(Constraint.SOME),
      none: this.component(Constraint.NONE)
    } as $AnyEvil as ComponentQueryFns<T>,
    tags: {
      all: this.tag(Constraint.ALL),
      any: this.tag(Constraint.ANY),
      some: this.tag(Constraint.SOME),
      none: this.tag(Constraint.NONE)
    }
  };

  public readonly components: ComponentQueryBuilder<T> = Object.assign(
    this.handle.components.all,
    this.handle.components
  );

  public readonly tags: TagQueryBuilder<T> = Object.assign(
    this.handle.tags.all,
    this.handle.tags
  );

  public get query(): Query<T, Entity<T>> {
    return (this.resolved ??= this.manager.getQuery<T, Entity<T>>(
      this.criteria,
      this.key
    ));
  }

  public get(): Entity<T>[] {
    return this.query.get();
  }

  public first(): Entity<T> | null {
    return this.query.first();
  }

  public [Symbol.iterator](): Iterator<Entity<T>> {
    return this.query[Symbol.iterator]();
  }

  public constructor(manager: Manager) {
    this.manager = manager;
    this.reset();
  }
}
