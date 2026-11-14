"use client";
import { useSyncExternalStore } from "react";
import {
  CART_KEY,
  loadSavedCart,
  saveCart,
  addItem,
  changeQuantity,
  removeItem,
  type CartEntry,
} from "./model";

type Snapshot = { entries: CartEntry[]; ready: boolean; storageError: boolean };
const serverSnapshot: Snapshot = {
  entries: [],
  ready: false,
  storageError: false,
};
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function readStorage() {
  try {
    snapshot = {
      entries: loadSavedCart(localStorage),
      ready: true,
      storageError: false,
    };
  } catch {
    snapshot = { ...snapshot, ready: true, storageError: true };
  }
  emit();
}
function onStorage(event: StorageEvent) {
  if (event.key === CART_KEY || event.key === null) readStorage();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (!snapshot.storageError) readStorage();
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}
function update(transform: (entries: CartEntry[]) => CartEntry[]) {
  // Read the latest saved quantities before writes, including changes from other tabs.
  let entries = snapshot.entries;
  try {
    if (!snapshot.storageError) entries = loadSavedCart(localStorage);
  } catch {
    /* Preserve in-memory cart if storage is unavailable or corrupt. */
  }
  const next = transform(entries);
  let storageError = false;
  try {
    saveCart(localStorage, next);
  } catch {
    storageError = true;
  }
  snapshot = { entries: next, ready: true, storageError };
  emit();
}
export function useCart() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );
  return {
    ...state,
    add: (product: { id: number; is_active: boolean }) =>
      update((entries) => addItem(entries, product)),
    setQuantity: (id: number, quantity: number) =>
      update((entries) => changeQuantity(entries, id, quantity)),
    remove: (id: number) => update((entries) => removeItem(entries, id)),
  };
}
