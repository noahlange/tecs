import { test, describe, expect } from '@jest/globals';
import { WithA, WithAB } from './helpers/entities';
import { A } from './helpers/components';
import { Manager } from '..';

describe('caching', () => {
  test("make sure a restricted result set doesn't inadvertently filter larger result sets", () => {
    const em = new Manager();

    em.create(WithA, {}, ['a', 'b', 'c']);
    em.create(WithAB, {});

    // smaller result set
    const a = em.query.all.tags('a').all.components(A).get();

    // larger result set
    const b = em.query.all.components(A).get();

    expect(b.length).toBeGreaterThan(a.length);
  });
});