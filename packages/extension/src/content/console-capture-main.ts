/**
 * Console capture - MAIN world script.
 *
 * Declared in manifest.json with "world": "MAIN" and "run_at": "document_start".
 * This bypasses page CSP restrictions because Chrome injects it as an extension
 * content script, not as an inline <script> element.
 *
 * Monkey-patches console.log/error/warn/info/debug and listens for uncaught
 * errors and unhandled promise rejections. Forwards all entries to the ISOLATED
 * world via window.postMessage.
 */

const CH = 'webclaw-page-bridge';
const LEVELS: Array<'log' | 'error' | 'warn' | 'info' | 'debug'> = ['log', 'error', 'warn', 'info', 'debug'];

for (const level of LEVELS) {
  const orig = console[level].bind(console);
  console[level] = function (...args: unknown[]) {
    orig.apply(console, args);
    try {
      const msg = args
        .map((a) => {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === 'string') return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');

      const entry: Record<string, unknown> = {
        channel: CH,
        type: 'console-log-entry',
        level,
        message: msg,
        timestamp: Date.now(),
      };

      if (level === 'error' || level === 'warn') {
        const err = args.find((a): a is Error => a instanceof Error);
        if (err) {
          entry.stack = err.stack;
        } else {
          try {
            entry.stack = new Error().stack!.split('\n').slice(2).join('\n');
          } catch {
            // ignore
          }
        }
      }
      window.postMessage(entry, '*');
    } catch {
      // Never break the page
    }
  };
}

window.addEventListener('error', (ev) => {
  const loc = ev.filename
    ? `${ev.filename}:${ev.lineno}${ev.colno ? ':' + ev.colno : ''}`
    : '';
  window.postMessage(
    {
      channel: CH,
      type: 'console-log-entry',
      level: 'error',
      message: ev.message + (loc ? ' at ' + loc : ''),
      timestamp: Date.now(),
      stack: ev.error ? ev.error.stack || ev.message : ev.message,
    },
    '*',
  );
});

window.addEventListener('unhandledrejection', (ev) => {
  const reason = ev.reason;
  let msg: string;
  let stack: string | undefined;
  if (reason instanceof Error) {
    msg = reason.message;
    stack = reason.stack;
  } else {
    msg = String(reason);
  }
  window.postMessage(
    {
      channel: CH,
      type: 'console-log-entry',
      level: 'error',
      message: 'Unhandled Promise Rejection: ' + msg,
      timestamp: Date.now(),
      stack,
    },
    '*',
  );
});
