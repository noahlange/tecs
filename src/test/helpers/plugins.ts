/* eslint-disable max-classes-per-file */
import { conditional, parallel, phase, sequence } from '../../ecs/composers';
import { Plugin } from '../../lib';
import { Phase } from '../../types';

const wait = (): Promise<void> => new Promise(ok => setTimeout(ok, 10));

export class ParallelState extends Plugin {
  public static readonly type = 'state';
  public value = 0;

  public $ = {
    systems: [
      parallel(
        async () => {
          this.value += 1;
          await wait();
        },
        async () => {
          await wait();
          this.value += 1;
        }
      ),
      sequence(
        () => (this.value *= 3),
        () => (this.value /= 2)
      )
    ]
  };
}

export class ConditionalState extends Plugin {
  public static readonly type = 'state';
  public value = 0;

  public $ = {
    systems: [
      conditional(
        () => this.value === 0,
        () => (this.value += 25)
      ),
      conditional(
        () => this.value === 0,
        () => (this.value += 250)
      ),
      conditional(
        () => this.value > 0,
        () => (this.value += 100)
      )
    ]
  };
}

export class SequenceState extends Plugin {
  public static readonly type = 'state';
  public value = 0;
  public $ = {
    systems: [
      phase(
        Phase.ON_UPDATE,
        sequence(
          () => (this.value += 3),
          () => (this.value **= 2)
        )
      )
    ]
  };
}

export class PhaseState extends Plugin {
  public static readonly type = 'phase';
  public value = 0;
  public $ = {
    systems: [
      phase(
        Phase.ON_LOAD,
        sequence(
          () => (this.value += 1),
          () => (this.value += 1)
        )
      ),
      phase(
        Phase.ON_UPDATE,
        sequence(
          () => (this.value *= 3),
          () => (this.value /= 2)
        )
      )
    ]
  };
}
