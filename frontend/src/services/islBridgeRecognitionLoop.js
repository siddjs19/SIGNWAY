export function hasMeaningfulIslBridgeResult(result) {
  return Boolean(
    result
    && ['sign', 'word', 'sentence'].some((key) => (
      typeof result[key] === 'string' && result[key].trim().length > 0
    )),
  );
}

export function startIslBridgeRecognitionLoop({
  intervalMs = 700,
  captureFrame,
  submitFrame,
  onRequestStart,
  onResult,
  onEmpty,
  onError,
  onLatency,
  requestLock = { current: false },
  now = () => performance.now(),
  schedule = setInterval,
  cancel = clearInterval,
}) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1) {
    throw new RangeError('Recognition interval must be a positive number.');
  }
  if (
    typeof captureFrame !== 'function'
    || typeof submitFrame !== 'function'
    || typeof onRequestStart !== 'function'
    || typeof onResult !== 'function'
    || typeof onEmpty !== 'function'
    || typeof onError !== 'function'
    || typeof onLatency !== 'function'
  ) {
    throw new TypeError('Recognition loop callbacks are required.');
  }

  let active = true;
  const runFrame = async () => {
    if (!active || requestLock.current) return;
    requestLock.current = true;
    let requestStartedAt;
    try {
      onRequestStart();
      const image = await captureFrame();
      if (!active) return;

      requestStartedAt = now();
      let result;
      try {
        result = await submitFrame(image);
      } finally {
        if (active) onLatency(Math.max(0, now() - requestStartedAt));
      }
      if (!active) return;

      if (hasMeaningfulIslBridgeResult(result)) {
        onResult(result);
      } else {
        onEmpty();
      }
    } catch (error) {
      if (active) onError(error);
    } finally {
      requestLock.current = false;
    }
  };

  const timer = schedule(() => {
    void runFrame();
  }, intervalMs);
  void runFrame();

  return () => {
    active = false;
    cancel(timer);
  };
}
