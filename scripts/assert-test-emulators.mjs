import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const project = 'demo-velatra';
const required = {
  GCLOUD_PROJECT: project,
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199'
};
const credentials = [
  'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_TOKEN',
  'FIREBASE_CLI_ACCESS_TOKEN', 'FIREBASE_CLI_REFRESH_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS', 'google_application_credentials',
  'GOOGLE_CREDENTIALS', 'GOOGLE_CLOUD_KEYFILE_JSON', 'GCLOUD_KEYFILE_JSON',
  'GOOGLE_OAUTH_ACCESS_TOKEN', 'CLOUDSDK_AUTH_ACCESS_TOKEN',
  'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE'
];

// Validate before any Firebase SDK imports. Error messages contain names, never values.
export function assertTestEmulators(env) {
  for (const [name, expected] of Object.entries(required)) {
    if (env[name] !== expected) throw new Error(`Unsafe test environment: ${name} must target the local demo emulators.`);
  }
  if (env.GOOGLE_CLOUD_PROJECT !== undefined && env.GOOGLE_CLOUD_PROJECT !== project) {
    throw new Error('Unsafe test environment: GOOGLE_CLOUD_PROJECT must be demo-velatra.');
  }
  for (const name of credentials) {
    if (env[name] !== undefined && env[name] !== '') {
      throw new Error(`Unsafe test environment: remove ${name}; tests must not receive credentials.`);
    }
  }
  if (env.FIREBASE_CONFIG !== undefined) {
    let config;
    try { config = JSON.parse(env.FIREBASE_CONFIG); } catch {
      throw new Error('Unsafe test environment: FIREBASE_CONFIG must be inline demo JSON, never a file.');
    }
    if (!config || typeof config !== 'object' || Array.isArray(config) || config.projectId !== project) {
      throw new Error('Unsafe test environment: FIREBASE_CONFIG must identify demo-velatra.');
    }
    if (config.storageBucket !== undefined && ![`${project}.appspot.com`, `${project}.firebasestorage.app`].includes(config.storageBucket)) {
      throw new Error('Unsafe test environment: FIREBASE_CONFIG storageBucket must target demo-velatra.');
    }
    if (config.databaseURL !== undefined && config.databaseURL !== `https://${project}.firebaseio.com`) {
      throw new Error('Unsafe test environment: FIREBASE_CONFIG databaseURL must target demo-velatra.');
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assertTestEmulators(process.env);
    console.log('Test isolation verified: demo-velatra, local Auth/Firestore/Storage, no explicit credentials.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
