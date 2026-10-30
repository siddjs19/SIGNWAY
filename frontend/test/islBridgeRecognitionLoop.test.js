import test from 'node:test';
import assert from 'node:assert/strict';
import { startIslBridgeRecognitionLoop } from '../src/services/islBridgeRecognitionLoop.js';

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createScheduler() {
  let callback;
  let cancelled = false;
  return {
    schedule(nextCallback, intervalMs) {
      callback = nextCallback;
      assert.equal(intervalMs, 700);
      return callback;
    },
    cancel(timer) {
      assert.equal(timer, callback);
      cancelled = true;
    },
    tick() {
      if (!cancelled) callback();
    },
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test('skips scheduled frames while a recognition request is in flight', async () => {
  const scheduler = createScheduler();
  const pending = deferred();
  const submitted = [];
  const results = [];
  const latencies = [];
  const requestLock = { current: false };
  let time = 0;
  const stop = startIslBridgeRecognitionLoop({
    intervalMs: 700,
    captureFrame: async () => 'jpeg',
    submitFrame: (image) => {
      submitted.push(image);
      return pending.promise;
    },
    onRequestStart: () => {},
    onResult: (result) => results.push(result),
    onEmpty: () => {},
    onError: (error) => assert.fail(error),
    onLatency: (latency) => latencies.push(latency),
    requestLock,
    now: () => {
      time += 25;
      return time;
    },
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  });

  await flushMicrotasks();
  scheduler.tick();
  await flushMicrotasks();
  assert.equal(submitted.length, 1);

  pending.resolve({ sign: 'A', word: '', sentence: '' });
  await flushMicrotasks();
  assert.equal(requestLock.current, false);
  assert.equal(results.length, 1);
  assert.deepEqual(latencies, [25]);
  scheduler.tick();
  await flushMicrotasks();
  assert.equal(submitted.length, 2);
  stop();
});

test('stopping cancels future captures and ignores an in-flight response', async () => {
  const scheduler = createScheduler();
  const pending = deferred();
  const results = [];
  const errors = [];
  let captureCount = 0;
  const stop = startIslBridgeRecognitionLoop({
    captureFrame: async () => {
      captureCount += 1;
      return 'jpeg';
    },
    submitFrame: () => pending.promise,
    onRequestStart: () => {},
    onResult: (result) => results.push(result),
    onEmpty: () => {},
    onError: (error) => errors.push(error),
    onLatency: () => {},
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  });

  await flushMicrotasks();
  stop();
  scheduler.tick();
  pending.resolve({ sign: 'A', word: 'A', sentence: 'A' });
  await flushMicrotasks();

  assert.equal(captureCount, 1);
  assert.equal(results.length, 0);
  assert.equal(errors.length, 0);
});

test('does not submit a captured frame if stopped before capture completes', async () => {
  const scheduler = createScheduler();
  const pendingCapture = deferred();
  let submitCount = 0;
  const stop = startIslBridgeRecognitionLoop({
    captureFrame: () => pendingCapture.promise,
    submitFrame: async () => {
      submitCount += 1;
      return { sign: 'A', word: '', sentence: '' };
    },
    onRequestStart: () => {},
    onResult: () => {},
    onEmpty: () => {},
    onError: (error) => assert.fail(error),
    onLatency: () => {},
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  });

  stop();
  pendingCapture.resolve('jpeg');
  await flushMicrotasks();
  assert.equal(submitCount, 0);
});
