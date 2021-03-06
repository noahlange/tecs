/* eslint-disable max-classes-per-file */

import { describe, expect, test } from '@jest/globals';

import { Context } from '../../ecs';
import { ParallelState } from '../helpers/plugins';

describe('parallel systems', () => {
  const MyContext = Context.with(ParallelState);
  test('should, by default, execute systems sequentially', async () => {
    const ctx = new MyContext();
    await ctx.start();
    expect(ctx.game.state.value).toBe(3);
  });
});
