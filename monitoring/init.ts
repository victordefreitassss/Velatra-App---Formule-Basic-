import { initializeMonitoring } from './sentry';

initializeMonitoring(import.meta.env.PROD, import.meta.env.VITE_SENTRY_DSN, __VELATRA_BUILD_COMMIT__, __VELATRA_MONITORING_TARGET__);
