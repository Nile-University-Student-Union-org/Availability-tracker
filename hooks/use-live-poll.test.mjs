import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("./use-live-poll.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function harness(visibility = "visible") {
  const slots = [];
  const effects = [];
  const timers = new Map();
  const document = new EventTarget();
  const window = new EventTarget();
  document.visibilityState = visibility;
  let cursor = 0;
  let nextTimer = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => (slots[index] = value)];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useCallback(callback) {
      return callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        effects.push(() => {
          previous?.cleanup();
          slots[index] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const exports = {};
  runInNewContext(source, {
    exports,
    require: () => react,
    document,
    window,
    AbortController,
    setInterval(callback, delay) {
      assert.equal(delay, 10000);
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearInterval: (id) => timers.delete(id),
  });
  return {
    render(fetcher) {
      cursor = 0;
      const result = exports.useLivePoll(fetcher, 10000, "server data");
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
    tick: () => [...timers.values()].forEach((callback) => callback()),
    visibility(value) {
      document.visibilityState = value;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    focus: () => window.dispatchEvent(new Event("focus")),
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
    timers,
  };
}

function requests() {
  const pending = [];
  const fetcher = (signal) =>
    new Promise((resolve, reject) => pending.push({ signal, resolve, reject }));
  return { pending, fetcher };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("polling retains data on failure, retries, and never overlaps", async () => {
  const h = harness();
  const { pending, fetcher } = requests();
  assert.equal(h.render(fetcher).data, "server data");
  assert.equal(pending.length, 1);
  h.tick();
  h.render(fetcher).refresh();
  assert.equal(pending.length, 1);
  pending[0].resolve("latest data");
  await settle();
  const updated = h.render(fetcher);
  assert.equal(updated.data, "latest data");
  assert.equal(typeof updated.lastUpdated, "number");
  h.tick();
  pending[1].reject(new Error("offline"));
  await settle();
  const failed = h.render(fetcher);
  assert.equal(failed.data, "latest data");
  assert.equal(failed.lastUpdated, updated.lastUpdated);
  assert.equal(failed.status, "reconnecting");
  h.tick();
  pending[2].resolve("recovered");
  await settle();
  assert.equal(h.render(fetcher).data, "recovered");
  assert.equal(h.render(fetcher).status, "live");
  h.unmount();
  assert.equal(h.timers.size, 0);
});

test("hidden tabs pause and visibility/focus refetch immediately", async () => {
  const h = harness("hidden");
  const { pending, fetcher } = requests();
  h.render(fetcher);
  h.focus();
  assert.equal(pending.length, 0);
  assert.equal(h.timers.size, 0);
  h.visibility("visible");
  assert.equal(pending.length, 1);
  pending[0].resolve("visible data");
  await settle();
  h.visibility("hidden");
  h.tick();
  assert.equal(pending.length, 1);
  assert.equal(h.timers.size, 0);
  h.visibility("visible");
  pending[1].resolve("resumed data");
  await settle();
  h.focus();
  assert.equal(pending.length, 3);
  h.unmount();
  assert.equal(pending[2].signal.aborted, true);
  pending[2].resolve("unmounted data");
  await settle();
  assert.equal(h.render(fetcher).data, "resumed data");
});

test("filter changes abort stale requests and wait before fetching the new filter", async () => {
  const h = harness();
  const old = requests();
  const next = requests();
  h.render(old.fetcher);
  h.render(next.fetcher);
  assert.equal(old.pending[0].signal.aborted, true);
  assert.equal(next.pending.length, 0);
  old.pending[0].resolve("stale committee data");
  await settle();
  assert.equal(h.render(next.fetcher).data, "server data");
  assert.equal(next.pending.length, 1);
  next.pending[0].resolve("selected committee data");
  await settle();
  assert.equal(h.render(next.fetcher).data, "selected committee data");
  h.unmount();
});
