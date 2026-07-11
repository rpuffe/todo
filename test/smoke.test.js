'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../server.js');

test('todo api smoke test: greeting, create -> list -> complete -> delete, errors', async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    // greeting
    const greetRes = await fetch(`${base}/`);
    assert.equal(greetRes.status, 200);
    assert.equal(greetRes.headers.get('content-type'), 'application/json');
    const greetBody = await greetRes.json();
    assert.ok(typeof greetBody.message === 'string' && greetBody.message.length > 0);

    // healthz
    const healthRes = await fetch(`${base}/healthz`);
    assert.equal(healthRes.status, 200);

    // create
    const createRes = await fetch(`${base}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'buy milk' }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.title, 'buy milk');
    assert.equal(created.done, false);
    assert.ok(created.id);

    // list
    const listRes = await fetch(`${base}/todos`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, created.id);

    // complete via PATCH
    const patchRes = await fetch(`${base}/todos/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    assert.equal(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.equal(patched.done, true);
    assert.equal(patched.title, 'buy milk');

    // 400 on missing title
    const missingTitleRes = await fetch(`${base}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(missingTitleRes.status, 400);

    // 400 on empty title
    const emptyTitleRes = await fetch(`${base}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    });
    assert.equal(emptyTitleRes.status, 400);

    // malformed JSON -> 400, not a crash
    const malformedRes = await fetch(`${base}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    });
    assert.equal(malformedRes.status, 400);

    // 404 on unknown id (PATCH)
    const patchMissingRes = await fetch(`${base}/todos/does-not-exist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    assert.equal(patchMissingRes.status, 404);

    // delete
    const delRes = await fetch(`${base}/todos/${created.id}`, {
      method: 'DELETE',
    });
    assert.equal(delRes.status, 204);

    // 404 on unknown id (DELETE) — deleting again
    const delMissingRes = await fetch(`${base}/todos/${created.id}`, {
      method: 'DELETE',
    });
    assert.equal(delMissingRes.status, 404);

    // list is empty again
    const finalListRes = await fetch(`${base}/todos`);
    const finalList = await finalListRes.json();
    assert.equal(finalList.length, 0);
  } finally {
    server.close();
  }
});
