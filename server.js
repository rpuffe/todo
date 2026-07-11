'use strict';

const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const GREETING = process.env.GREETING || 'todo api';

let todos = [];

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data);
}

function notFound(res) {
  sendJson(res, 404, { error: 'not found' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function parseJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  return JSON.parse(raw); // throws on malformed JSON — caller handles as 400
}

async function handleRequest(req, res) {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/') {
    return sendJson(res, 200, { message: GREETING });
  }

  if (method === 'GET' && pathname === '/healthz') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (method === 'GET' && pathname === '/todos') {
    return sendJson(res, 200, todos);
  }

  if (method === 'POST' && pathname === '/todos') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'malformed JSON body' });
    }
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof body.title !== 'string' ||
      body.title.trim() === ''
    ) {
      return sendJson(res, 400, {
        error: 'title is required and must be a non-empty string',
      });
    }
    const todo = { id: crypto.randomUUID(), title: body.title, done: false };
    todos.push(todo);
    return sendJson(res, 201, todo);
  }

  const todoMatch = pathname.match(/^\/todos\/([^/]+)$/);
  if (todoMatch) {
    const id = decodeURIComponent(todoMatch[1]);

    if (method === 'PATCH') {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (e) {
        return sendJson(res, 400, { error: 'malformed JSON body' });
      }
      const todo = todos.find((t) => String(t.id) === id);
      if (!todo) return notFound(res);

      if (typeof body !== 'object' || body === null) {
        return sendJson(res, 400, { error: 'body must be a JSON object' });
      }
      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim() === '') {
          return sendJson(res, 400, {
            error: 'title must be a non-empty string',
          });
        }
        todo.title = body.title;
      }
      if (body.done !== undefined) {
        if (typeof body.done !== 'boolean') {
          return sendJson(res, 400, { error: 'done must be a boolean' });
        }
        todo.done = body.done;
      }
      return sendJson(res, 200, todo);
    }

    if (method === 'DELETE') {
      const idx = todos.findIndex((t) => String(t.id) === id);
      if (idx === -1) return notFound(res);
      todos.splice(idx, 1);
      res.writeHead(204);
      return res.end();
    }
  }

  return notFound(res);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('unhandled error:', err);
    sendJson(res, 500, { error: 'internal error' });
  });
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`todo api listening on 0.0.0.0:${PORT}, greeting="${GREETING}"`);
  });
}

module.exports = { server };
