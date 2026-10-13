/**
 * Firebase Realtime Database SDK Client & Real-time Synchronization
 * Kredensial Baru:
 * - Database URL: https://ti-senang-baru-default-rtdb.asia-southeast1.firebasedatabase.app
 * - Project ID: ti-senang-baru
 *
 * Struktur Node Database Utama:
 * - /misi         : Seluruh daftar misi pembelajaran dari guru
 * - /tugas_siswa  : Respon, pengerjaan, dan pengumpulan tugas siswa
 * - /portofolio   : Publikasi tugas/karya siswa yang tampil di beranda
 * - /alme_sisipan : Misi otomatis hasil analisis sistem ALME (Adaptive Learning Mission Engine)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  get,
  remove,
  update,
  Database,
  Unsubscribe,
  DataSnapshot,
} from 'firebase/database';
import {
  Mission,
  PortfolioItem,
  StudentProgress,
  AlmeIndividualMission,
  TujuanPembelajaran,
  AsesmenAwalInput,
  AsesmenAkhirRecord,
  User,
  Teacher,
  Student,
  ClassRoom,
} from '../types';
import { compressDataUrl, compressBase64ForFirebase } from '../utils/fileCompressor';

export const firebaseConfig = {
  apiKey: "AIzaSyDYSV4U3nrqwuYuicGkUSFVZ99AFHK87nc",
  authDomain: "ti-senang-baru.firebaseapp.com",
  databaseURL: "https://ti-senang-baru-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ti-senang-baru",
  storageBucket: "ti-senang-baru.firebasestorage.app",
  messagingSenderId: "641447068500",
  appId: "1:641447068500:web:06f919234459dd278ffec1",
  measurementId: "G-BJNB2GS4GP"
};

export const TI_SENANG_FIREBASE_CONFIG = firebaseConfig;

// URL Folder Google Drive Direktori Tugas Siswa
export const STUDENT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1Xc-5Y2HWvLQie3zuQZmgh9GAtX62D34h?usp=sharing';

// Inisialisasi Firebase App secara aman (singleton)
export const firebaseApp =
  getApps().length === 0 ? initializeApp(TI_SENANG_FIREBASE_CONFIG) : getApp();

export const firebaseDb: Database = getDatabase(firebaseApp);

export interface PortfolioComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'guru' | 'murid' | 'admin';
  text: string;
  createdAt: string;
}

export interface PortfolioAppreciation {
  hebat: number; // 👏
  keren: number; // 💡
  inspiratif: number; // 🔥
  userAppreciations?: Record<string, 'hebat' | 'keren' | 'inspiratif'>;
}

export interface StudentTaskSubmission {
  id: string;
  missionId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'GRADED';
  score?: number;
  xpEarned?: number;
  submittedAt: string;
  driveLink?: string;
  documentationUrl?: string;
  reflection?: string;
  conclusion?: string;
  answers?: Record<string, any>;
  teacherFeedback?: string;
  content?: string;
  fileAttachment?: string;
  tpId?: string;
}

export class FirebaseRealtimeService {
  private db: Database;
  private isOnline = false;
  private listeners: Map<string, Unsubscribe> = new Map();

  constructor() {
    this.db = firebaseDb;
    this.checkConnection();
  }

  public getDatabaseInstance(): Database {
    return this.db;
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${TI_SENANG_FIREBASE_CONFIG.databaseURL}/.json?shallow=true`, {
        method: 'GET',
      });
      this.isOnline = res.ok || res.status === 401 || res.status === 403;
      return this.isOnline;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  public isConnected(): boolean {
    return this.isOnline;
  }

  // =========================================================================
  // 1. NODE /misi : PENGELOLAAN MISI GURU REAL-TIME
  // =========================================================================

  /**
   * Berlangganan (real-time listener) perubahan daftar misi di node /misi
   */
  public subscribeMissions(callback: (missions: Mission[]) => void): () => void {
    const missionsRef = ref(this.db, 'misi');
    const unsub = onValue(
      missionsRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: Mission[] = Object.keys(val).map((key) => ({
          ...val[key],
          id: val[key].id || key,
        }));
        // Urutkan berdasarkan waktu buat (terbaru atau nomor misi)
        list.sort((a, b) => (a.coreMissionNumber || 0) - (b.coreMissionNumber || 0));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /misi warning:', error.message);
        // Fallback REST fetch jika websocket diblokir di sandbox
        this.fetchMissionsREST().then(callback);
      }
    );

    return () => unsub();
  }

  public async fetchMissionsREST(): Promise<Mission[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/misi.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((key) => ({ ...data[key], id: data[key].id || key }));
    } catch (e) {
      console.warn('[Firebase REST] Failed to fetch /misi:', e);
      return [];
    }
  }

  /**
   * Simpan atau update Misi di node /misi/<missionId>
   */
  public async saveMission(mission: Mission): Promise<void> {
    const cleanMission = { ...mission };
    if (cleanMission.supportingData && (cleanMission.supportingData.startsWith('data:') || cleanMission.supportingData.startsWith('blob:') || cleanMission.supportingData.length > 500)) {
      cleanMission.supportingData = STUDENT_DRIVE_FOLDER_URL;
    }
    const missionId = cleanMission.id;
    const missionRef = ref(this.db, `misi/${missionId}`);
    try {
      await set(missionRef, cleanMission);
    } catch (err) {
      console.warn('[Firebase] set /misi error, running REST fallback:', err);
      // REST fallback
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/misi/${missionId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanMission),
        }
      );
    }
  }

  public async setMisi(missionOrId: string | any, missionData?: any): Promise<void> {
    if (typeof missionOrId === 'object' && missionOrId !== null) {
      await this.saveMission(missionOrId);
    } else {
      await this.saveMission({ id: missionOrId, ...missionData });
    }
  }

  /**
   * Hapus Misi dari node /misi/<missionId>
   */
  public async deleteMission(missionId: string): Promise<void> {
    const missionRef = ref(this.db, `misi/${missionId}`);
    try {
      await remove(missionRef);
    } catch (err) {
      console.warn('[Firebase] remove /misi error, running REST fallback:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/misi/${missionId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // =========================================================================
  // 2. NODE /tugas_siswa : RESPON & PENGERJAAN TUGAS SISWA
  // =========================================================================

  /**
   * Berlangganan data pengerjaan tugas siswa di node /tugas_siswa
   */
  public subscribeStudentTasks(
    callback: (tasks: StudentTaskSubmission[]) => void,
    studentId?: string
  ): () => void {
    const tasksRef = ref(this.db, 'tugas_siswa');
    const unsub = onValue(
      tasksRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        let list: StudentTaskSubmission[] = Object.keys(val).map((key) => ({
          ...val[key],
          id: val[key].id || key,
        }));
        if (studentId) {
          list = list.filter((t) => t.studentId === studentId);
        }
        list.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /tugas_siswa warning:', error.message);
        this.fetchStudentTasksREST(studentId).then(callback);
      }
    );

    return () => unsub();
  }

  public async fetchStudentTasksREST(studentId?: string): Promise<StudentTaskSubmission[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/tugas_siswa.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      let list: StudentTaskSubmission[] = Object.keys(data).map((k) => ({
        ...data[k],
        id: data[k].id || k,
      }));
      if (studentId) {
        list = list.filter((t) => t.studentId === studentId);
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Simpan respon/tugas siswa ke /tugas_siswa/<submissionId>
   * Dilengkapi kompresi otomatis untuk setiap file/gambar
   * PASTIKAN FIREBASE TIDAK MENYIMPAN FILE FOTO ATAU DOKUMEN:
   * Simpan penugasan siswa ke Firebase node /tugas_siswa/<taskId>
   * Foto tugas dikompresi optimal & string base64 dikompresi agar tidak membebani server
   */
  public async submitStudentTask(submission: StudentTaskSubmission): Promise<void> {
    const finalSubmission = { ...submission };

    if (!finalSubmission.driveLink || finalSubmission.driveLink.trim() === '') {
      finalSubmission.driveLink = STUDENT_DRIVE_FOLDER_URL;
    }

    // Kompres string base64 berkas/foto tugas jika ada
    if (finalSubmission.fileAttachment && finalSubmission.fileAttachment.startsWith('data:image')) {
      try {
        finalSubmission.fileAttachment = await compressBase64ForFirebase(finalSubmission.fileAttachment);
      } catch (err) {
        console.warn('[Firebase] Gagal kompres base64 tugas:', err);
      }
    }
    if (finalSubmission.documentationUrl && finalSubmission.documentationUrl.startsWith('data:image')) {
      try {
        finalSubmission.documentationUrl = await compressBase64ForFirebase(finalSubmission.documentationUrl);
      } catch (err) {
        console.warn('[Firebase] Gagal kompres base64 dokumentasi tugas:', err);
      }
    }

    const subRef = ref(this.db, `tugas_siswa/${finalSubmission.id}`);
    try {
      await set(subRef, finalSubmission);
    } catch (err) {
      console.warn('[Firebase] set /tugas_siswa error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/tugas_siswa/${finalSubmission.id}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalSubmission),
        }
      );
    }
  }

  /**
   * Hapus penugasan siswa dari node /tugas_siswa/<taskId>
   */
  public async deleteStudentTask(taskId: string): Promise<void> {
    const taskRef = ref(this.db, `tugas_siswa/${taskId}`);
    try {
      await remove(taskRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/tugas_siswa/${taskId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // =========================================================================
  // 3. NODE /portofolio : PUBLIKASI KARYA DI BERANDA KELAS & GURU
  // =========================================================================

  /**
   * Berlangganan publikasi portofolio di node /portofolio
   */
  public subscribePortfolios(callback: (portfolios: PortfolioItem[]) => void): () => void {
    const pfRef = ref(this.db, 'portofolio');
    const unsub = onValue(
      pfRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: PortfolioItem[] = Object.keys(val).map((key) => ({
          ...val[key],
          id: val[key].id || key,
        }));
        // Urutkan berdasarkan yang terbaru
        list.sort((a, b) => {
          const timeA = new Date(a.date || a.createdAt || 0).getTime();
          const timeB = new Date(b.date || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /portofolio warning:', error.message);
        this.fetchPortfoliosREST().then(callback);
      }
    );

    return () => unsub();
  }

  public async fetchPortfoliosREST(): Promise<PortfolioItem[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/portofolio.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  /**
   * Simpan / Publikasikan Portofolio ke /portofolio/<portfolioId>
   * Foto dikompresi optimal & string base64 dikompresi ulang agar ringan,
   * tersimpan di Firebase tanpa menyebabkan overload pada server/database.
   */
  public async publishPortfolio(portfolio: PortfolioItem): Promise<void> {
    const finalPortfolio = { ...portfolio };

    if (!finalPortfolio.driveLink || finalPortfolio.driveLink.trim() === '') {
      finalPortfolio.driveLink = STUDENT_DRIVE_FOLDER_URL;
    }

    // Kompresi string base64 foto dokumentasi agar ringan (< 45KB) dan tidak overload di Firebase
    if (
      finalPortfolio.documentation &&
      (finalPortfolio.documentation.startsWith('data:image') || finalPortfolio.documentation.startsWith('blob:'))
    ) {
      try {
        finalPortfolio.documentation = await compressBase64ForFirebase(finalPortfolio.documentation);
      } catch (e) {
        console.warn('[Firebase RTDB] Gagal kompres base64 foto:', e);
      }
    }

    if (
      finalPortfolio.dokumentasiUrl &&
      (finalPortfolio.dokumentasiUrl.startsWith('data:image') || finalPortfolio.dokumentasiUrl.startsWith('blob:'))
    ) {
      try {
        finalPortfolio.dokumentasiUrl = await compressBase64ForFirebase(finalPortfolio.dokumentasiUrl);
      } catch (e) {
        console.warn('[Firebase RTDB] Gagal kompres base64 dokumentasiUrl:', e);
      }
    }

    if (!finalPortfolio.documentation) {
      finalPortfolio.documentation = finalPortfolio.driveLink || STUDENT_DRIVE_FOLDER_URL;
    }

    const pfId = finalPortfolio.id;
    const pfRef = ref(this.db, `portofolio/${pfId}`);
    try {
      await set(pfRef, finalPortfolio);
    } catch (err) {
      console.warn('[Firebase] set /portofolio error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/portofolio/${pfId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPortfolio),
        }
      );
    }
  }

  /**
   * Tambah Like pada portofolio di node /portofolio/<portfolioId>/likesCount
   */
  public async toggleLikePortfolio(
    portfolioId: string,
    userId: string,
    currentLikes = 0
  ): Promise<number> {
    const newLikes = currentLikes + 1;
    const pfRef = ref(this.db, `portofolio/${portfolioId}`);
    try {
      await update(pfRef, {
        likesCount: newLikes,
        [`likedBy/${userId}`]: true,
      });
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/portofolio/${portfolioId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ likesCount: newLikes }),
        }
      );
    }
    return newLikes;
  }

  /**
   * Tambah Komentar pada portofolio di node /portofolio/<portfolioId>/comments
   */
  public async addCommentToPortfolio(
    portfolioId: string,
    comment: Omit<PortfolioComment, 'id'>
  ): Promise<PortfolioComment> {
    const commentId = `cmt-${Date.now()}`;
    const newComment: PortfolioComment = {
      ...comment,
      id: commentId,
    };

    const cmtRef = ref(this.db, `portofolio/${portfolioId}/comments/${commentId}`);
    try {
      await set(cmtRef, newComment);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/portofolio/${portfolioId}/comments/${commentId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newComment),
        }
      );
    }
    return newComment;
  }

  /**
   * Hapus portofolio dari database Firebase /portofolio/<portfolioId>
   */
  public async deletePortfolio(portfolioId: string): Promise<void> {
    if (!portfolioId) return;
    const cleanId = portfolioId.trim();
    const encodedId = encodeURIComponent(cleanId);

    // 1. Hapus langsung via REST API ke Firebase Realtime Database
    try {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/portofolio/${encodedId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      console.warn('[Firebase RTDB REST] deletePortfolio error:', err);
    }

    // 2. Hapus via Firebase SDK Realtime DB
    try {
      const pfRef = ref(this.db, `portofolio/${cleanId}`);
      await remove(pfRef);
    } catch (err) {
      console.warn('[Firebase RTDB SDK] deletePortfolio error:', err);
    }
  }

  /**
   * Like portofolio (alias)
   */
  public async likePortfolio(portfolioId: string, userId: string): Promise<number> {
    return this.toggleLikePortfolio(portfolioId, userId);
  }

  /**
   * Tambah komentar portofolio (alias)
   */
  public async addPortfolioComment(
    portfolioId: string,
    comment: { authorName: string; text: string; id?: string; authorId?: string; authorRole?: 'guru' | 'murid' | 'admin' }
  ): Promise<PortfolioComment> {
    return this.addCommentToPortfolio(portfolioId, {
      authorId: comment.authorId || 'usr-anonymous',
      authorName: comment.authorName,
      authorRole: comment.authorRole || 'murid',
      text: comment.text,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Kirim Apresiasi (👏 Hebat, 💡 Keren, 🔥 Inspiratif) ke /portofolio/<portfolioId>/appreciations
   */
  public async addAppreciationToPortfolio(
    portfolioId: string,
    userId: string,
    type: 'hebat' | 'keren' | 'inspiratif'
  ): Promise<void> {
    try {
      const snap = await get(ref(this.db, `portofolio/${portfolioId}/appreciations/${type}`));
      const cur = (snap.val() as number) || 0;
      await update(ref(this.db, `portofolio/${portfolioId}/appreciations`), {
        [type]: cur + 1,
        [`users/${userId}`]: type,
      });
    } catch {
      // REST fallback
      const patchData = { [type]: 1 };
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/portofolio/${portfolioId}/appreciations.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        }
      );
    }
  }

  // =========================================================================
  // 4. NODE /alme_sisipan : MISI ADAPTIF OTOMATIS ENGINE ALME
  // =========================================================================

  /**
   * Berlangganan data Misi Sisipan ALME di node /alme_sisipan
   */
  public subscribeAlmeSisipan(
    callback: (almeMissions: AlmeIndividualMission[]) => void,
    studentId?: string
  ): () => void {
    const almeRef = ref(this.db, 'alme_sisipan');
    const unsub = onValue(
      almeRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        let list: AlmeIndividualMission[] = Object.keys(val).map((key) => ({
          ...val[key],
          id: val[key].id || key,
        }));
        if (studentId) {
          list = list.filter((m) => m.studentId === studentId || m.studentId === 'all');
        }
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /alme_sisipan warning:', error.message);
        this.fetchAlmeSisipanREST(studentId).then(callback);
      }
    );

    return () => unsub();
  }

  public async fetchAlmeSisipanREST(studentId?: string): Promise<AlmeIndividualMission[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/alme_sisipan.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      let list: AlmeIndividualMission[] = Object.keys(data).map((k) => ({
        ...data[k],
        id: data[k].id || k,
      }));
      if (studentId) {
        list = list.filter((m) => m.studentId === studentId || m.studentId === 'all');
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Menyimpan / memicu Misi Sisipan ALME otomatis ke node /alme_sisipan/<almeId>
   */
  public async triggerAlmeMission(almeMission: AlmeIndividualMission): Promise<void> {
    const almeId = almeMission.id;
    const almeRef = ref(this.db, `alme_sisipan/${almeId}`);
    try {
      await set(almeRef, almeMission);
    } catch (err) {
      console.warn('[Firebase] set /alme_sisipan error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/alme_sisipan/${almeId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(almeMission),
        }
      );
    }
  }

  /**
   * Selesaikan Misi Sisipan ALME
   */
  public async completeAlmeMission(almeId: string): Promise<void> {
    const almeRef = ref(this.db, `alme_sisipan/${almeId}`);
    try {
      await update(almeRef, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/alme_sisipan/${almeId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          }),
        }
      );
    }
  }

  // =========================================================================
  // 5. NODE /tujuan_pembelajaran : TUJUAN PEMBELAJARAN (TP)
  // =========================================================================

  public subscribeTujuanPembelajaran(
    callback: (tpList: TujuanPembelajaran[]) => void
  ): () => void {
    const tpRef = ref(this.db, 'tujuan_pembelajaran');
    const unsub = onValue(
      tpRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: TujuanPembelajaran[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /tujuan_pembelajaran warning:', error.message);
        this.fetchTujuanPembelajaranREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchTujuanPembelajaranREST(): Promise<TujuanPembelajaran[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/tujuan_pembelajaran.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveTujuanPembelajaran(tp: TujuanPembelajaran): Promise<void> {
    const tpRef = ref(this.db, `tujuan_pembelajaran/${tp.id}`);
    try {
      await set(tpRef, tp);
    } catch (err) {
      console.warn('[Firebase] set /tujuan_pembelajaran error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/tujuan_pembelajaran/${tp.id}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tp),
        }
      );
    }
  }

  public async deleteTujuanPembelajaran(tpId: string): Promise<void> {
    const tpRef = ref(this.db, `tujuan_pembelajaran/${tpId}`);
    try {
      await remove(tpRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/tujuan_pembelajaran/${tpId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // =========================================================================
  // 6. NODE /asesmen_awal : ASESMEN AWAL DIAGNOSTIK
  // =========================================================================

  public subscribeAsesmenAwal(
    callback: (list: AsesmenAwalInput[]) => void
  ): () => void {
    const aswRef = ref(this.db, 'asesmen_awal');
    const unsub = onValue(
      aswRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: AsesmenAwalInput[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /asesmen_awal warning:', error.message);
        this.fetchAsesmenAwalREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchAsesmenAwalREST(): Promise<AsesmenAwalInput[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/asesmen_awal.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveAsesmenAwal(record: AsesmenAwalInput): Promise<void> {
    const aswRef = ref(this.db, `asesmen_awal/${record.id}`);
    try {
      await set(aswRef, record);
    } catch (err) {
      console.warn('[Firebase] set /asesmen_awal error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/asesmen_awal/${record.id}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }
      );
    }
  }

  public async deleteAsesmenAwal(id: string): Promise<void> {
    const aswRef = ref(this.db, `asesmen_awal/${id}`);
    try {
      await remove(aswRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/asesmen_awal/${id}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // =========================================================================
  // 7. NODE /asesmen_akhir : ASESMEN AKHIR SUMATIF
  // =========================================================================

  public subscribeAsesmenAkhir(
    callback: (list: AsesmenAkhirRecord[]) => void
  ): () => void {
    const askRef = ref(this.db, 'asesmen_akhir');
    const unsub = onValue(
      askRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: AsesmenAkhirRecord[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /asesmen_akhir warning:', error.message);
        this.fetchAsesmenAkhirREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchAsesmenAkhirREST(): Promise<AsesmenAkhirRecord[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/asesmen_akhir.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveAsesmenAkhir(record: AsesmenAkhirRecord): Promise<void> {
    const askRef = ref(this.db, `asesmen_akhir/${record.id}`);
    try {
      await set(askRef, record);
    } catch (err) {
      console.warn('[Firebase] set /asesmen_akhir error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/asesmen_akhir/${record.id}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        }
      );
    }
  }

  public async deleteAsesmenAkhir(id: string): Promise<void> {
    const askRef = ref(this.db, `asesmen_akhir/${id}`);
    try {
      await remove(askRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/asesmen_akhir/${id}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // =========================================================================
  // 8. SENSOR KIT TI SENANG (5 PORT REAL-TIME DARI FIREBASE)
  // =========================================================================

  /**
   * Berlangganan (real-time listener) pembacaan sensor ESP dari Firebase RTDB
   * Mendukung multi-nodepath:
   * 1. /data_esp/<kelas>/<kelompok> (Contoh: /data_esp/xii_1/kelompok_1)
   * 2. /data_esp/<classRaw>/<kelompokRaw> (Contoh: /data_esp/XII-1/Kelompok 1)
   * 3. /data_esp/<kelompok> (Contoh: /data_esp/kelompok_1 atau /data_esp/Kelompok 1)
   * 4. /data_esp (Direct root kit node)
   * 5. /data/<kelas>/<kelompok>/sensor atau /data/<kelas>/<kelompok>/data_esp
   */
  public subscribeSensorData(
    classKey: string = 'xii_1',
    kelompokKey: string = 'kelompok_1',
    callback: (data: {
      isKitActive?: boolean;
      port1Suhu?: number;
      port2Cahaya?: number;
      port3Kelembaban?: number;
      port4Arus?: number;
      port5Gerak?: number | string;
      connectedPorts: {
        port1: boolean;
        port2: boolean;
        port3: boolean;
        port4: boolean;
        port5: boolean;
      };
      timestamp: number;
      raw?: any;
      activePath?: string;
    }) => void
  ): () => void {
    const sanitizedClass = classKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sanitizedGroup = kelompokKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cleanClass = classKey.replace(/[^a-zA-Z0-9]/g, '');
    const numMatch = kelompokKey.match(/\d+/);
    const groupNum = numMatch ? numMatch[0] : '1';

    // Daftar node path potensial yang didukung secara simultan sesuai main.cpp
    // main.cpp: String path = "/data_esp/" + selectedKelas + "/" + selectedKelompok;
    const candidatePaths: string[] = Array.from(new Set([
      `data_esp/${sanitizedClass}/${sanitizedGroup}`,
      `data_esp/${classKey}/${kelompokKey}`,
      `data_esp/${classKey}/${groupNum}`,
      `data_esp/${sanitizedClass}/${groupNum}`,
      `data_esp/${cleanClass}/${groupNum}`,
      `data_esp/${cleanClass}/${sanitizedGroup}`,
      `data_esp/${cleanClass}/${kelompokKey}`,
      `data_esp/${sanitizedGroup}`,
      `data_esp/${kelompokKey}`,
      `data_esp/${groupNum}`,
      `data_esp/${classKey}`,
      `data_esp/${sanitizedClass}`,
      `data_esp/${cleanClass}`,
      `data_esp`,
      `data/${sanitizedClass}/${sanitizedGroup}/sensor`,
    ]));

    const parsePayload = (val: any, activePathSource: string = `data_esp/${sanitizedClass}/${sanitizedGroup}`) => {
      if (!val || typeof val !== 'object') {
        callback({
          isKitActive: false,
          port1Suhu: undefined,
          port2Cahaya: undefined,
          port3Kelembaban: undefined,
          port4Arus: undefined,
          port5Gerak: undefined,
          connectedPorts: { port1: false, port2: false, port3: false, port4: false, port5: false },
          timestamp: Date.now(),
          raw: val,
          activePath: activePathSource,
        });
        return;
      }

      // 1. Ekstraksi nested object jika payload berada di root atau sub-node
      let target: any = val;
      if (Array.isArray(target)) {
        const groupIndex = parseInt(groupNum, 10) || 1;
        target = target[groupIndex] || target.find((item: any) => item && typeof item === 'object') || target[0];
      } else if (target && typeof target === 'object') {
        if (target[sanitizedClass]?.[sanitizedGroup] && typeof target[sanitizedClass][sanitizedGroup] === 'object') {
          target = target[sanitizedClass][sanitizedGroup];
        } else if (target[classKey]?.[kelompokKey] && typeof target[classKey][kelompokKey] === 'object') {
          target = target[classKey][kelompokKey];
        } else if (target[cleanClass]?.[groupNum] && typeof target[cleanClass][groupNum] === 'object') {
          target = target[cleanClass][groupNum];
        } else if (target[cleanClass] && Array.isArray(target[cleanClass])) {
          const groupIndex = parseInt(groupNum, 10) || 1;
          target = target[cleanClass][groupIndex] || target[cleanClass].find((i: any) => i && typeof i === 'object') || target;
        } else if (target[classKey] && Array.isArray(target[classKey])) {
          const groupIndex = parseInt(groupNum, 10) || 1;
          target = target[classKey][groupIndex] || target[classKey].find((i: any) => i && typeof i === 'object') || target;
        } else if (target[sanitizedClass] && Array.isArray(target[sanitizedClass])) {
          const groupIndex = parseInt(groupNum, 10) || 1;
          target = target[sanitizedClass][groupIndex] || target[sanitizedClass].find((i: any) => i && typeof i === 'object') || target;
        } else if (target[sanitizedGroup] && typeof target[sanitizedGroup] === 'object') {
          target = target[sanitizedGroup];
        } else if (target[kelompokKey] && typeof target[kelompokKey] === 'object') {
          target = target[kelompokKey];
        } else if (target[groupNum] && typeof target[groupNum] === 'object') {
          target = target[groupNum];
        }
      }

      if (target && typeof target === 'object') {
        if (target.data && typeof target.data === 'object') target = target.data;
        else if (target.sensor && typeof target.sensor === 'object') target = target.sensor;
        else if (target.ports && typeof target.ports === 'object') target = target.ports;
        else if (target.readings && typeof target.readings === 'object') target = target.readings;
      }

      if (!target || typeof target !== 'object') {
        callback({
          isKitActive: false,
          port1Suhu: undefined,
          port2Cahaya: undefined,
          port3Kelembaban: undefined,
          port4Arus: undefined,
          port5Gerak: undefined,
          connectedPorts: { port1: false, port2: false, port3: false, port4: false, port5: false },
          timestamp: Date.now(),
          raw: val,
          activePath: activePathSource,
        });
        return;
      }

      // 2. Cek apakah kit berstatus mati / offline / saklar mati secara eksplisit
      const isMatiExplicit =
        target.status === 'mati' ||
        target.status === 'off' ||
        target.status === 'offline' ||
        target.status === 'nonaktif' ||
        target.kit_status === 'mati' ||
        target.kit_status === 'off' ||
        target.kit_status === 'offline' ||
        target.metadata?.status === 'mati' ||
        target.metadata?.status === 'off' ||
        target.metadata?.status === 'offline' ||
        target.power === false ||
        target.power === 0 ||
        target.power === 'off' ||
        target.power === 'mati' ||
        target.online === false ||
        target.connected === false ||
        target.kit === false ||
        target.kit === 'mati' ||
        target.kit === 'off' ||
        target.device === 'off' ||
        target.device === 'mati' ||
        target.active === false ||
        target.isOnlineMode === false ||
        target.isAutoSendActive === false ||
        target.saklar === 0 ||
        target.saklar === false;

      // 3. Cek timestamp data kadaluarsa dan deteksi apakah kit aktif
      let lastUpdateEpoch = 0;
      const rawTs = target.timestamp ?? target.time ?? val.timestamp ?? val.time;
      if (rawTs !== undefined && rawTs !== null) {
        const tNum = Number(rawTs);
        if (!isNaN(tNum)) {
          if (tNum > 1000000000000) {
            lastUpdateEpoch = tNum;
          } else if (tNum > 1000000000 && tNum < 3000000000) {
            lastUpdateEpoch = tNum * 1000;
          }
        }
      }
      if (lastUpdateEpoch === 0) {
        const lastUpdateStr = target.updatedAt || target.metadata?.updatedAt || val.updatedAt || target.last_seen;
        if (lastUpdateStr) {
          const parsed = new Date(lastUpdateStr).getTime();
          if (!isNaN(parsed) && parsed > 1000000000000) {
            lastUpdateEpoch = parsed;
          }
        }
      }

      const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 jam
      const isOverThreeHoursOld = lastUpdateEpoch > 0 && Date.now() - lastUpdateEpoch >= THREE_HOURS_MS;

      // Jika data dikirim oleh ESP32 tanpa timestamp field (seperti main.cpp),
      // maka setiap payload yang diterima via onValue dianggap live heartbeat aktif
      const isLiveBroadcast =
        lastUpdateEpoch === 0 &&
        (target.suhu !== undefined ||
          target.cahaya !== undefined ||
          target.kelembapan !== undefined ||
          target.kelembaban !== undefined ||
          target.tempDS !== undefined);
      const isFreshHeartbeat = isLiveBroadcast || (lastUpdateEpoch > 0 && Date.now() - lastUpdateEpoch <= 12000);
      const isKitAlive = isFreshHeartbeat && !isMatiExplicit && !isOverThreeHoursOld;

      // Helper ekstraksi angka dari berbagai variasi nama key sensor ESP
      const getNumeric = (keys: string[]): number | undefined => {
        for (const k of keys) {
          if (target[k] !== undefined && target[k] !== null && target[k] !== '') {
            const n = typeof target[k] === 'number' ? target[k] : parseFloat(String(target[k]));
            if (!isNaN(n)) return n;
          }
        }
        return undefined;
      };

      // Port 1: Suhu (DS18B20 / tempDS / probe suhu air)
      // Pada ESP32 main.cpp: suhu bernilai 0.0 jika sensor tidak terpasang
      const rawSuhu = getNumeric([
        'suhu_air', 'suhuAir', 'suhu', 'tempDS', 'temp_ds', 'tempDs', 'temp', 'temperature', 'temp_c',
        't1', 'port1', 'port1Suhu', 'valSuhu', 'ds18b20', 'Suhu', 'SUHU', 'Temperature', 'Temp'
      ]);
      const port1ExplicitOff = target.port1_connected === false || target.p1 === false || target.status_port1 === 'off' || target.status_port1 === 'mati';
      const port1Connected =
        isKitAlive &&
        !port1ExplicitOff &&
        rawSuhu !== undefined &&
        rawSuhu !== 0 &&
        rawSuhu !== -127 &&
        rawSuhu !== 85 && // 85 adalah nilai reset scratchpad DS18B20 saat boot/terputus
        rawSuhu > -55 &&
        rawSuhu < 150;
      const suhuVal = port1Connected ? Number(rawSuhu.toFixed(2)) : undefined;

      // Port 2: Cahaya (BH1750 / luxBH / Sensor Lux)
      // Pada ESP32 main.cpp: cahaya bernilai 0 jika sensor tidak terpasang
      const rawCahaya = getNumeric([
        'cahaya', 'luxBH', 'lux_bh', 'luxBh', 'light', 'lux', 'ldr', 'ldr_val', 'ldrVal',
        'intensitas', 'intensitas_cahaya', 'port2', 'port2Cahaya', 'valCahaya', 'bh1750', 'Cahaya', 'Light', 'Lux'
      ]);
      const port2ExplicitOff = target.port2_connected === false || target.p2 === false || target.status_port2 === 'off' || target.status_port2 === 'mati';
      const port2Connected =
        isKitAlive &&
        !port2ExplicitOff &&
        rawCahaya !== undefined &&
        rawCahaya > 0 &&
        rawCahaya !== -1 &&
        rawCahaya !== 54612; // 54612 adalah error code I2C NACK BH1750
      const cahayaVal = port2Connected ? Number(rawCahaya.toFixed(1)) : undefined;

      // Port 3: Kelembaban Udara (DHT11 / DHT22 / humDHT)
      // Pada ESP32 main.cpp: kelembapan bernilai 0 jika sensor tidak terpasang
      const rawKelembaban = getNumeric([
        'kelembaban', 'kelembapan', 'humDHT', 'hum_dht', 'humDht', 'humidity', 'hum', 'rh',
        'port3', 'port3Kelembaban', 'valKelembaban', 'dht', 'dht11', 'dht22', 'Kelembaban', 'Kelembapan', 'Humidity'
      ]);
      const port3ExplicitOff = target.port3_connected === false || target.p3 === false || target.status_port3 === 'off' || target.status_port3 === 'mati';
      const port3Connected =
        isKitAlive &&
        !port3ExplicitOff &&
        rawKelembaban !== undefined &&
        rawKelembaban > 0 &&
        rawKelembaban <= 100 &&
        rawKelembaban !== -1;
      const kelembabanVal = port3Connected ? Number(rawKelembaban.toFixed(1)) : undefined;

      // Port 4: Arus Listrik (INA219 / Current sensor dalam mA) - MANDIRI
      const rawArus = getNumeric([
        'arus', 'current', 'ampere', 'amp', 'mA', 'current_mA', 'i',
        'port4', 'port4Arus', 'valArus', 'ina219', 'Arus', 'Current'
      ]);
      const port4ExplicitOff = target.port4_connected === false || target.p4 === false || target.status_port4 === 'off' || target.status_port4 === 'mati';
      const port4Connected =
        isKitAlive &&
        !port4ExplicitOff &&
        rawArus !== undefined &&
        rawArus > 0 &&
        rawArus !== -1;
      const arusVal = port4Connected ? Number(rawArus.toFixed(2)) : undefined;

      // Port 5: Sensor Gerak (PIR / Sensor Jarak HC-SR04) - MANDIRI
      let rawGerak: any = undefined;
      const gerakKeys = [
        'gerak', 'motion', 'pir', 'jarak', 'distance', 'obstacle',
        'status_gerak', 'port5', 'port5Gerak', 'valGerak', 'Gerak', 'Motion', 'PIR'
      ];
      for (const k of gerakKeys) {
        if (target[k] !== undefined && target[k] !== null && target[k] !== '') {
          rawGerak = target[k];
          break;
        }
      }
      const port5ExplicitOff = target.port5_connected === false || target.p5 === false || target.status_port5 === 'off' || target.status_port5 === 'mati';
      const port5Connected =
        isKitAlive &&
        !port5ExplicitOff &&
        rawGerak !== undefined &&
        rawGerak !== null &&
        rawGerak !== '' &&
        rawGerak !== false &&
        rawGerak !== 0 &&
        rawGerak !== '0';

      let gerakVal: number | string | undefined = undefined;
      if (port5Connected) {
        if (typeof rawGerak === 'boolean') {
          gerakVal = rawGerak ? 'Terdeteksi' : 'Stabil';
        } else if (typeof rawGerak === 'number') {
          if (rawGerak === 1) gerakVal = 'Terdeteksi';
          else if (rawGerak === 0) gerakVal = 'Stabil';
          else gerakVal = `${rawGerak} cm`;
        } else {
          const str = String(rawGerak).toLowerCase().trim();
          if (str === '1' || str === 'true' || str === 'aktif' || str === 'terdeteksi' || str === 'motion') {
            gerakVal = 'Terdeteksi';
          } else if (str === '0' || str === 'false' || str === 'stabil' || str === 'normal' || str === 'tidak') {
            gerakVal = 'Stabil';
          } else {
            gerakVal = String(rawGerak);
          }
        }
      }

      // Jika kit mati:
      if (!isKitAlive) {
        callback({
          isKitActive: false,
          port1Suhu: undefined,
          port2Cahaya: undefined,
          port3Kelembaban: undefined,
          port4Arus: undefined,
          port5Gerak: undefined,
          connectedPorts: { port1: false, port2: false, port3: false, port4: false, port5: false },
          timestamp: Date.now(),
          raw: val,
          activePath: activePathSource,
        });
        return;
      }

      const hasAnyConnectedPort = port1Connected || port2Connected || port3Connected || port4Connected || port5Connected;
      const isKitBroadcasting = isKitAlive && (hasAnyConnectedPort || target.suhu !== undefined || target.cahaya !== undefined || target.kelembapan !== undefined);

      callback({
        isKitActive: isKitBroadcasting,
        port1Suhu: port1Connected ? suhuVal : undefined,
        port2Cahaya: port2Connected ? cahayaVal : undefined,
        port3Kelembaban: port3Connected ? kelembabanVal : undefined,
        port4Arus: port4Connected ? arusVal : undefined,
        port5Gerak: port5Connected ? gerakVal : undefined,
        connectedPorts: {
          port1: !!port1Connected,
          port2: !!port2Connected,
          port3: !!port3Connected,
          port4: !!port4Connected,
          port5: !!port5Connected,
        },
        timestamp: Date.now(),
        raw: val,
        activePath: activePathSource,
      });
    };

    const unsubs: Array<() => void> = [];

    // Pasang real-time listener pada candidate paths
    // Firebase HANYA mentransfer data ketika ada event live nyata dari alat fisik
    candidatePaths.forEach((pathStr) => {
      try {
        const pathRef = ref(this.db, pathStr);
        const unsub = onValue(
          pathRef,
          (snapshot: DataSnapshot) => {
            const val = snapshot.val();
            if (val) {
              parsePayload(val, pathStr);
            } else {
              parsePayload(null, pathStr);
            }
          },
          (err) => {
            console.warn(`[Firebase RTDB] Listener error pada ${pathStr}:`, err);
          }
        );
        unsubs.push(unsub);
      } catch (err) {
        console.warn(`[Firebase RTDB] Invalid path ref untuk ${pathStr}:`, err);
      }
    });

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore
        }
      });
    };
  }

  public async fetchSensorDataREST(
    classKey: string = 'xii_1',
    kelompokKey: string = 'kelompok_1'
  ): Promise<{ data: any; path: string } | null> {
    const sanitizedClass = classKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sanitizedGroup = kelompokKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const tryPaths = [
      `data_esp/${sanitizedClass}/${sanitizedGroup}`,
      `data_esp/${encodeURIComponent(classKey)}/${encodeURIComponent(kelompokKey)}`,
      `data_esp/${sanitizedGroup}`,
      `data_esp/${encodeURIComponent(kelompokKey)}`,
      `data_esp`,
      `data/${sanitizedClass}/${sanitizedGroup}/sensor`,
    ];

    for (const p of tryPaths) {
      try {
        const res = await fetch(
          `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/${p}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
        );
        if (res.ok) {
          const val = await res.json();
          if (val && typeof val === 'object') {
            return { data: val, path: p };
          }
        }
      } catch {
        // coba path berikutnya
      }
    }

    return null;
  }

  // =========================================================================
  // 9. DATA KELOMPOK EKSPERIMEN (PATH: data / kelas / kelompok / data_eksperimen)
  // =========================================================================

  /**
   * Mengambil data eksperimen kelompok dari Firebase:
   * Path: /data/<kelas>/<kelompok>/data_eksperimen
   */
  public async fetchDataKelompok(
    kelas: string = 'XII-1',
    kelompok: string = 'Kelompok 1'
  ): Promise<any> {
    const sanitizedClass = kelas.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sanitizedGroup = kelompok.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    try {
      // 1. Coba ambil dari /data/<kelas>/<kelompok>/data_eksperimen
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/data/${sanitizedClass}/${sanitizedGroup}/data_eksperimen.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (res.ok) {
        const val = await res.json();
        if (val) {
          const updateEpoch = val.updatedAt
            ? new Date(val.updatedAt).getTime()
            : val.timestamp
            ? Number(val.timestamp)
            : 0;
          if (updateEpoch > 0 && Date.now() - updateEpoch >= THREE_HOURS_MS) {
            // Jika alat mati / data tidak tersambung dalam 3 jam, Firebase hapus data otomatis
            await this.deleteDataKelompok(kelas, kelompok);
            return null;
          }
          return val;
        }
      }

      // 2. Fallback cek di /data_kelompok/<kelas>/<kelompok>
      const resAlt = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/data_kelompok/${sanitizedClass}/${sanitizedGroup}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (resAlt.ok) {
        const valAlt = await resAlt.json();
        if (valAlt) {
          const updateEpoch = valAlt.updatedAt
            ? new Date(valAlt.updatedAt).getTime()
            : valAlt.timestamp
            ? Number(valAlt.timestamp)
            : 0;
          if (updateEpoch > 0 && Date.now() - updateEpoch >= THREE_HOURS_MS) {
            await this.deleteDataKelompok(kelas, kelompok);
            return null;
          }
          return valAlt;
        }
      }

      return null;
    } catch (err) {
      console.warn('[Firebase RTDB] Gagal fetch data kelompok:', err);
      return null;
    }
  }

  /**
   * Menghapus data eksperimen kelompok dari Firebase RTDB jika alat mati / kadaluarsa > 3 jam
   */
  public async deleteDataKelompok(
    kelas: string = 'XII-1',
    kelompok: string = 'Kelompok 1'
  ): Promise<void> {
    const sanitizedClass = kelas.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sanitizedGroup = kelompok.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const paths = [
      `data/${sanitizedClass}/${sanitizedGroup}/data_eksperimen`,
      `data_kelompok/${sanitizedClass}/${sanitizedGroup}`,
    ];

    for (const p of paths) {
      try {
        const pRef = ref(this.db, p);
        await remove(pRef);
      } catch {
        await fetch(
          `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/${p}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
          { method: 'DELETE' }
        );
      }
    }
  }

  /**
   * Menghapus data stale dari path tertentu di Firebase RTDB
   */
  public async deleteStaleExperimentData(pathStr: string): Promise<void> {
    const cleanPath = pathStr.startsWith('/') ? pathStr.slice(1) : pathStr;
    try {
      const pRef = ref(this.db, cleanPath);
      await remove(pRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/${cleanPath}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  /**
   * Menyimpan data eksperimen kelompok ke Firebase RTDB:
   * Path: /data/<kelas>/<kelompok>/data_eksperimen
   */
  public async saveDataKelompok(
    kelas: string = 'XII-1',
    kelompok: string = 'Kelompok 1',
    dataEksperimen: any
  ): Promise<void> {
    const sanitizedClass = kelas.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sanitizedGroup = kelompok.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const groupRef = ref(
      this.db,
      `data/${sanitizedClass}/${sanitizedGroup}/data_eksperimen`
    );

    const payload = {
      kelas,
      kelompok,
      updatedAt: new Date().toISOString(),
      rows: dataEksperimen.rows || dataEksperimen,
      metadata: dataEksperimen.metadata || {
        source: 'Kit TI SENANG Lab',
        recordedCount: (dataEksperimen.rows || dataEksperimen)?.length || 0,
      },
    };

    try {
      await set(groupRef, payload);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/data/${sanitizedClass}/${sanitizedGroup}/data_eksperimen.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    }
  }

  /**
   * Menyimpan struktur hierarki lengkap Kelas, Kelompok, dan List Siswa ke Firebase RTDB:
   * Path: /data_kelompok
   * Digunakan langsung oleh fungsi mikrokontroler handleGetKelas() pada endpoint /api/kelompok-data
   */
  public async saveDataKelompokHierarchy(hierarchy: Record<string, any>): Promise<void> {
    const dataKelompokRef = ref(this.db, 'data_kelompok');
    try {
      await set(dataKelompokRef, hierarchy);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/data_kelompok.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hierarchy),
        }
      );
    }

    // Dual-sync ke host sekunder agar mikrokontroler selalu dapat membaca node /data_kelompok
    try {
      const fallbackHost = TI_SENANG_FIREBASE_CONFIG.databaseURL.includes('ti-senang-baru')
        ? 'https://ti-senang-default-rtdb.asia-southeast1.firebasedatabase.app'
        : 'https://ti-senang-baru-default-rtdb.asia-southeast1.firebasedatabase.app';
      const fallbackKey = TI_SENANG_FIREBASE_CONFIG.databaseURL.includes('ti-senang-baru')
        ? 'AIzaSyCnuYiWNXQlwVlBKjAZkFCS1QyUYvHe8xo'
        : 'AIzaSyDYSV4U3nrqwuYuicGkUSFVZ99AFHK87nc';
      fetch(`${fallbackHost}/data_kelompok.json?key=${fallbackKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hierarchy),
      }).catch(() => {});
    } catch {}
  }

  /**
   * Mengambil hierarki lengkap Kelas dan Kelompok dari node /data_kelompok
   */
  public async fetchDataKelompokHierarchy(): Promise<Record<string, any> | null> {
    try {
      const dataKelompokRef = ref(this.db, 'data_kelompok');
      const snap = await get(dataKelompokRef);
      if (snap.exists()) {
        return snap.val();
      }
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/data_kelompok.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.warn('[Firebase RTDB] Gagal fetch data_kelompok hierarchy:', err);
      return null;
    }
  }

  /**
   * Berlangganan (real-time listener) perubahan node /data_kelompok
   */
  public subscribeDataKelompokHierarchy(
    callback: (data: Record<string, any> | null) => void
  ): () => void {
    const dataKelompokRef = ref(this.db, 'data_kelompok');
    const unsub = onValue(
      dataKelompokRef,
      (snapshot) => {
        const val = snapshot.val();
        callback(val || null);
      },
      (error) => {
        console.warn('[Firebase RTDB] Listener error pada /data_kelompok:', error);
      }
    );
    return unsub;
  }

  // =========================================================================
  // 10. SIMPAN DATABASE MISI SISWA (EKSPERIMEN & SIMULASI)
  // =========================================================================

  /**
   * Menyimpan hasil tabel eksperimen siswa ke database misi siswa di Firebase:
   * Path: /misi_siswa_eksperimen/<studentId>/<missionId>
   */
  public async saveStudentExperimentData(
    studentId: string,
    missionId: string,
    experimentPayload: {
      studentName?: string;
      className?: string;
      kelompok?: string;
      rows: any[];
      notes?: string;
      parameters?: any;
    }
  ): Promise<void> {
    const payload = {
      ...experimentPayload,
      studentId,
      missionId,
      savedAt: new Date().toISOString(),
      status: 'COMPLETED',
    };

    const expRef = ref(this.db, `misi_siswa_eksperimen/${studentId}/${missionId}`);

    try {
      await set(expRef, payload);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/misi_siswa_eksperimen/${studentId}/${missionId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    }
  }

  // =========================================================================
  // 11. LINK SIMULASI GURU (SIMULASI VIRTUAL)
  // =========================================================================

  /**
   * Menyimpan link simulasi virtual yang dikirimkan guru
   * Path: /simulasi_guru/<subjectId>/<classId>
   */
  public async saveTeacherSimulationLink(
    subjectId: string,
    classId: string,
    data: {
      title: string;
      url: string;
      guide?: string;
      subjectName?: string;
      teacherName?: string;
    }
  ): Promise<void> {
    const payload = {
      ...data,
      subjectId,
      classId,
      updatedAt: new Date().toISOString(),
    };

    const simRef = ref(this.db, `simulasi_guru/${subjectId}/${classId}`);
    try {
      await set(simRef, payload);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/simulasi_guru/${subjectId}/${classId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    }
  }

  /**
   * Mengambil link simulasi virtual guru untuk mapel & kelas tertentu
   */
  public async fetchTeacherSimulationLink(
    subjectId: string,
    classId: string = 'cls-xii-1'
  ): Promise<{ title: string; url: string; guide?: string; teacherName?: string } | null> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/simulasi_guru/${subjectId}/${classId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) return data;
      }

      // Cek general link untuk mapel
      const resGen = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/simulasi_guru/${subjectId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (resGen.ok) {
        const dataGen = await resGen.json();
        if (dataGen) {
          // Cari entry pertama yang memiliki url
          const foundKey = Object.keys(dataGen).find((k) => dataGen[k]?.url);
          if (foundKey) return dataGen[foundKey];
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // 12. DATA ADMIN : PENGELOLAAN GURU, MURID, KELAS, AKUN & KREDENSIAL
  // =========================================================================

  /**
   * Helper untuk membersihkan key username agar aman disimpan di Firebase RTDB
   */
  private sanitizeRtdbKey(key: string): string {
    return encodeURIComponent(key.toLowerCase().trim()).replace(/\./g, '%2E');
  }

  private desanitizeRtdbKey(key: string): string {
    try {
      return decodeURIComponent(key);
    } catch {
      return key;
    }
  }

  // --- GURU (TEACHERS) ---
  public subscribeTeachers(callback: (teachers: Teacher[]) => void): () => void {
    const teachersRef = ref(this.db, 'guru');
    const unsub = onValue(
      teachersRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: Teacher[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /guru warning:', error.message);
        this.fetchTeachersREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchTeachersREST(): Promise<Teacher[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/guru.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveTeacher(teacher: Teacher): Promise<void> {
    const teacherId = teacher.id;
    const teacherRef = ref(this.db, `guru/${teacherId}`);
    try {
      await set(teacherRef, teacher);
    } catch (err) {
      console.warn('[Firebase] set /guru error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/guru/${teacherId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacher),
        }
      );
    }
  }

  public async saveTeachers(teachers: Teacher[]): Promise<void> {
    const map: Record<string, Teacher> = {};
    teachers.forEach((t) => {
      map[t.id] = t;
    });
    const teachersRef = ref(this.db, 'guru');
    try {
      await set(teachersRef, map);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/guru.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(map),
        }
      );
    }
  }

  public async deleteTeacher(teacherId: string): Promise<void> {
    const teacherRef = ref(this.db, `guru/${teacherId}`);
    try {
      await remove(teacherRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/guru/${teacherId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // --- MURID (STUDENTS) ---
  public subscribeStudents(callback: (students: Student[]) => void): () => void {
    const studentsRef = ref(this.db, 'murid');
    const unsub = onValue(
      studentsRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: Student[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /murid warning:', error.message);
        this.fetchStudentsREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchStudentsREST(): Promise<Student[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/murid.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveStudent(student: Student): Promise<void> {
    const studentId = student.id;
    const studentRef = ref(this.db, `murid/${studentId}`);
    try {
      await set(studentRef, student);
    } catch (err) {
      console.warn('[Firebase] set /murid error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/murid/${studentId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(student),
        }
      );
    }
  }

  public async saveStudents(students: Student[]): Promise<void> {
    const map: Record<string, Student> = {};
    students.forEach((s) => {
      map[s.id] = s;
    });
    const studentsRef = ref(this.db, 'murid');
    try {
      await set(studentsRef, map);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/murid.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(map),
        }
      );
    }
  }

  public async deleteStudent(studentId: string): Promise<void> {
    const studentRef = ref(this.db, `murid/${studentId}`);
    try {
      await remove(studentRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/murid/${studentId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // --- KELAS (CLASSES) ---
  public subscribeClasses(callback: (classes: ClassRoom[]) => void): () => void {
    const classesRef = ref(this.db, 'kelas');
    const unsub = onValue(
      classesRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: ClassRoom[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /kelas warning:', error.message);
        this.fetchClassesREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchClassesREST(): Promise<ClassRoom[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kelas.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveClass(cls: ClassRoom): Promise<void> {
    const classId = cls.id;
    const classRef = ref(this.db, `kelas/${classId}`);
    try {
      await set(classRef, cls);
    } catch (err) {
      console.warn('[Firebase] set /kelas error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kelas/${classId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cls),
        }
      );
    }
  }

  public async saveClasses(classes: ClassRoom[]): Promise<void> {
    const map: Record<string, ClassRoom> = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    const classesRef = ref(this.db, 'kelas');
    try {
      await set(classesRef, map);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kelas.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(map),
        }
      );
    }
  }

  public async deleteClass(classId: string): Promise<void> {
    const classRef = ref(this.db, `kelas/${classId}`);
    try {
      await remove(classRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kelas/${classId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // --- PENGGUNA (USERS) ---
  public subscribeUsers(callback: (users: User[]) => void): () => void {
    const usersRef = ref(this.db, 'pengguna');
    const unsub = onValue(
      usersRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list: User[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: val[k].id || k,
        }));
        callback(list);
      },
      (error) => {
        console.warn('[Firebase] onValue /pengguna warning:', error.message);
        this.fetchUsersREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchUsersREST(): Promise<User[]> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/pengguna.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.keys(data).map((k) => ({ ...data[k], id: data[k].id || k }));
    } catch {
      return [];
    }
  }

  public async saveUser(user: User): Promise<void> {
    const finalUser = { ...user };
    // PASTIKAN FOTO TIDAK MASUK KE FIREBASE:
    if (finalUser.avatarUrl && (finalUser.avatarUrl.startsWith('data:') || finalUser.avatarUrl.startsWith('blob:') || finalUser.avatarUrl.length > 500)) {
      finalUser.avatarUrl = '';
    }
    const userId = finalUser.id;
    const userRef = ref(this.db, `pengguna/${userId}`);
    try {
      await set(userRef, finalUser);
    } catch (err) {
      console.warn('[Firebase] set /pengguna error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/pengguna/${userId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalUser),
        }
      );
    }
  }

  public async saveUsers(users: User[]): Promise<void> {
    const map: Record<string, User> = {};
    users.forEach((u) => {
      const copy = { ...u };
      if (copy.avatarUrl && (copy.avatarUrl.startsWith('data:') || copy.avatarUrl.startsWith('blob:') || copy.avatarUrl.length > 500)) {
        copy.avatarUrl = '';
      }
      map[copy.id] = copy;
    });
    const usersRef = ref(this.db, 'pengguna');
    try {
      await set(usersRef, map);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/pengguna.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(map),
        }
      );
    }
  }

  public async deleteUser(userId: string): Promise<void> {
    const userRef = ref(this.db, `pengguna/${userId}`);
    try {
      await remove(userRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/pengguna/${userId}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }

  // --- KREDENSIAL (LOGIN CREDENTIALS) ---
  public subscribeCredentials(callback: (creds: Record<string, string>) => void): () => void {
    const credsRef = ref(this.db, 'kredensial');
    const unsub = onValue(
      credsRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback({});
          return;
        }
        const result: Record<string, string> = {};
        Object.keys(val).forEach((k) => {
          const item = val[k];
          if (typeof item === 'string') {
            result[this.desanitizeRtdbKey(k)] = item;
          } else if (item && typeof item === 'object' && item.password) {
            const rawUser = item.username || this.desanitizeRtdbKey(k);
            result[rawUser.toLowerCase()] = item.password;
          }
        });
        callback(result);
      },
      (error) => {
        console.warn('[Firebase] onValue /kredensial warning:', error.message);
        this.fetchCredentialsREST().then(callback);
      }
    );
    return () => unsub();
  }

  public async fetchCredentialsREST(): Promise<Record<string, string>> {
    try {
      const res = await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kredensial.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`
      );
      if (!res.ok) return {};
      const data = await res.json();
      if (!data) return {};
      const result: Record<string, string> = {};
      Object.keys(data).forEach((k) => {
        const item = data[k];
        if (typeof item === 'string') {
          result[this.desanitizeRtdbKey(k)] = item;
        } else if (item && typeof item === 'object' && item.password) {
          const rawUser = item.username || this.desanitizeRtdbKey(k);
          result[rawUser.toLowerCase()] = item.password;
        }
      });
      return result;
    } catch {
      return {};
    }
  }

  public async saveCredential(username: string, password: string): Promise<void> {
    const safeKey = this.sanitizeRtdbKey(username);
    const payload = { username: username.toLowerCase().trim(), password, updatedAt: new Date().toISOString() };
    const credRef = ref(this.db, `kredensial/${safeKey}`);
    try {
      await set(credRef, payload);
    } catch (err) {
      console.warn('[Firebase] set /kredensial error, fallback REST:', err);
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kredensial/${safeKey}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    }
  }

  public async saveCredentials(creds: Record<string, string>): Promise<void> {
    const map: Record<string, { username: string; password: string; updatedAt: string }> = {};
    const now = new Date().toISOString();
    Object.keys(creds).forEach((rawUser) => {
      const safeKey = this.sanitizeRtdbKey(rawUser);
      map[safeKey] = {
        username: rawUser.toLowerCase().trim(),
        password: creds[rawUser],
        updatedAt: now,
      };
    });
    const credsRef = ref(this.db, 'kredensial');
    try {
      await set(credsRef, map);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kredensial.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(map),
        }
      );
    }
  }

  public async deleteCredential(username: string): Promise<void> {
    const safeKey = this.sanitizeRtdbKey(username);
    const credRef = ref(this.db, `kredensial/${safeKey}`);
    try {
      await remove(credRef);
    } catch {
      await fetch(
        `${TI_SENANG_FIREBASE_CONFIG.databaseURL}/kredensial/${safeKey}.json?key=${TI_SENANG_FIREBASE_CONFIG.apiKey}`,
        { method: 'DELETE' }
      );
    }
  }
}

export const firebaseRealtime = new FirebaseRealtimeService();

