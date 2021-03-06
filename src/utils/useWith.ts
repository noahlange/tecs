/* eslint-disable max-classes-per-file */

import type { ComponentClass, ContextClass, EntityClass } from '../ecs';
import type { PluginClass } from '../lib/Plugin';
import type { BaseType, KeyedByType } from '../types';
import type { U } from 'ts-toolbelt';

import { Context } from '../ecs';

const ctors: Map<EntityClass, ComponentClass[]> = new Map();

/**
 * Helper function to create new container class constructors with typed `$`s.
 * @param Constructor - Constructor to extend.
 * @param items - array of containees; this will extend existing `$`s
 */
export function useWithComponent<
  T extends BaseType,
  A extends ComponentClass[] = []
>(Constructor: EntityClass<T>, ...items: A): EntityClass<T & KeyedByType<A>> {
  // we're tracking entity class => component classes, allowing us to extend existing component sets.
  const curr = ctors.get(Constructor) ?? [];
  // we need to give each entity its own constructor
  const _a = class extends Constructor {};

  // and we need to define this here because no other configuration permits
  // `items` to be accessible on the prototype while being not being subject to
  // changes in other items of the same type (via `.slice()` in the entity constructor)
  const value = [...curr, ...items];
  ctors.set(_a, value);

  Object.defineProperty(_a.prototype, 'items', {
    value: value.slice(),
    writable: true
  });

  // type system abuse
  return _a as unknown as EntityClass<T & KeyedByType<A>>;
}

export function useWithPlugins<
  P extends PluginClass<R>[],
  R extends KeyedByType<P>
>(...items: P): ContextClass<U.Merge<R>> {
  const _a = class extends Context<U.Merge<R>> {};
  Object.defineProperty(_a.prototype, 'items', {
    value: items.slice(),
    writable: true
  });
  return _a as unknown as ContextClass<U.Merge<R>>;
}
