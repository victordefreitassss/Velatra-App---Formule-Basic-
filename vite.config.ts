import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
        'process.env.APP_URL': JSON.stringify(process.env.APP_URL || env.APP_URL || env.VITE_APP_URL || ''),
        'process.env.GOOGLE_FIT_CLIENT_ID': JSON.stringify(process.env.GOOGLE_FIT_CLIENT_ID || env.GOOGLE_FIT_CLIENT_ID || env.VITE_GOOGLE_FIT_CLIENT_ID || ''),
        'process.env.GOOGLE_FIT_CLIENT_SECRET': JSON.stringify(process.env.GOOGLE_FIT_CLIENT_SECRET || env.GOOGLE_FIT_CLIENT_SECRET || env.VITE_GOOGLE_FIT_CLIENT_SECRET || ''),
        'process.env.STRAVA_CLIENT_ID': JSON.stringify(process.env.STRAVA_CLIENT_ID || env.STRAVA_CLIENT_ID || env.VITE_STRAVA_CLIENT_ID || ''),
        'process.env.STRAVA_CLIENT_SECRET': JSON.stringify(process.env.STRAVA_CLIENT_SECRET || env.STRAVA_CLIENT_SECRET || env.VITE_STRAVA_CLIENT_SECRET || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
