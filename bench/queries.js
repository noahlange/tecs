const bench = require('nanobench');
const { Entity, World } = require('../lib');

const { Test1, Test2, Test3 } = require('./helpers');

function setup(create, E) {
  const world = new World();
  for (let i = 0; i < create * 1000; i++) {
    world.create(E, {
      test1: { a: 4, b: 5 },
      test2: { c: 6, d: 7 },
      test3: { e: 8, f: 9 }
    });
  }
  return world;
}

function setupChanged(create, E) {
  const world = setup(create, E);
  const entities = world.query.all();
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (i % 2) {
      entity.$$.test1.a = i;
      entity.$$.test2.c = i;
      entity.$$.test3.e = i;
    }
  }
  return world;
}

for (const count of [1, 10, 50, 100]) {
  const e = Entity.with(Test1, Test2, Test3);

  bench(`query ${count}k entities (1 component)`, b => {
    const world = setup(count, e);
    b.start();
    world.query.with(Test3).all();
    b.end();
  });

  bench(`query ${count}k entities (2 components)`, b => {
    const world = setup(count, e);
    b.start();
    world.query.with(Test1, Test2).all();
    b.end();
  });

  bench(`query ${count}k entities (3 components)`, b => {
    const world = setup(count, e);
    b.start();
    world.query.with(Test1, Test2, Test3).all();
    b.end();
  });
}

for (const count of [1, 10, 50, 100]) {
  const e = Entity.with(Test1, Test2, Test3);
  bench(`query changes in ${count}k entities (1 component)`, b => {
    const world = setupChanged(count, e);
    b.start();
    world.query.changed(Test3).all();
    b.end();
  });

  bench(`query changes in ${count}k entities (2 component)`, b => {
    const world = setupChanged(count, e);
    b.start();
    world.query.changed(Test1, Test2).all();
    b.end();
  });

  bench(`query changes in ${count}k entities (3 component)`, b => {
    const world = setupChanged(count, e);
    b.start();
    world.query.changed(Test1, Test2, Test3).all();
    b.end();
  });
}
