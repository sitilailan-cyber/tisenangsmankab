/**
 * Firestore Cache-First Service
 *
 * Mengimplementasikan caching data Firestore menggunakan:
 * 1. Persistent Local Cache (IndexedDB) dengan PersistentMultipleTabManager
 * 2. Metode 'onSnapshot' dengan opsi { includeMetadataChanges: true }
 * 3. Pendekatan Cache-First:
 *    - Langsung menyajikan data dari cache lokal (snapshot.metadata.fromCache === true)
 *      secara instan tanpa jeda jaringan dan TANPA kuota baca berulang (0 read billing).
 *    - Saat server merespons (fromCache === false), lakukan perbandingan diferensial (docChanges)
 *      agar re-render/re-fetch yang tidak perlu pada konten statis (modul & misi) dapat dihindari.
 * 4. Menyediakan React Hook 'useFirestoreCollectionCacheFirst' & 'useFirestoreDocCacheFirst'.
 */

import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDocsFromCache,
  getDoc,
  getDocFromCache,
  setDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { firebaseApp } from './firebaseRealtime';
import { Mission } from '../types';

// ============================================================================
// 1. TIPE DATA UNTUK KONTEN STATIS (MODUL PEMBELAJARAN & MISI)
// ============================================================================

export interface ModuleSection {
  id: string;
  title: string;
  content: string;
  keyPoints?: string[];
  formula?: string;
  interactiveType?: 'formula' | 'diagram' | 'simulation' | 'quiz';
}

export interface LearningModule {
  id: string;
  subjectId: string;
  subjectName: string;
  topicTitle: string;
  description: string;
  curriculum: string; // e.g. "Kurikulum Merdeka — Fase F / Kelas XII"
  estimatedMinutes: number;
  sections: ModuleSection[];
  summary: string;
  updatedAt: string;
  version: number;
  isPublished: boolean;
}

export interface CacheMetadata {
  fromCache: boolean;
  hasPendingWrites: boolean;
  lastUpdated: number;
  readCountSaved: number;
}

export interface CacheFirstResult<T> {
  data: T;
  fromCache: boolean;
  hasPendingWrites: boolean;
  lastUpdated: number;
}

export interface CacheFirstSubscriptionOptions<T> {
  /** Callback saat data diterima (dari cache atau server) */
  onData: (data: T, metadata: CacheMetadata) => void;
  /** Callback jika terjadi error koneksi atau izin */
  onError?: (error: Error) => void;
  /** Jangan memicu re-render jika data server persis sama dengan cache */
  skipUnchangedServerUpdates?: boolean;
}

// ============================================================================
// 2. INISIALISASI FIRESTORE DENGAN PERSISTENT MULTI-TAB CACHE
// ============================================================================

let firestoreInstance: Firestore | null = null;
let isCachePersistenceActive = false;

function initFirestoreWithPersistentCache(): Firestore {
  if (firestoreInstance) return firestoreInstance;

  try {
    // Inisialisasi Firestore dengan IndexedDB persistent cache multi-tab
    firestoreInstance = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    isCachePersistenceActive = true;
    if (typeof window !== 'undefined') {
      console.info('[Firestore Cache] IndexedDB Persistent Multi-Tab Cache diaktifkan secara optimal.');
    }
  } catch (err: any) {
    console.warn('[Firestore Cache] Fallback ke memory cache:', err?.message || err);
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache(),
      });
      isCachePersistenceActive = false;
    } catch {
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  if (!firestoreInstance) {
    firestoreInstance = getFirestore(firebaseApp);
  }

  return firestoreInstance;
}

export const firestoreDb: Firestore = initFirestoreWithPersistentCache();

// ============================================================================
// 3. STATISTIK PENGHEMATAN KUOTA CACHE
// ============================================================================

class CacheMetrics {
  private cacheHits = 0;
  private serverSyncs = 0;
  private readsAvoided = 0;

  recordCacheHit(docsCount: number = 1) {
    this.cacheHits += 1;
    this.readsAvoided += docsCount;
  }

  recordServerSync() {
    this.serverSyncs += 1;
  }

