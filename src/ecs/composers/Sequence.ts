import type { Plugins, SystemType } from '../../types';
import type { SystemClass, SystemLike } from '../System';

import { isSystemConstructor } from '../../utils';
import { System } from '../System';

/**
 * Return a system composed of multiple systems to be run one after another,
 * pausing to resolve if necessary.
 */
export function sequence<T extends Plugins<T>>(
  ...Systems: SystemType<T>[]
): SystemClass<T> {
  return class SequenceSystem extends System<any> {
    public pipeline: SystemLike[] = [];

    public async tick(dt: number, ts: number): Promise<void> {
      for (const system of this.pipeline) {
        await system.tick?.(dt, ts);
        this.ctx.manager.tick();
      }
    }

    public async stop(): Promise<void> {
      for (const system of this.pipeline) {
        await system.stop?.();
        this.ctx.manager.tick();
      }
    }

    public async start(): Promise<void> {
      this.pipeline = Systems.map(System => {
        return isSystemConstructor(System)
          ? new System(this.ctx)
          : { tick: (dt, ts) => System(this.ctx, dt, ts) };
      });
      for (const system of this.pipeline) {
        await system.start?.();
        this.ctx.manager.tick();
      }
    }
  };
}
