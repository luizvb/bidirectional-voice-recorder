import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const root = resolve(__dirname);
  const env = loadEnv(mode, resolve(root, '..'), '');
  const outDir = resolve(root, 'dist');
  const apiUrl = env.VOXA_EXTENSION_API_URL || env.VOXA_API_URL || 'https://api-voxa.netolabs.dev';
  const appUrl = env.VOXA_WEB_APP_URL || 'https://voxa.netolabs.dev';
  const authUrl = env.VITE_NEON_AUTH_URL || '';
  const allowedOrigins = [apiUrl, appUrl, authUrl]
    .filter(Boolean)
    .map((value) => `${new URL(value).origin}/*`);

  return {
    root,
    plugins: [
      react(),
      {
        name: 'voxa-extension-manifest',
        closeBundle() {
          mkdirSync(outDir, { recursive: true });
          for (const size of [16, 32, 48, 128]) {
            copyFileSync(resolve(root, '..', 'public', `voxa-icon-${size}.png`), resolve(outDir, `icon-${size}.png`));
          }
          writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify({
            manifest_version: 3,
            minimum_chrome_version: '116',
            name: 'Voxa for Google Meet',
            description: 'Record Google Meet audio with consent and turn conversations into searchable transcripts.',
            version: '0.1.1',
            permissions: ['activeTab', 'offscreen', 'sidePanel', 'storage', 'tabCapture'],
            host_permissions: ['https://meet.google.com/*', ...allowedOrigins],
            background: { service_worker: 'service-worker.js', type: 'module' },
            action: { default_title: 'Open Voxa', default_icon: { '16': 'icon-16.png', '32': 'icon-32.png' } },
            icons: { '16': 'icon-16.png', '32': 'icon-32.png', '48': 'icon-48.png', '128': 'icon-128.png' },
            side_panel: { default_path: 'side-panel.html' },
            externally_connectable: { matches: [`${new URL(appUrl).origin}/*`] },
            content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" }
          }, null, 2));
        }
      }
    ],
    define: {
      __VOXA_API_URL__: JSON.stringify(apiUrl),
      __VOXA_APP_URL__: JSON.stringify(appUrl)
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'side-panel': resolve(root, 'side-panel.html'),
          offscreen: resolve(root, 'offscreen.html'),
          'service-worker': resolve(root, 'src/service-worker.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    },
    publicDir: resolve(root, 'public')
  };
});
