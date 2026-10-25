/**
 * Store layer: Reads & writes to Cloud Firestore.
 * Automatically handles local persistence synchronization if remote Firestore
 * rejects due to permission rules or offline connectivity.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_STORAGE_KEY_PREFIX = 'hcm_lite_collection_';

export class Store {
  // Local fallback cache helper
  private static getLocalCollection<T>(collectionName: string): T[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${collectionName}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static setLocalCollection<T>(collectionName: string, items: T[]): void {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${collectionName}`, JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  static async getDocument<T>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as unknown as T;
      }
    } catch (err) {
      console.warn(`Firestore read fallback for ${collectionName}/${docId}:`, err);
    }

    // Local fallback
    const items = this.getLocalCollection<any>(collectionName);
    return (items.find((item: any) => item.id === docId || item.uid === docId) || null) as T | null;
  }

  static async getAllDocuments<T>(
    collectionName: string
  ): Promise<T[]> {
    try {
      const colRef = collection(db, collectionName);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const results: T[] = [];
        snap.forEach((d) => {
          results.push({ id: d.id, ...d.data() } as unknown as T);
        });
        // Sync local cache
        this.setLocalCollection(collectionName, results);
        return results;
      }
    } catch (err) {
      console.warn(`Firestore getCollection fallback for ${collectionName}:`, err);
    }

    return this.getLocalCollection<T>(collectionName);
  }

  static async setDocument<T extends object>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    // Save to local cache first for instant reactivity
    const items = this.getLocalCollection<any>(collectionName);
    const index = items.findIndex((i: any) => i.id === docId || i.uid === docId);
    if (index >= 0) {
      items[index] = { ...items[index], ...data, id: docId };
    } else {
      items.push({ ...data, id: docId });
    }
    this.setLocalCollection(collectionName, items);


    // Persist to Cloud Firestore
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn(`Firestore write fallback for ${collectionName}/${docId}:`, err);
    }
  }

  static async updateDocument<T>(
    collectionName: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> {
    const items = this.getLocalCollection<any>(collectionName);
    const index = items.findIndex((i) => i.id === docId);
    if (index >= 0) {
      items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
      this.setLocalCollection(collectionName, items);
    }

    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`Firestore update fallback for ${collectionName}/${docId}:`, err);
    }
  }

  static async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const items = this.getLocalCollection<any>(collectionName);
    const filtered = items.filter((i) => i.id !== docId);
    this.setLocalCollection(collectionName, filtered);

    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`Firestore delete fallback for ${collectionName}/${docId}:`, err);
    }
  }

  /**
   * Resets local business records for testing fresh install state
   */
  static clearBusinessRecords(): void {
    const collectionsToClear = [
      'employees',
      'attendance',
      'leaveRequests',
      'leaveBalances',
      'salaryStructures',
      'payrollRuns',
      'announcements',
      'notifications',
      'auditLogs',
      'aiLogs',
      'departments',
      'designations',
      'holidays',
      'attendanceCorrections',
    ];
    collectionsToClear.forEach((col) => {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${col}`);
    });
  }
}
