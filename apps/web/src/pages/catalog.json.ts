import type { APIRoute } from 'astro';
import { tools } from '../lib/catalog';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        schemaVersion: 1,
        tools,
      },
      null,
      2,
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
