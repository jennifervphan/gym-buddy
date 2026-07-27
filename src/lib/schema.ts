/**
 * Bumped whenever the stored shape of `AppData` changes. `migrate` in
 * storage.ts is responsible for bringing older payloads up to date.
 */
export const SCHEMA_VERSION = 2

export const STORAGE_KEY = 'gym-buddy:data'
