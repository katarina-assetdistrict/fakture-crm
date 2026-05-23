import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, query, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Firma, Klijent, Faktura, Uplata, Izvod } from '../types';

export type CollectionName = 'firme' | 'klijenti' | 'fakture' | 'uplate' | 'izvodi';

const userCol = (uid: string, col: CollectionName) =>
  collection(db, 'users', uid, col);

const userDoc = (uid: string, col: CollectionName, id: string) =>
  doc(db, 'users', uid, col, id);

// ── Listeners ──────────────────────────────────────────────────────────────

export function subscribeFirme(uid: string, cb: (d: Firma[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, 'firme')), snap =>
    cb(snap.docs.map(d => d.data() as Firma)));
}

export function subscribeKlijenti(uid: string, cb: (d: Klijent[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, 'klijenti')), snap =>
    cb(snap.docs.map(d => d.data() as Klijent)));
}

export function subscribeFakture(uid: string, cb: (d: Faktura[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, 'fakture')), snap =>
    cb(snap.docs.map(d => d.data() as Faktura)));
}

export function subscribeUplate(uid: string, cb: (d: Uplata[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, 'uplate')), snap =>
    cb(snap.docs.map(d => d.data() as Uplata)));
}

export function subscribeIzvodi(uid: string, cb: (d: Izvod[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, 'izvodi')), snap =>
    cb(snap.docs.map(d => d.data() as Izvod)));
}

// ── Writes ──────────────────────────────────────────────────────────────────

export const upsertFirma = (uid: string, f: Firma) =>
  setDoc(userDoc(uid, 'firme', f.id), f);

export const upsertKlijent = (uid: string, k: Klijent) =>
  setDoc(userDoc(uid, 'klijenti', k.id), k);

export const upsertFaktura = (uid: string, f: Faktura) =>
  setDoc(userDoc(uid, 'fakture', f.id), f);

export const upsertUplata = (uid: string, u: Uplata) =>
  setDoc(userDoc(uid, 'uplate', u.id), u);

export const upsertIzvod = (uid: string, i: Izvod) =>
  setDoc(userDoc(uid, 'izvodi', i.id), i);

export const deleteKlijentDoc = (uid: string, id: string) =>
  deleteDoc(userDoc(uid, 'klijenti', id));

export const deleteFakturaDoc = (uid: string, id: string) =>
  deleteDoc(userDoc(uid, 'fakture', id));

export const deleteUplataDoc = (uid: string, id: string) =>
  deleteDoc(userDoc(uid, 'uplate', id));

// Batch delete multiple docs from a collection
export async function batchDelete(uid: string, col: CollectionName, ids: string[]) {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) batch.delete(userDoc(uid, col, id));
  await batch.commit();
}

// Batch upsert — used for imports
export async function batchUpsert<T extends { id: string }>(
  uid: string,
  col: CollectionName,
  items: T[],
) {
  if (items.length === 0) return;
  // Firestore batch max 500 ops
  for (let i = 0; i < items.length; i += 500) {
    const batch = writeBatch(db);
    for (const item of items.slice(i, i + 500)) {
      batch.set(userDoc(uid, col, item.id), item);
    }
    await batch.commit();
  }
}

// Seed default firme for a new user
export const DEFAULT_FIRME: Firma[] = [
  { id: 'firma-best-app', naziv: 'Best App d.o.o.', kreirana: '2024-01-01' },
  { id: 'firma-best-digital', naziv: 'Best Digital', kreirana: '2024-01-01' },
];

export async function seedFirme(uid: string) {
  const batch = writeBatch(db);
  for (const f of DEFAULT_FIRME) {
    batch.set(userDoc(uid, 'firme', f.id), f);
  }
  await batch.commit();
}
