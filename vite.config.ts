import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { monitoringTarget, canUploadSourceMaps } from './monitoring/buildConfig';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const target = monitoringTarget(mode, command, { ...env, ...process.env });
    const uploadMaps = canUploadSourceMaps(target, process.env);
    const commit = /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA || '') ? process.env.VERCEL_GIT_COMMIT_SHA : undefined;
    // Test mode is opt-in and cannot be included in a production build.
    const useEmulators = command === 'serve' && env.VITE_USE_FIREBASE_EMULATORS === 'true';
    
    let firebaseConfig = {};
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('Could not load firebase-applet-config.json:', e);
    }

    if (useEmulators) firebaseConfig = {
      apiKey: 'demo-velatra-local-only', authDomain: 'demo-velatra.firebaseapp.com',
      projectId: 'demo-velatra', storageBucket: 'demo-velatra.appspot.com', appId: 'demo-velatra'
    };

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), ...(uploadMaps ? [sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN, org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT,
        telemetry: false, release: { name: commit, create: Boolean(commit), finalize: Boolean(commit) },
        sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      })] : [])],
      build: { sourcemap: uploadMaps ? 'hidden' : false },
      define: {
        'process.env.APP_URL': JSON.stringify(process.env.APP_URL || env.APP_URL || env.VITE_APP_URL || ''),
        '__FIREBASE_APPLET_CONFIG__': JSON.stringify(firebaseConfig),
        '__USE_FIREBASE_EMULATORS__': JSON.stringify(useEmulators),
        '__VELATRA_BUILD_COMMIT__': JSON.stringify(commit || ''),
        '__VELATRA_MONITORING_TARGET__': JSON.stringify(target)
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        }
      }
    };
});
