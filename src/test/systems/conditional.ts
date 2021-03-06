import { describe, expect, test } from '@jest/globals';

import { Context } from '../../ecs';
import { ConditionalState } from '../helpers/plugins';

describe('conditional systems', () => {
  const MyContext = Context.with(ConditionalState);

  test('should only run when a condition evaluates to true', async () => {
    const ctx = new MyContext();
    await ctx.start();
    expect(ctx.game.state.value).toBe(125);
  });
});
