/**
 * Early console capture - ISOLATED world buffer.
 *
 * Runs at document_start in the ISOLATED world. Listens for console entries
 * forwarded from the MAIN world script (console-capture-main.js) via
 * window.postMessage, and buffers them in window.__webclawConsoleBuffer
 * for the main content script to read.
 */

interface BufferedEntry {
  level: string;
  message: string;
  timestamp: number;
  stack?: string;
}

// Shared buffer — the main content script reads from this
const buffer: BufferedEntry[] = [];
(window as unknown as { __webclawConsoleBuffer: BufferedEntry[] }).__webclawConsoleBuffer = buffer;

const MAX_BUFFER = 1000;

// Listen for entries forwarded from MAIN world via postMessage
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.channel !== 'webclaw-page-bridge') return;
  if (event.data.type !== 'console-log-entry') return;

  const entry: BufferedEntry = {
    level: event.data.level,
    message: event.data.message,
    timestamp: event.data.timestamp,
  };
  if (event.data.stack) {
    entry.stack = event.data.stack;
  }

  buffer.push(entry);
  while (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }
});
