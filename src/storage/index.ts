/**
 * The one place that decides which backend the app uses.
 * To add a server later: write `RemoteStorage implements Storage` and return it here.
 */
import type { Storage } from "./types";
import { IdbStorage } from "./idb";
import { MemoryStorage } from "./memory";

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  instance = typeof indexedDB !== "undefined" ? new IdbStorage() : new MemoryStorage();
  return instance;
}

export * from "./types";
