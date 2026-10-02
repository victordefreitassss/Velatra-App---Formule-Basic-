// Server-side build flags only; never serialize Sentry upload credentials.
export function monitoringTarget(mode: string, command: string, env: Record<string, string | undefined>) {
  if (mode === 'test' || env.VITE_USE_FIREBASE_EMULATORS === 'true' || env.GITHUB_ACTIONS === 'true' || (env.CI === 'true' && env.VERCEL !== '1')) return 'test';
  if (env.VERCEL_ENV === 'preview') return 'preview';
  if (command === 'serve' || (env.VERCEL_ENV && env.VERCEL_ENV !== 'production')) return 'development';
  return 'production';
}
export function canUploadSourceMaps(target: string, env: Record<string, string | undefined>) {
  return target === 'production' && Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);
}
