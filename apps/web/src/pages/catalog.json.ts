import type { APIRoute } from 'astro';
import { tools } from '../lib/catalog';

export const GET: APIRoute = () => {
  const body = JSON.stringify({ schemaVersion: 1, tools }, null, 2);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
