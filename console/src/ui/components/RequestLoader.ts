const DEFAULT_MESSAGE =
  'Contacting API — please wait (database may take a few seconds to wake up)';

const SPINNER_FRAMES = ['|', '/', '-', '\\'] as const;
const SPINNER_INTERVAL_MS = 120;

export async function withRequestLoader<T>(
  operation: () => Promise<T>,
  message: string = DEFAULT_MESSAGE,
): Promise<T> {
  let frameIndex = 0;
  let spinnerTimer: ReturnType<typeof setInterval> | null = null;

  const writeSpinner = (): void => {
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    frameIndex += 1;
    process.stderr.write(`\r\x1b[K${message} ${frame}`);
  };

  const stop = (): void => {
    if (spinnerTimer !== null) {
      clearInterval(spinnerTimer);
      spinnerTimer = null;
    }
    process.stderr.write('\r\x1b[K');
  };

  writeSpinner();
  spinnerTimer = setInterval(writeSpinner, SPINNER_INTERVAL_MS);

  try {
    return await operation();
  } finally {
    stop();
  }
}