  getStats() {
    const total = this.cacheHits + this.serverSyncs;
    const hitRate = total > 0 ? ((this.cacheHits / total) * 100).toFixed(1) : '100';
    return {
      cacheHits: this.cacheHits,
      serverSyncs: this.serverSyncs,
      readsAvoided: this.readsAvoided,
      hitRate: `${hitRate}%`,
      isPersistent: isCachePersistenceActive,
    };
  }
}

export const firestoreCacheMetrics = new CacheMetrics();

// ============================================================================
// 4. KONTEN STATIS BAWAAN (DEFAULT LEARNING MODULES)
// ============================================================================

export const DEFAULT_STATIC_MODULES: LearningModule[] = [
  {
    id: 'modul-fisika-kalor',
    subjectId: 'sbj-fisika',
    subjectName: 'Fisika Eksperimental',
    topicTitle: 'Kalor, Kalor Jenis, & Asas Black',
    description: 'Modul komprehensif perpindahan energi termal, kapasitas kalor, dan kesetimbangan termal.',
    curriculum: 'Kurikulum Merdeka — Fisika Fase F',
    estimatedMinutes: 45,
    version: 1,
    isPublished: true,
    updatedAt: '2026-03-01T00:00:00Z',
    sections: [
      {
        id: 'sec-1',
        title: 'Konsep Dasar Kalor',
        content: 'Kalor adalah bentuk energi yang berpindah dari benda bersuhu lebih tinggi ke benda bersuhu lebih rendah karena adanya perbedaan suhu. Satuan SI untuk kalor adalah Joule (J), sedangkan satuan umum lainnya adalah kalori (1 kal = 4,184 J).',
        keyPoints: [
          'Kalor merupakan energi yang transit/berpindah',
          'Arah aliran kalor spontan: dari suhu tinggi ke suhu rendah',
          'Satu kalori menaikkan 1 gram air sebesar 1°C',
        ],
      },
      {
        id: 'sec-2',
        title: 'Persamaan Kalor & Perubahan Suhu',
        content: 'Jumlah kalor yang diserap atau dilepas suatu zat sebanding dengan massa zat, kalor jenis, dan kenaikan/penurunan suhunya.',
        formula: 'Q = m · c · ΔT',
        keyPoints: [
          'Q = kalor yang diserap/dilepas (Joule)',
          'm = massa benda (kg)',
          'c = kalor jenis bahan (J/kg·°C)',
          'ΔT = perubahan suhu (T_akhir - T_awal)',
        ],
        interactiveType: 'formula',
      },
      {
        id: 'sec-3',
        title: 'Asas Black & Kekekalan Energi Termal',
        content: 'Dalam sistem tertutup terisolasi tanpa pertukaran energi dengan lingkungan, jumlah kalor yang dilepas oleh benda bersuhu tinggi sama dengan jumlah kalor yang diserap oleh benda bersuhu rendah.',
        formula: 'Q_lepas = Q_terima',
        keyPoints: [
          'm1 · c1 · (T1 - Tc) = m2 · c2 · (Tc - T2)',
          'Tc = Suhu kesetimbangan termal campuran',
          'Berlaku pada kalorimeter ideal',
        ],
      },
    ],
    summary: 'Kalor mentransfer energi sampai tercapai kesetimbangan termal. Hubungan Q = m·c·ΔT dan Asas Black merupakan pilar perhitungan termal.',
  },
  {
    id: 'modul-biologi-pewarisan',
    subjectId: 'sbj-biologi',
    subjectName: 'Biologi Modern',
    topicTitle: 'Hukum Mendel & Pola-Pola Hereditas',
    description: 'Modul pewarisan sifat monohibrid, dihibrid, dan analisis persilangan genetik.',
    curriculum: 'Kurikulum Merdeka — Biologi Fase F',
    estimatedMinutes: 40,
    version: 1,
    isPublished: true,
    updatedAt: '2026-03-01T00:00:00Z',
    sections: [
      {
        id: 'sec-1',
        title: 'Hukum I Mendel (Segregasi Bebas)',
        content: 'Pada pembentukan gamet, pasangan gen (alel) akan memisah secara bebas sehingga setiap gamet hanya menerima satu gen dari pasangannya.',
        keyPoints: [
          'Berlaku untuk persilangan monohibrid',
          'Rasio fenotipe F2 dominan penuh = 3 : 1',
          'Rasio genotipe F2 = 1 (AA) : 2 (Aa) : 1 (aa)',
        ],
      },
      {
        id: 'sec-2',
        title: 'Hukum II Mendel (Asortasi Bebas)',
        content: 'Setiap alel dapat berpasangan secara bebas dengan alel lainnya yang tidak sealel pada saat pembentukan gamet.',
        keyPoints: [
          'Berlaku untuk persilangan dihibrid atau lebih',
          'Rasio fenotipe F2 persilangan dihibrid heterozigot = 9 : 3 : 3 : 1',
        ],
      },
    ],
    summary: 'Hukum segregasi dan asortasi bebas Mendel menjelaskan transmisi alel dari induk ke filial secara matematis.',
  },
];

