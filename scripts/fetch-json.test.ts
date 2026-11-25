import assert from "node:assert/strict";
import test from "node:test";
import { fetchJson } from "./fetch-json.ts";

test("retries transient responses with bounded backoff and Retry-After", async () => {
  const delays: number[] = [];
  const statuses = [503, 429, 200];
  const result = await fetchJson(
    "https://example.test",
    {},
    {
      fetcher: (async () =>
        new Response('{"ok":true}', {
          status: statuses.shift(),
          headers: { "retry-after": "999" },
        })) as typeof fetch,
      sleep: async (ms) => {
        delays.push(ms);
      },
    },
  );
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(delays, [10_000, 10_000]);
});

test("network failures have finite attempts and exponential backoff", async () => {
  let requests = 0;
  const delays: number[] = [];
  await assert.rejects(
    fetchJson(
      "https://example.test",
      {},
      {
        fetcher: (async () => {
          requests++;
          throw new TypeError("network down");
        }) as typeof fetch,
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    ),
    /network down/,
  );
  assert.equal(requests, 3);
  assert.deepEqual(delays, [500, 1000]);
});

test("client errors and malformed JSON are not retried", async () => {
  for (const status of [400, 200]) {
    let requests = 0;
    await assert.rejects(
      fetchJson(
        "https://example.test",
        {},
        {
          fetcher: (async () => {
            requests++;
            return new Response("broken", { status });
          }) as typeof fetch,
          sleep: async () => assert.fail("Unexpected retry"),
        },
      ),
    );
    assert.equal(requests, 1);
  }
});

test("timeout covers response body consumption", async () => {
  let requests = 0;
  const fetcher = (async (_url, init) => {
    requests++;
    return {
      ok: true,
      json: () =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () =>
            reject(init!.signal!.reason),
          );
        }),
    } as Response;
  }) as typeof fetch;
  // AbortSignal.timeout is unref'd, so keep this test's event loop alive.
  const timer = setInterval(() => {}, 1000);
  try {
    await assert.rejects(
      fetchJson(
        "https://example.test",
        {},
        {
          fetcher,
          timeoutMs: 10,
          attempts: 2,
          sleep: async () => {},
        },
      ),
      /timeout/i,
    );
    assert.equal(requests, 2);
  } finally {
    clearInterval(timer);
  }
});
