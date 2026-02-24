import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '../../manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

describe('manifest.json MV3 compliance', () => {
  it('uses manifest_version 3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it('has required fields', () => {
    expect(manifest.name).toBe('WebClaw');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.description).toBeTruthy();
  });

  it('has a background service worker', () => {
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBeTruthy();
    expect(manifest.background.type).toBe('module');
  });

  it('has content scripts configuration', () => {
    expect(manifest.content_scripts).toBeInstanceOf(Array);
    expect(manifest.content_scripts.length).toBeGreaterThanOrEqual(3);

    // MAIN world console capture script runs at document_start
    const mainWorldCs = manifest.content_scripts[0];
    expect(mainWorldCs.matches).toContain('<all_urls>');
    expect(mainWorldCs.js).toContain('content/console-capture-main.js');
    expect(mainWorldCs.run_at).toBe('document_start');
    expect(mainWorldCs.world).toBe('MAIN');

    // ISOLATED world console buffer runs at document_start
    const isolatedCs = manifest.content_scripts[1];
    expect(isolatedCs.matches).toContain('<all_urls>');
    expect(isolatedCs.js).toContain('content/console-capture.js');
    expect(isolatedCs.run_at).toBe('document_start');

    // Main content script runs at document_idle
    const mainCs = manifest.content_scripts[2];
    expect(mainCs.matches).toContain('<all_urls>');
    expect(mainCs.js).toContain('content/content-script.js');
    expect(mainCs.run_at).toBe('document_idle');
  });

  it('has required permissions', () => {
    const required = ['activeTab', 'tabs', 'scripting', 'storage', 'alarms'];
    for (const perm of required) {
      expect(manifest.permissions).toContain(perm);
    }
  });

  it('has sidePanel permission', () => {
    expect(manifest.permissions).toContain('sidePanel');
  });

  it('has host_permissions for all URLs', () => {
    expect(manifest.host_permissions).toContain('<all_urls>');
  });

  it('has side_panel configuration', () => {
    expect(manifest.side_panel).toBeDefined();
    expect(manifest.side_panel.default_path).toBeTruthy();
  });

  it('has web_accessible_resources for page-bridge', () => {
    expect(manifest.web_accessible_resources).toBeInstanceOf(Array);
    const war = manifest.web_accessible_resources[0];
    expect(war.resources).toContain('content/page-bridge.js');
    expect(war.matches).toContain('<all_urls>');
  });

  it('has icons defined', () => {
    expect(manifest.icons).toBeDefined();
    expect(Object.keys(manifest.icons).length).toBeGreaterThan(0);
  });

  it('does not use MV2-only fields', () => {
    // These are not allowed in MV3
    expect(manifest.browser_action).toBeUndefined();
    expect(manifest.page_action).toBeUndefined();
    expect(manifest.background?.scripts).toBeUndefined();
    expect(manifest.background?.page).toBeUndefined();
  });

  it('service worker path ends with .js', () => {
    expect(manifest.background.service_worker).toMatch(/\.js$/);
  });

  it('content script paths end with .js', () => {
    for (const cs of manifest.content_scripts) {
      for (const js of cs.js) {
        expect(js).toMatch(/\.js$/);
      }
    }
  });
});