// ============================================================================
// 5. IMPLEMENTASI CORE CACHE-FIRST onSnapshot
// ============================================================================

export class FirestoreCacheService {
  private db: Firestore;

  constructor() {
    this.db = firestoreDb;
  }

  /**
   * Helper untuk membuat hash isi data agar dapat mendeteksi perubahan nyata
   * tanpa memicu re-render ketika data server sama dengan data lokal di cache.
   */
  private generateContentHash(data: any): string {
    try {
      return JSON.stringify(data);
    } catch {
      return '';
    }
  }

  /**
   * Subscribe ke satu koleksi dengan pendekatan Cache-First:
   * 1. Mengaktifkan 'includeMetadataChanges: true' pada onSnapshot.
   * 2. Snapshot pertama diambil dari cache lokal (fromCache = true) dalam hitungan ms.
   * 3. UI langsung render tanpa loading spinner dan tanpa kuota read server.
   * 4. Saat snapshot server tiba (fromCache = false), cek apakah data berubah.
   *    Jika sama persis, abaikan perulangan re-render (hemat CPU & baterai).
   */
  public subscribeCollectionCacheFirst<T = DocumentData>(
    collectionName: string,
    options: CacheFirstSubscriptionOptions<T[]>,
    constraints: QueryConstraint[] = []
  ): Unsubscribe {
    const colRef = collection(this.db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);

    let lastKnownHash = '';
    let initialCacheServed = false;

    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fromCache = snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;

        const items: T[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as unknown as T[];

        const currentHash = this.generateContentHash(items);

        // Jika data dari cache lokal (IndexedDB)
        if (fromCache) {
          firestoreCacheMetrics.recordCacheHit(items.length);
          lastKnownHash = currentHash;
          initialCacheServed = true;

          options.onData(items, {
            fromCache: true,
            hasPendingWrites,
            lastUpdated: Date.now(),
            readCountSaved: items.length,
          });
          return;
        }

        // Jika data dari Server (fromCache === false)
        firestoreCacheMetrics.recordServerSync();

        // Optimasi Cache-First: jika data server identik dengan yang sudah disajikan dari cache,
        // dan opsi skip diaktifkan, jangan render ulang
        if (
          initialCacheServed &&
          options.skipUnchangedServerUpdates !== false &&
          currentHash === lastKnownHash &&
          snapshot.docChanges().length === 0
        ) {
          // Konten statis tidak berubah di server, skip re-render
          return;
        }

        lastKnownHash = currentHash;
        options.onData(items, {
          fromCache: false,
          hasPendingWrites,
          lastUpdated: Date.now(),
          readCountSaved: 0,
        });
      },
      (error) => {
        console.warn(`[Firestore Cache] Subscription error pada ${collectionName}:`, error.message);
        if (options.onError) {
          options.onError(error);
        }
      }
    );
  }

  /**
   * Subscribe ke satu dokumen dengan pendekatan Cache-First
   */
  public subscribeDocCacheFirst<T = DocumentData>(
    collectionName: string,
    docId: string,
    options: CacheFirstSubscriptionOptions<T | null>
  ): Unsubscribe {
    const docRef = doc(this.db, collectionName, docId);
    let lastKnownHash = '';
    let initialCacheServed = false;

    return onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap: DocumentSnapshot<DocumentData>) => {
        const fromCache = docSnap.metadata.fromCache;
        const hasPendingWrites = docSnap.metadata.hasPendingWrites;

        let item: T | null = null;
        if (docSnap.exists()) {
          item = { id: docSnap.id, ...docSnap.data() } as unknown as T;
        }

        const currentHash = this.generateContentHash(item);

        if (fromCache) {
          firestoreCacheMetrics.recordCacheHit(1);
          lastKnownHash = currentHash;
          initialCacheServed = true;

          options.onData(item, {
            fromCache: true,
            hasPendingWrites,
            lastUpdated: Date.now(),
            readCountSaved: 1,
          });
          return;
        }

        firestoreCacheMetrics.recordServerSync();

        if (
          initialCacheServed &&
          options.skipUnchangedServerUpdates !== false &&
          currentHash === lastKnownHash
        ) {
          return;
        }

        lastKnownHash = currentHash;
        options.onData(item, {
          fromCache: false,
          hasPendingWrites,
          lastUpdated: Date.now(),
          readCountSaved: 0,
        });
      },
      (error) => {
        console.warn(`[Firestore Cache] Doc error ${collectionName}/${docId}:`, error.message);
        if (options.onError) {
          options.onError(error);
        }
      }
    );
  }

  /**
   * One-shot fetch dengan pendekatan Cache-First murni:
   * 1. Coba ambil dari IndexedDB cache terlebih dahulu (getDocsFromCache)
   * 2. Jika cache kosong atau belum ada data, ambil menggunakan getDocs (mendukung offline cache secara mulus tanpa error source: 'server')
   */
  public async getDocsCacheFirst<T = DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<CacheFirstResult<T[]>> {
    const colRef = collection(this.db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);

    try {
      const cacheSnap = await getDocsFromCache(q);
      if (!cacheSnap.empty) {
        firestoreCacheMetrics.recordCacheHit(cacheSnap.size);
        const data = cacheSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as T[];
        return {
          data,
          fromCache: true,
          hasPendingWrites: cacheSnap.metadata.hasPendingWrites,
          lastUpdated: Date.now(),
        };
      }
    } catch {
      // Cache miss atau belum ada data di IndexedDB
    }

    // Gunakan getDocs yang otomatis mendukung online/offline cache tanpa memaksakan source ke server
    try {
      const snap = await getDocs(q);
      firestoreCacheMetrics.recordServerSync();
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as T[];
      return {
        data,
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        lastUpdated: Date.now(),
      };
    } catch {
      // Fallback cadangan: coba baca kembali dari cache jika getDocs mengalami kendala jaringan
      try {
        const fallbackSnap = await getDocsFromCache(q);
        const data = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as T[];
        return {
          data,
          fromCache: true,
          hasPendingWrites: fallbackSnap.metadata.hasPendingWrites,
          lastUpdated: Date.now(),
        };
      } catch {
        return {
          data: [],
          fromCache: false,
          hasPendingWrites: false,
          lastUpdated: Date.now(),
        };
      }
    }
  }

  /**
   * One-shot fetch dokumen tunggal dengan Cache-First
   */
  public async getDocCacheFirst<T = DocumentData>(
    collectionName: string,
    docId: string
  ): Promise<CacheFirstResult<T | null>> {
    const docRef = doc(this.db, collectionName, docId);

    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        firestoreCacheMetrics.recordCacheHit(1);
        return {
          data: { id: cacheSnap.id, ...cacheSnap.data() } as unknown as T,
          fromCache: true,
          hasPendingWrites: cacheSnap.metadata.hasPendingWrites,
          lastUpdated: Date.now(),
        };
      }
    } catch {
      // Cache miss
    }

    try {
      const snap = await getDoc(docRef);
      firestoreCacheMetrics.recordServerSync();
      return {
        data: snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as T) : null,
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        lastUpdated: Date.now(),
      };
    } catch {
      try {
        const fallbackSnap = await getDocFromCache(docRef);
        return {
          data: fallbackSnap.exists() ? ({ id: fallbackSnap.id, ...fallbackSnap.data() } as unknown as T) : null,
          fromCache: true,
          hasPendingWrites: fallbackSnap.metadata.hasPendingWrites,
          lastUpdated: Date.now(),
        };
      } catch {
        return {
          data: null,
          fromCache: false,
          hasPendingWrites: false,
          lastUpdated: Date.now(),
        };
      }
    }
  }

  // ==========================================================================
  // 6. KHUSUS: KONTEN STATIS MODUL PEMBELAJARAN
  // ==========================================================================

  /**
   * Subscribe ke seluruh Modul Pembelajaran dengan Cache-First
   */
  public subscribeLearningModules(
    options: CacheFirstSubscriptionOptions<LearningModule[]>,
    subjectId?: string
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [];
    if (subjectId) {
      constraints.push(where('subjectId', '==', subjectId));
    }

    return this.subscribeCollectionCacheFirst<LearningModule>(
      'modul_pembelajaran',
      {
        ...options,
        onData: (modules, metadata) => {
          // Jika Firestore masih kosong, fallback isi modul statis lokal
          const finalModules = modules && modules.length > 0 ? modules : DEFAULT_STATIC_MODULES;
          options.onData(finalModules, metadata);
        },
      },
      constraints
    );
  }

  /**
   * Ambil modul pembelajaran berdasarkan ID (Cache-First)
   */
  public async getLearningModuleById(moduleId: string): Promise<LearningModule | null> {
    const res = await this.getDocCacheFirst<LearningModule>('modul_pembelajaran', moduleId);
    if (res.data) return res.data;

    // Fallback ke built-in default modules jika belum ada di Firestore
    const local = DEFAULT_STATIC_MODULES.find((m) => m.id === moduleId);
    return local || null;
  }

  /**
   * Simpan atau perbarui Modul Pembelajaran di Firestore (sekaligus mengisi cache lokal)
   */
  public async saveLearningModule(moduleData: LearningModule): Promise<void> {
    const docRef = doc(this.db, 'modul_pembelajaran', moduleData.id);
    await setDoc(docRef, {
      ...moduleData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // ==========================================================================
  // 7. KHUSUS: KONTEN STATIS DATA MISI (Misi 1-6 & Modul Bacaan)
  // ==========================================================================

  /**
   * Subscribe ke Data Misi dengan Cache-First 'onSnapshot'
   */
  public subscribeMissions(
    options: CacheFirstSubscriptionOptions<Mission[]>,
    classId?: string
  ): Unsubscribe {
    const constraints: QueryConstraint[] = [];
    if (classId && classId !== 'ALL' && classId !== 'all') {
      constraints.push(where('classId', '==', classId));
    }

    return this.subscribeCollectionCacheFirst<Mission>(
      'misi',
      options,
      constraints
    );
  }

  /**
   * Ambil Misi per kelas dengan Cache-First
   */
  public async getMissionsCacheFirst(classId?: string): Promise<Mission[]> {
    const constraints: QueryConstraint[] = [];
    if (classId && classId !== 'ALL' && classId !== 'all') {
      constraints.push(where('classId', '==', classId));
    }
    const res = await this.getDocsCacheFirst<Mission>('misi', constraints);
    return res.data;
  }

  /**
   * Simpan Misi ke Firestore (sekaligus memperbarui IndexedDB cache lokal)
   */
  public async saveMission(mission: Mission): Promise<void> {
    const cleanMission = { ...mission };
    if (cleanMission.supportingData && (cleanMission.supportingData.startsWith('data:') || cleanMission.supportingData.startsWith('blob:') || cleanMission.supportingData.length > 500)) {
      cleanMission.supportingData = '';
    }
    const docRef = doc(this.db, 'misi', cleanMission.id);
    await setDoc(docRef, {
      ...cleanMission,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  /**
   * Hapus Misi dari Firestore dan cache IndexedDB
   */
  public async deleteMission(missionId: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'misi', missionId);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('[Firestore Cache] deleteMission error:', e);
    }
  }

  /**
   * Inisialisasi awal modul pembelajaran default ke Firestore jika diperlukan
   */
  public async seedDefaultModulesIfEmpty(): Promise<void> {
    try {
      const res = await this.getDocsCacheFirst<LearningModule>('modul_pembelajaran');
      if (res.data.length === 0) {
        for (const mod of DEFAULT_STATIC_MODULES) {
          await this.saveLearningModule(mod);
        }
        console.info('[Firestore Cache] Default learning modules seeded to Firestore cache.');
      }
    } catch (e) {
      console.warn('[Firestore Cache] Seed default modules skipped:', e);
    }
  }
}

// Instance singleton
export const firestoreCache = new FirestoreCacheService();
