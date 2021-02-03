import type { BaseType, Frozen, PartialBaseType } from '../types';
import type { Contained } from '../lib/Contained';
import type { ContainerClass } from '../lib/Container';

import { Container } from '../lib/Container';
import { QueryManager } from './QueryManager';
import { Query } from '../ecs';

export interface Mutations {
  changed: Record<string, Set<string>>;
  created: Record<string, Set<string>>;
  removed: Record<string, Set<string>>;
}

export class ContainerManager {
  public mutations: Mutations = { changed: {}, created: {}, removed: {} };
  // ContainerID => Container
  public containers: Record<string, Container> = {};
  // ContainedID =>  Contained
  public containeds: Record<string, Contained> = {};
  // ContainerID => ContainedType => ContainedID
  public bindings: Record<string, Record<string, string>> = {};
  public byContainerType: Record<string, Set<string>> = {};

  // cached immutable bindings
  protected $: Record<string, any> = {};
  // entities to destroy on cleanup()
  protected toDestroy: string[] = [];
  protected queries: QueryManager;

  protected createBindings(id: string, mutable: boolean = false): any {
    const bindings = this.bindings[id];
    const res = {};
    for (const type in bindings) {
      const value = this.containeds[bindings[type]];
      if (mutable) {
        Object.defineProperty(res, type, {
          enumerable: true,
          configurable: false,
          value: new Proxy(value, {
            set: <K extends keyof Contained>(
              target: Contained,
              key: K,
              value: Contained[K]
            ) => {
              target[key] = value;
              (this.mutations.changed[id] ??= new Set()).add(target.id);
              return true;
            }
          })
        });
      } else {
        Object.defineProperty(res, type, {
          enumerable: true,
          configurable: false,
          value: new Proxy(value, { set: () => false })
        });
      }
    }
    return res;
  }

  /**
   * Given a container, return the corresponding structure for the contained bindings.
   * @param container
   * @param mutable - whether or not the returned bindings should be mutable
   *
   * @privateRemarks
   * The current implementation uses a Proxy to track changes to
   * mutable components and prevent modification of immutable components.
   */
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: false
  ): Frozen<T>;
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: true
  ): T;
  public getBindings<T extends BaseType<Contained>>(
    container: Container,
    mutable: boolean = false
  ): T | Frozen<T> {
    if (!mutable) {
      return (this.$[container.id] ??= this.createBindings(container.id));
    } else {
      return this.createBindings(container.id, true);
    }
  }

  /**
   * Destroy an entity and its components, resetting queries if necessary.
   */
  public destroy(id: string): void {
    const bindings = this.bindings[id];
    const removed = new Set<string>();
    for (const type in bindings) {
      removed.add(bindings[type]);
    }
    delete this.$[id];
    this.mutations.removed[id] = removed;
    this.toDestroy.push(id);
  }

  public create<T extends BaseType<Contained>>(
    Constructor: ContainerClass<T>,
    data?: PartialBaseType<T>
  ): Container<T> {
    const instance = new Constructor();
    this.add(instance, data);
    if (instance instanceof Container) {
      return instance;
    } else {
      const message = Constructor.name
        ? 'an unnamed container instance'
        : `a container instance of '${Constructor.name}'`;
      throw new Error(
        `Attempted to create ${message} without extending the Container class.`
      );
    }
  }

  public add<T extends BaseType>(
    container: Container<T>,
    data: PartialBaseType<T> = {}
  ): this {
    const id = container.id;
    const bindings: Record<string, string> = {};
    const created = new Set<string>();
    const changed = new Set<string>();

    for (const Ctor of container.items ?? []) {
      if (!Ctor.type) {
        console.warn(
          `No static type property specified for "${Ctor.name}" belonging to ${
            container.constructor.name ?? 'unnamed container'
          }.`
        );
        continue;
      }

      // create a new class instnace.
      const contained = new Ctor(container, {});
      // classes with defined properties overwrite assigned data.
      Object.assign(contained, data[Ctor.type]);

      // declare the component mutated for queries
      created.add(contained.id);
      changed.add(contained.id);

      // set the corresponding property on the container bindings.
      bindings[Ctor.type] = contained.id;
      // add to the manager's data hash
      this.containeds[contained.id] = contained;
    }

    Object.defineProperty(container, 'manager', {
      configurable: false,
      enumerable: false,
      value: this
    });

    // add container, bindings and id
    this.containers[id] = container;
    this.bindings[id] = bindings;

    // mutations
    this.mutations.changed[id] = changed;
    this.mutations.created[id] = created;

    const typeID = (container.constructor as ContainerClass).id;
    if (typeID) {
      (this.byContainerType[typeID] ??= new Set()).add(container.id);
    }
    return this;
  }

  public cleanup(): void {
    this.mutations.changed = {};
    this.mutations.created = {};
    this.mutations.removed = {};
    // destroy entities marked for removal
    for (const id of this.toDestroy) {
      const container = this.containers[id];
      const type = (container.constructor as ContainerClass).id;
      for (const key in this.bindings[id]) {
        // and invalidate their queries
        this.queries.invalidateType(key);
      }
      delete this.containers[id];
      delete this.bindings[id];
      delete this.$[id];
      this.byContainerType[type].delete(id);
      this.queries.invalidateEntity(id);
    }
  }

  public get items(): Container[] {
    return Object.values(this.containers);
  }

  public get ids(): string[] {
    return Object.keys(this.containers);
  }

  public get query(): Query<{}> {
    return new Query<{}>(this.queries);
  }

  public constructor() {
    this.queries = new QueryManager(this);
  }
}
