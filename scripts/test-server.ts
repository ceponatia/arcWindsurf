import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/hello', (c) => c.text('Hello!'));

const port = 3002;
console.log(`Listening on ${port}...`);

serve({ fetch: app.fetch, port });
