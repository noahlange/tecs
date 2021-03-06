import { describe, expect, test } from '@jest/globals';

import { Context } from '../../ecs';
import { SequenceState } from '../helpers/plugins';

const MyContext = Context.with(SequenceState);

describe('sequences of systems', () => {
  test('should execute sequentially', async () => {
    const ctx = new MyContext();
    await ctx.start();
    expect(ctx.game.state.value).toBe(9);
  });
});
