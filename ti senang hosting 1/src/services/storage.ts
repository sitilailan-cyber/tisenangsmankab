/**
 * TI SENANG - Database Abstraction Layer
 * Menjembatani penyimpanan data (Local Storage & siap untuk Firebase Firestore).
 */

import {
  User,
  UserGender,
  Teacher,
  Student,
  ClassRoom,
  Subject,
  TeacherClass,
  LearningMission,
  PortfolioItem,
  StudentProfileData,
  TeacherProfileData,
  Mission,
  StudentProgress,
  ExperimentSession,
  MissionCoreNumber,
  AlmeRecommendation,
  TujuanPembelajaran,
  AsesmenAwalInput,
  AsesmenAkhirRecord,
  AlmeIndividualMission,
  UserRole,
  StudentReflectionSubmission,
  TeacherReflectionConfig,
} from '../types';

import photoCalorimeter from '../assets/images/student_physics_calorimeter_1789115270932.jpg';
import photoRegression from '../assets/images/student_data_regression_1789115288218.jpg';
import photoChem from '../assets/images/student_chem_experiment_1789115301650.jpg';
import photoBio from '../assets/images/student_bio_project_1789115315113.jpg';
import { firebaseSync } from './firebaseSync';
import { firebaseRealtime, STUDENT_DRIVE_FOLDER_URL, StudentTaskSubmission } from './firebaseRealtime';
import { firestoreCache } from './firestoreCacheService';
import { compressBase64ForFirebase } from '../utils/fileCompressor';

const STORAGE_KEYS = {
  USERS: 'ti_senang_users',
  CREDENTIALS: 'ti_senang_credentials',
  TEACHERS: 'ti_senang_teachers',
  STUDENTS: 'ti_senang_students',
  CLASSES: 'ti_senang_classes',
  SUBJECTS: 'ti_senang_subjects_v2',
  TEACHER_CLASSES: 'ti_senang_teacher_classes',
  MISSIONS: 'ti_senang_missions_v2',
  PORTFOLIO: 'ti_senang_portfolio',
  CORE_MISSIONS: 'ti_senang_core_missions',
  STUDENT_PROGRESS: 'ti_senang_student_progress',
  EXPERIMENT_SESSIONS: 'ti_senang_experiment_sessions',
  ALME_RECOMMENDATIONS: 'ti_senang_alme_recommendations',
  TUJUAN_PEMBELAJARAN: 'ti_senang_tp',
  ASESMEN_AWAL: 'ti_senang_asesmen_awal',
  ASESMEN_AKHIR: 'ti_senang_asesmen_akhir',
  ALME_INDIVIDUAL_MISSIONS: 'ti_senang_alme_individual_missions',
  MISI1_NOTES: 'ti_senang_misi1_notes',
};

// Prototype default accounts
const DEFAULT_ADMIN_USER: User = {
  id: 'usr-admin-01',
  fullName: 'Administrator TI SENANG',
  username: 'inov',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00Z',
};

const DEFAULT_CLASSES: ClassRoom[] = [
  { id: 'cls-xii-1', className: 'XII-1', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'cls-xii-2', className: 'XII-2', createdAt: '2026-01-01T08:05:00Z' },
  { id: 'cls-xii-3', className: 'XII-3', createdAt: '2026-01-01T08:10:00Z' },
  { id: 'cls-xii-4', className: 'XII-4', createdAt: '2026-01-01T08:15:00Z' },
];

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sbj-matematika', name: 'Matematika', code: 'MAT-F', category: 'Matematika' },
  { id: 'sbj-fisika', name: 'Fisika', code: 'FIS-F', category: 'Fisika' },
  { id: 'sbj-kimia', name: 'Kimia', code: 'KIM-F', category: 'Kimia' },
  { id: 'sbj-biologi', name: 'Biologi', code: 'BIO-F', category: 'Biologi' },
  { id: 'sbj-mat-lanjut', name: 'Matematika TL', code: 'MAT-TL-F', category: 'Matematika Tingkat Lanjut' },
  { id: 'sbj-integrasi', name: 'Integrasi Mata Pelajaran', code: 'INT-MIPA', category: 'Integrasi' },
];

const INITIAL_USERS: User[] = [
  DEFAULT_ADMIN_USER,
];

const INITIAL_CREDENTIALS: Record<string, string> = {
  inov: 'ttchm289',
};

const INITIAL_TEACHERS: Teacher[] = [];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_TEACHER_CLASSES: TeacherClass[] = [];

export const CORE_MISSION_DEFINITIONS: Array<{
  coreMissionNumber: MissionCoreNumber;
  coreTitle: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultSubjectId: string;
  defaultSubjectName: string;
  defaultXp: number;
}> = [
  {
    coreMissionNumber: 1,
    coreTitle: '🎯 Misi 1 — Pahami Konsep',
    defaultTitle: 'Pahami Konsep Esensial & Analisis Awal Sains',
    defaultDescription:
      'Pahami konsep fundamental, pemodelan variabel sains, representasi kuantitatif, dan keterkaitan fenomena.',
    defaultSubjectId: 'sbj-fisika',
    defaultSubjectName: 'Fisika',
    defaultXp: 100,
  },
  {
    coreMissionNumber: 2,
    coreTitle: '🎯 Misi 2 — Selesaikan Masalah Nyata',
    defaultTitle: 'Studi Kasus & Pemecahan Masalah Nyata (STEM)',
    defaultDescription:
      'Rancang solusi saintifik berkelanjutan berbasis data untuk mengatasi permasalahan nyata di lingkungan sekitar.',
    defaultSubjectId: 'sbj-fisika',
    defaultSubjectName: 'Fisika',
    defaultXp: 120,
  },
  {
    coreMissionNumber: 3,
    coreTitle: '🔬 Misi 3 — Eksplorasi & Eksperimen',
    defaultTitle: 'Eksperimen Sensor & Virtual Lab Terapan',
    defaultDescription:
      'Uji fenomena saintifik melalui simulasi sensor interaktif, kalorimeter, dan pengumpulan data riil laboratorium.',
    defaultSubjectId: 'sbj-fisika',
    defaultSubjectName: 'Fisika',
    defaultXp: 150,
  },
  {
    coreMissionNumber: 4,
    coreTitle: '🎮 Misi 4 — Permainan Edukasi',
    defaultTitle: 'Labirin Strategi Edukasi & Game Sains Interaktif',
    defaultDescription:
      'Tantang kemampuan pemecahan masalah melalui simulasi permainan interaktif berbasis konsep sains terapan.',
    defaultSubjectId: 'sbj-fisika',
    defaultSubjectName: 'Fisika',
    defaultXp: 100,
  },
  {
    coreMissionNumber: 5,
    coreTitle: '🧠 Misi 5 — Refleksi',
    defaultTitle: 'Refleksi Pembelajaran & Penilaian Diri',
    defaultDescription:
      'Refleksikan proses belajar sains bermakna dan lakukan penilaian diri untuk menguatkan metakognisi.',
    defaultSubjectId: 'sbj-fisika',
    defaultSubjectName: 'Fisika',
    defaultXp: 110,
  },
  {
    coreMissionNumber: 6,
    coreTitle: '🏆 Misi 6 — Asesmen Akhir',
    defaultTitle: 'Asesmen Akhir Komprehensif Ketercapaian TP',
    defaultDescription:
      'Ukur ketercapaian seluruh tujuan pembelajaran melalui asesmen sumatif terintegrasi literasi, numerasi, dan penalaran.',
    defaultSubjectId: 'sbj-fisika',
    defaultSubjectName: 'Fisika',
    defaultXp: 150,
  },
];

export const generateCurriculumMissionsTemplate = (): Mission[] => {
  const missions: Mission[] = [];
  const classes = DEFAULT_CLASSES;

  classes.forEach((cls) => {
    CORE_MISSION_DEFINITIONS.forEach((def) => {
      const defaultTpId =
        def.coreMissionNumber <= 2 ? 'tp-01' : def.coreMissionNumber <= 4 ? 'tp-02' : 'tp-03';
      const defaultTpCode =
        def.coreMissionNumber <= 2 ? 'TP-FIS-01' : def.coreMissionNumber <= 4 ? 'TP-FIS-02' : 'TP-FIS-03';

      missions.push({
        id: `msn-${cls.id}-${def.coreMissionNumber}`,
        coreMissionNumber: def.coreMissionNumber,
        coreTitle: def.coreTitle,
        title: `${def.defaultTitle} (${cls.className})`,
        description: def.defaultDescription,
        status: 'PUBLISHED',
        subjectId: def.defaultSubjectId,
        subjectName: def.defaultSubjectName,
        classId: cls.id,
        className: cls.className,
        tpId: defaultTpId,
        tpCode: defaultTpCode,
        createdByTeacherId: 'tch-01',
        createdAt: new Date().toISOString(),
        xpReward: def.defaultXp,
        dueDate: '2026-10-30',
      });
    });
  });

  return missions;
};

// Data riil yang tersinkronisasi murni dari Firebase Realtime Database
const INITIAL_CORE_MISSIONS: Mission[] = [];
const INITIAL_STUDENT_PROGRESS: StudentProgress[] = [];
const INITIAL_PORTFOLIO: PortfolioItem[] = [];
const INITIAL_TUJUAN_PEMBELAJARAN: TujuanPembelajaran[] = [
  // 1. FISIKA
  {
    id: 'tp-01',
    code: 'TP-FIS-01',
    subjectId: 'sbj-fisika',
    title: 'Penyelidikan Fenomena Suhu dan Kalor Virtual Lab',
    description: 'Menyelidiki laju perubahan suhu zat cair menggunakan kalorimeter dan sensor radiasi panas.',
    targetScore: 75,
    allocatedJp: 4,
    timeAllocationMinutes: 180,
    targetMissionCount: 2,
    achievedPercentage: 85,
    status: 'Optimal',
  },
  {
    id: 'tp-02',
    code: 'TP-FIS-02',
    subjectId: 'sbj-fisika',
    title: 'Analisis Efisiensi Termodinamika & Energi Terbarukan',
    description: 'Mengevaluasi faktor penyerapan kalor pada kolektor surya dan sistem isolasi termal.',
    targetScore: 75,
    allocatedJp: 4,
    timeAllocationMinutes: 180,
    targetMissionCount: 2,
    achievedPercentage: 80,
    status: 'Optimal',
  },
  {
    id: 'tp-03',
    code: 'TP-FIS-03',
    subjectId: 'sbj-fisika',
    title: 'Pengukuran Gelombang & Frekuensi Resonansi Akustik',
    description: 'Menganalisis karakteristik gelombang bunyi dan hubungan panjang gelombang terhadap frekuensi.',
    targetScore: 75,
    allocatedJp: 4,
    timeAllocationMinutes: 180,
    targetMissionCount: 2,
    achievedPercentage: 78,
    status: 'Cukup',
  },
  {
    id: 'tp-fis-04',
    code: 'TP-FIS-04',
    subjectId: 'sbj-fisika',
    title: 'Penyelidikan Rangkaian Listrik & Analisis Hukum Ohm',
    description: 'Menganalisis hubungan antara tegangan (V), arus (I), dan hambatan (R) pada rangkaian listrik seri dan paralel.',
    targetScore: 80,
    allocatedJp: 4,
    timeAllocationMinutes: 180,
    targetMissionCount: 2,
    achievedPercentage: 82,
    status: 'Optimal',
  },
];

class StorageService {
  private deletedPortfolioIds = new Set<string>();

  private getTombstoneSet(key: string): Set<string> {
    try {
      const arr = this.getItem<string[]>(key, []);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  private addTombstone(key: string, id: string): void {
    if (!id) return;
    const set = this.getTombstoneSet(key);
    set.add(id.trim());
    this.setItem(key, Array.from(set));
  }

  private removeTombstone(key: string, id: string): void {
    if (!id) return;
    const set = this.getTombstoneSet(key);
    set.delete(id.trim());
    this.setItem(key, Array.from(set));
  }

  private isTombstoned(key: string, id: string): boolean {
    if (!id) return false;
    return this.getTombstoneSet(key).has(id.trim());
  }

  constructor() {
    this.initFirebaseRealtimeSync();
    this.purgeDummyTeacherAndStudentData();
    this.syncAdminDataWithDatabase();
  }

  public purgeDummyTeacherAndStudentData(): void {
    if (typeof window === 'undefined') return;

    // Strict persistence: Jangan pernah menghapus data yang dimasukkan guru/murid secara berulang.
    // Flag ini memastikan pembersihan hanya terjadi sekali untuk id mock legacy, bukan menghapus username.
    const hasPurged = this.getItem<boolean>('ti_senang_legacy_purged_flag_v4', false);
    if (hasPurged) {
      return;
    }

    try {
      const dummyUserIds = [
        'usr-guru-01',
        'usr-guru-02',
        'usr-guru-03',
        'usr-mrd-01',
        'usr-mrd-02',
        'usr-mrd-03',
        'usr-mrd-04',
      ];
      const dummyTeacherIds = ['tch-01', 'tch-02', 'tch-03'];
      const dummyStudentIds = ['std-01', 'std-02', 'std-03', 'std-04'];
      const dummyTpIds = ['tp-mat-01', 'tp-mat-02', 'tp-kim-01', 'tp-bio-01', 'tp-mat-tl-01'];

      let users = this.getItem<User[]>(STORAGE_KEYS.USERS, [DEFAULT_ADMIN_USER]);
      users = users.filter((u) => !dummyUserIds.includes(u.id));
      if (!users.some((u) => u.id === DEFAULT_ADMIN_USER.id)) {
        users.unshift(DEFAULT_ADMIN_USER);
      }
      this.setItem(STORAGE_KEYS.USERS, users);

      let teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
      teachers = teachers.filter((t) => !dummyTeacherIds.includes(t.id) && !dummyUserIds.includes(t.userId));
      this.setItem(STORAGE_KEYS.TEACHERS, teachers);

      let students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
      students = students.filter((s) => !dummyStudentIds.includes(s.id) && !dummyUserIds.includes(s.userId));
      this.setItem(STORAGE_KEYS.STUDENTS, students);

      let teacherClasses = this.getItem<TeacherClass[]>(STORAGE_KEYS.TEACHER_CLASSES, []);
      teacherClasses = teacherClasses.filter((tc) => !dummyTeacherIds.includes(tc.teacherId));
      this.setItem(STORAGE_KEYS.TEACHER_CLASSES, teacherClasses);

      let tps = this.getItem<TujuanPembelajaran[]>(STORAGE_KEYS.TUJUAN_PEMBELAJARAN, INITIAL_TUJUAN_PEMBELAJARAN);
      const filteredTps = tps.filter((tp) => !dummyTpIds.includes(tp.id));
      if (filteredTps.length !== tps.length) {
        this.setItem(STORAGE_KEYS.TUJUAN_PEMBELAJARAN, filteredTps);
      }

      this.setItem('ti_senang_legacy_purged_flag_v4', true);
    } catch (e) {
      console.warn('Could not auto-purge dummy teacher/student data', e);
    }
  }

  private initFirebaseRealtimeSync(): void {
    if (typeof window === 'undefined') return;

    // 1. Sinkronisasi Real-time node /misi (Firebase RTDB)
    firebaseRealtime.subscribeMissions((missions) => {
      if (missions && Array.isArray(missions)) {
        const filtered = missions.filter((m) => m && m.id && !this.isTombstoned('ti_senang_deleted_mission_ids', m.id));
        this.setItem(STORAGE_KEYS.CORE_MISSIONS, filtered);
        window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: filtered }));
      }
    });

    // 1b. Sinkronisasi Cache-First Firestore untuk Konten Statis (Misi & Modul)
    try {
      firestoreCache.seedDefaultModulesIfEmpty().catch(() => {});
      firestoreCache.subscribeMissions({
        onData: (missions) => {
          if (missions && missions.length > 0) {
            const filtered = missions.filter((m) => m && m.id && !this.isTombstoned('ti_senang_deleted_mission_ids', m.id));
            this.syncMissionsFromFirebase(filtered);
          }
        },
        skipUnchangedServerUpdates: true,
      });
    } catch (e) {
      console.warn('[Storage] Firestore Cache init skipped:', e);
    }

    // 2. Sinkronisasi Real-time node /portofolio
    firebaseRealtime.subscribePortfolios((portfolios) => {
      if (portfolios && Array.isArray(portfolios)) {
        const filteredRemote = portfolios.filter(
          (p) => p && p.id && !this.deletedPortfolioIds.has(p.id.trim()) && !this.isTombstoned('ti_senang_deleted_portfolio_ids', p.id)
        );
        const currentLocal = this.getItem<PortfolioItem[]>(STORAGE_KEYS.PORTFOLIO, []).filter(
          (l) => l && l.id && !this.deletedPortfolioIds.has(l.id.trim()) && !this.isTombstoned('ti_senang_deleted_portfolio_ids', l.id)
        );
        const merged = filteredRemote.map((remoteItem) => {
          const localMatch = currentLocal.find((l) => l.id === remoteItem.id);
          if (
            localMatch?.documentation &&
            (localMatch.documentation.startsWith('data:image') || localMatch.documentation.startsWith('blob:')) &&
            (!remoteItem.documentation || remoteItem.documentation.includes('/drive/folders/'))
          ) {
            return { ...remoteItem, documentation: localMatch.documentation };
          }
          return remoteItem;
        });
        this.setItem(STORAGE_KEYS.PORTFOLIO, merged);
        window.dispatchEvent(new CustomEvent('tisenang_portfolios_updated', { detail: merged }));
      }
    });

    // 3. Sinkronisasi Real-time node /alme_sisipan
    firebaseRealtime.subscribeAlmeSisipan((almeMissions) => {
      if (almeMissions) {
        this.setItem(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, almeMissions);
        window.dispatchEvent(new CustomEvent('tisenang_alme_updated', { detail: almeMissions }));
      }
    });

    // 4. Sinkronisasi Real-time node /tugas_siswa
    firebaseRealtime.subscribeStudentTasks((tasks) => {
      if (tasks && Array.isArray(tasks)) {
        const filtered = tasks.filter((t) => t && t.id && !this.isTombstoned('ti_senang_deleted_task_ids', t.id));
        this.setItem('ti_senang_tugas_siswa', filtered);
        window.dispatchEvent(new CustomEvent('tisenang_tasks_updated', { detail: filtered }));
      }
    });

    // 5. Sinkronisasi Real-time node /tujuan_pembelajaran
    firebaseRealtime.subscribeTujuanPembelajaran((tpList) => {
      if (tpList && Array.isArray(tpList)) {
        const filtered = tpList.filter((tp) => tp && tp.id && !this.isTombstoned('ti_senang_deleted_tp_ids', tp.id));
        this.setItem(STORAGE_KEYS.TUJUAN_PEMBELAJARAN, filtered);
        window.dispatchEvent(new CustomEvent('tisenang_tp_updated', { detail: filtered }));
      }
    });

    // 6. Sinkronisasi Real-time node /asesmen_awal
    firebaseRealtime.subscribeAsesmenAwal((list) => {
      if (list && Array.isArray(list)) {
        const filtered = list.filter((a) => a && a.id && !this.isTombstoned('ti_senang_deleted_asesmen_awal_ids', a.id));
        this.setItem(STORAGE_KEYS.ASESMEN_AWAL, filtered);
        window.dispatchEvent(new CustomEvent('tisenang_asesmen_awal_updated', { detail: filtered }));
      }
    });

    // 7. Sinkronisasi Real-time node /asesmen_akhir
    firebaseRealtime.subscribeAsesmenAkhir((list) => {
      if (list && Array.isArray(list)) {
        const filtered = list.filter((a) => a && a.id && !this.isTombstoned('ti_senang_deleted_asesmen_akhir_ids', a.id));
        this.setItem(STORAGE_KEYS.ASESMEN_AKHIR, filtered);
        window.dispatchEvent(new CustomEvent('tisenang_asesmen_akhir_updated', { detail: filtered }));
      }
    });

    // 8. Sinkronisasi Real-time node /guru (Data Guru oleh Admin)
    firebaseRealtime.subscribeTeachers((teachers) => {
      if (teachers && Array.isArray(teachers)) {
        this.setItem(STORAGE_KEYS.TEACHERS, teachers);
        window.dispatchEvent(new CustomEvent('tisenang_teachers_updated', { detail: teachers }));
      }
    });

    // 9. Sinkronisasi Real-time node /murid (Data Murid oleh Admin)
    firebaseRealtime.subscribeStudents((students) => {
      if (students && Array.isArray(students)) {
        const filtered = students.filter(
          (s) =>
            s &&
            s.id &&
            !this.isTombstoned('ti_senang_deleted_student_ids', s.id) &&
            !this.isTombstoned('ti_senang_deleted_student_ids', s.userId)
        );
        this.setItem(STORAGE_KEYS.STUDENTS, filtered);
        window.dispatchEvent(new CustomEvent('tisenang_students_updated', { detail: filtered }));
        window.dispatchEvent(new CustomEvent('tisenang_student_kelompok_updated', { detail: filtered }));
        this.syncClassesAndKelompokToFirebase().catch(() => {});
      }
    });

    // 10. Sinkronisasi Real-time node /kelas (Data Kelas oleh Admin)
    firebaseRealtime.subscribeClasses((classes) => {
      if (classes && Array.isArray(classes) && classes.length > 0) {
        this.setItem(STORAGE_KEYS.CLASSES, classes);
        window.dispatchEvent(new CustomEvent('tisenang_classes_updated', { detail: classes }));
        this.syncClassesAndKelompokToFirebase().catch(() => {});
      }
    });

    // 11. Sinkronisasi Real-time node /pengguna (Akun Pengguna oleh Admin)
    firebaseRealtime.subscribeUsers((users) => {
      if (users && Array.isArray(users) && users.length > 0) {
        const currentUsers = this.getUsers();
        const userMap = new Map<string, User>();
        currentUsers.forEach((u) => userMap.set(u.id, u));
        users.forEach((u) => userMap.set(u.id, u));
        if (!userMap.has(DEFAULT_ADMIN_USER.id)) {
          userMap.set(DEFAULT_ADMIN_USER.id, DEFAULT_ADMIN_USER);
        }
        const mergedUsers = Array.from(userMap.values());
        this.setItem(STORAGE_KEYS.USERS, mergedUsers);
        window.dispatchEvent(new CustomEvent('tisenang_users_updated', { detail: mergedUsers }));
      }
    });

    // 12. Sinkronisasi Real-time node /kredensial (Kata Sandi oleh Admin)
    firebaseRealtime.subscribeCredentials((creds) => {
      if (creds && typeof creds === 'object' && Object.keys(creds).length > 0) {
        const currentCreds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
        const merged = { ...currentCreds, ...creds };
        this.setItem(STORAGE_KEYS.CREDENTIALS, merged);
      }
    });

    // 13. Sinkronisasi Real-time node /data_kelompok (Hierarki Kelas, Kelompok, & Siswa untuk Mikrokontroler)
    firebaseRealtime.subscribeDataKelompokHierarchy((hierarchy) => {
      if (hierarchy && typeof hierarchy === 'object') {
        this.setItem('ti_senang_data_kelompok_hierarchy', hierarchy);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tisenang_data_kelompok_updated', { detail: hierarchy }));
        }
      }
    });
  }

  public async syncAdminDataWithDatabase(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const [dbTeachers, dbStudents, dbClasses, dbUsers, dbCreds] = await Promise.all([
        firebaseRealtime.fetchTeachersREST(),
        firebaseRealtime.fetchStudentsREST(),
        firebaseRealtime.fetchClassesREST(),
        firebaseRealtime.fetchUsersREST(),
        firebaseRealtime.fetchCredentialsREST(),
      ]);

      const localTeachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
      const localStudents = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
      const localClasses = this.getClasses();
      const localUsers = this.getUsers();
      const localCreds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);

      // Sinkronisasi Kelas
      if (dbClasses && dbClasses.length > 0) {
        this.setItem(STORAGE_KEYS.CLASSES, dbClasses);
        window.dispatchEvent(new CustomEvent('tisenang_classes_updated', { detail: dbClasses }));
      } else if (localClasses && localClasses.length > 0) {
        firebaseRealtime.saveClasses(localClasses).catch(() => {});
      }

      // Sinkronisasi Guru
      if (dbTeachers && dbTeachers.length > 0) {
        this.setItem(STORAGE_KEYS.TEACHERS, dbTeachers);
        window.dispatchEvent(new CustomEvent('tisenang_teachers_updated', { detail: dbTeachers }));
      } else if (localTeachers && localTeachers.length > 0) {
        firebaseRealtime.saveTeachers(localTeachers).catch(() => {});
      }

      // Sinkronisasi Murid
      if (dbStudents && dbStudents.length > 0) {
        const filteredStudents = dbStudents.filter(
          (s) =>
            s &&
            s.id &&
            !this.isTombstoned('ti_senang_deleted_student_ids', s.id) &&
            !this.isTombstoned('ti_senang_deleted_student_ids', s.userId)
        );
        this.setItem(STORAGE_KEYS.STUDENTS, filteredStudents);
        window.dispatchEvent(new CustomEvent('tisenang_students_updated', { detail: filteredStudents }));
      } else if (localStudents && localStudents.length > 0) {
        const filteredLocal = localStudents.filter(
          (s) =>
            s &&
            s.id &&
            !this.isTombstoned('ti_senang_deleted_student_ids', s.id) &&
            !this.isTombstoned('ti_senang_deleted_student_ids', s.userId)
        );
        if (filteredLocal.length > 0) {
          firebaseRealtime.saveStudents(filteredLocal).catch(() => {});
        }
      }

      // Sinkronisasi Pengguna
      if (dbUsers && dbUsers.length > 0) {
        const userMap = new Map<string, User>();
        localUsers.forEach((u) => userMap.set(u.id, u));
        dbUsers.forEach((u) => userMap.set(u.id, u));
        if (!userMap.has(DEFAULT_ADMIN_USER.id)) {
          userMap.set(DEFAULT_ADMIN_USER.id, DEFAULT_ADMIN_USER);
        }
        const mergedUsers = Array.from(userMap.values());
        this.setItem(STORAGE_KEYS.USERS, mergedUsers);
        window.dispatchEvent(new CustomEvent('tisenang_users_updated', { detail: mergedUsers }));
      } else if (localUsers && localUsers.length > 0) {
        firebaseRealtime.saveUsers(localUsers).catch(() => {});
      }

      // Sinkronisasi Kredensial
      if (dbCreds && Object.keys(dbCreds).length > 0) {
        const mergedCreds = { ...localCreds, ...dbCreds };
        this.setItem(STORAGE_KEYS.CREDENTIALS, mergedCreds);
      } else if (localCreds && Object.keys(localCreds).length > 0) {
        firebaseRealtime.saveCredentials(localCreds).catch(() => {});
      }

      // Hubungkan dan sinkronkan hierarki Kelas & Kelompok ke node /data_kelompok
      await this.syncClassesAndKelompokToFirebase();
    } catch (err) {
      console.warn('Gagal sinkronisasi awal data admin dengan database:', err);
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  }

  // --- Users & Auth ---
  public getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  public getCredentials(): Record<string, string> {
    return this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS) || {};
  }

  public getCredentialByUsername(username: string): string {
    const creds = this.getCredentials();
    return creds[username.toLowerCase()] || '';
  }

  public authenticate(
    username: string,
    password: string,
    role?: UserRole,
  ): { success: boolean; user?: User; error?: string } {
    const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
    const user = this.getUserByUsername(username);

    if (!user) {
      return { success: false, error: 'Nama pengguna tidak terdaftar.' };
    }

    if (role && user.role !== role) {
      return { success: false, error: `Akun ini bukan berstatus sebagai ${role}.` };
    }

    const savedPass = creds[username.toLowerCase()];
    if (!savedPass || savedPass !== password) {
      return { success: false, error: 'Kata sandi tidak sesuai.' };
    }

    return { success: true, user };
  }

  public updateUser(userId: string, data: Partial<User>): User | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...data };
    this.setItem(STORAGE_KEYS.USERS, users);

    // Simpan ke database
    firebaseRealtime.saveUser(users[idx]).catch(() => {});
    firebaseRealtime.saveUsers(users).catch(() => {});

    return users[idx];
  }

  // --- Teachers ---
  public getTeachers(): Array<Teacher & { user: User; teacher: Teacher }> {
    const teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS) || [];
    const users = this.getUsers() || [];

    return teachers.filter(Boolean).map((t) => {
      const u = users.find((user) => user && user.id === t.userId) || {
        id: t.userId,
        fullName: 'Guru TI SENANG',
        username: 'guru',
        role: 'guru' as UserRole,
        createdAt: '2026-01-01',
      };
      return { ...t, teacher: t, user: u };
    });
  }

  public addTeacher(fullName: string, username: string, password = 'guru123', gender: UserGender = 'L'): Teacher & { user: User } {
    const users = this.getUsers();
    const teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);

    const newUserId = `usr-guru-${Date.now()}`;
    const newTeacherId = `tch-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      fullName,
      username: username.toLowerCase(),
      role: 'guru',
      gender,
      createdAt: new Date().toISOString(),
    };

    const newTeacher: Teacher = {
      id: newTeacherId,
      userId: newUserId,
      gender,
    };

    users.push(newUser);
    teachers.push(newTeacher);
    creds[username.toLowerCase()] = password;

    this.setItem(STORAGE_KEYS.USERS, users);
    this.setItem(STORAGE_KEYS.TEACHERS, teachers);
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);

    // Simpan ke database Firebase Realtime
    firebaseRealtime.saveTeacher(newTeacher).catch(() => {});
    firebaseRealtime.saveUser(newUser).catch(() => {});
    firebaseRealtime.saveCredential(username, password).catch(() => {});
    firebaseRealtime.saveTeachers(teachers).catch(() => {});
    firebaseRealtime.saveUsers(users).catch(() => {});
    firebaseRealtime.saveCredentials(creds).catch(() => {});

    return { ...newTeacher, user: newUser };
  }

  public updateTeacher(teacherIdOrUserId: string, fullName: string, username: string, password?: string, gender?: UserGender): void {
    const teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    const t = teachers.find((item) => item.id === teacherIdOrUserId || item.userId === teacherIdOrUserId);
    if (!t) return;

    if (gender) {
      t.gender = gender;
      this.setItem(STORAGE_KEYS.TEACHERS, teachers);
      firebaseRealtime.saveTeacher(t).catch(() => {});
    }

    const updatedUser = this.updateUser(t.userId, { fullName, username, ...(gender ? { gender } : {}) });
    if (password) {
      const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
      creds[username.toLowerCase()] = password;
      this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
      firebaseRealtime.saveCredential(username, password).catch(() => {});
      firebaseRealtime.saveCredentials(creds).catch(() => {});
    }

    // Sinkronisasi ke database Firebase Realtime
    firebaseRealtime.saveTeachers(teachers).catch(() => {});
    if (updatedUser) {
      firebaseRealtime.saveUser(updatedUser).catch(() => {});
    }
    firebaseRealtime.saveUsers(this.getUsers()).catch(() => {});
  }

  public deleteTeacher(teacherIdOrUserId: string): void {
    let teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    let users = this.getUsers();

    const targetTeacher = teachers.find(
      (t) => t.id === teacherIdOrUserId || t.userId === teacherIdOrUserId,
    );
    const targetUserId = targetTeacher ? targetTeacher.userId : teacherIdOrUserId;
    const targetTeacherId = targetTeacher ? targetTeacher.id : teacherIdOrUserId;

    teachers = teachers.filter(
      (t) => t.id !== targetTeacherId && t.userId !== targetUserId && t.id !== teacherIdOrUserId && t.userId !== teacherIdOrUserId,
    );
    const deletedUser = users.find((u) => u.id === targetUserId || u.id === teacherIdOrUserId);
    users = users.filter((u) => u.id !== targetUserId && u.id !== teacherIdOrUserId);

    let teacherClasses = this.getItem<TeacherClass[]>(STORAGE_KEYS.TEACHER_CLASSES, INITIAL_TEACHER_CLASSES);
    teacherClasses = teacherClasses.filter(
      (tc) => tc.teacherId !== targetTeacherId && tc.teacherId !== teacherIdOrUserId,
    );

    if (deletedUser) {
      const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
      delete creds[deletedUser.username.toLowerCase()];
      this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
      firebaseRealtime.deleteCredential(deletedUser.username).catch(() => {});
      firebaseRealtime.saveCredentials(creds).catch(() => {});
    }

    this.setItem(STORAGE_KEYS.TEACHERS, teachers);
    this.setItem(STORAGE_KEYS.USERS, users);
    this.setItem(STORAGE_KEYS.TEACHER_CLASSES, teacherClasses);

    // Hapus dan sinkronisasi ke database Firebase Realtime
    firebaseRealtime.deleteTeacher(targetTeacherId).catch(() => {});
    firebaseRealtime.deleteUser(targetUserId).catch(() => {});
    firebaseRealtime.saveTeachers(teachers).catch(() => {});
    firebaseRealtime.saveUsers(users).catch(() => {});
  }

  // --- Students ---
  public getStudents(): Array<Student & { user: User; student: Student; className: string }> {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS) || [];
    const users = this.getUsers() || [];
    const classes = this.getClasses() || [];

    return students.filter(Boolean).map((s) => {
      const u = users.find((user) => user && user.id === s.userId) || {
        id: s.userId,
        fullName: s.name || 'Murid TI SENANG',
        username: 'murid',
        role: 'murid' as UserRole,
        createdAt: '2026-01-01',
      };
      const cls = classes.find((c) => c && c.id === s.classId);
      return {
        ...s,
        student: s,
        name: s.name || u.fullName || 'Murid',
        user: u,
        className: cls ? cls.className : 'XII-1',
      };
    });
  }

  public getStudentById(studentId: string): Student | undefined {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    return students.find((s) => s.id === studentId);
  }

  public getStudentByUserId(userId: string): Student | undefined {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    return students.find((s) => s.userId === userId);
  }

  public addStudent(
    fullName: string,
    username: string,
    classId: string,
    password = 'siswa123',
  ): Student & { user: User; className: string } {
    const users = this.getUsers();
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
    const classes = this.getClasses();

    const newUserId = `usr-mrd-${Date.now()}`;
    const newStudentId = `std-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      fullName,
      username: username.toLowerCase(),
      role: 'murid',
      createdAt: new Date().toISOString(),
    };

    const newStudent: Student = {
      id: newStudentId,
      userId: newUserId,
      classId,
      name: fullName,
    };

    users.push(newUser);
    students.push(newStudent);
    creds[username.toLowerCase()] = password;

    this.setItem(STORAGE_KEYS.USERS, users);
    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);

    this.removeTombstone('ti_senang_deleted_student_ids', newStudentId);
    this.removeTombstone('ti_senang_deleted_student_ids', newUserId);

    // Simpan ke database Firebase Realtime
    firebaseRealtime.saveStudent(newStudent).catch(() => {});
    firebaseRealtime.saveUser(newUser).catch(() => {});
    firebaseRealtime.saveCredential(username, password).catch(() => {});
    firebaseRealtime.saveStudents(students).catch(() => {});
    firebaseRealtime.saveUsers(users).catch(() => {});
    firebaseRealtime.saveCredentials(creds).catch(() => {});
    this.syncClassesAndKelompokToFirebase().catch(() => {});

    const cls = classes.find((c) => c.id === classId);
    return { ...newStudent, user: newUser, className: cls ? cls.className : 'XII-1' };
  }

  public addStudentsBatch(
    studentsData: Array<{
      fullName: string;
      username?: string;
      classId: string;
      password?: string;
    }>,
  ): number {
    if (!studentsData || studentsData.length === 0) return 0;

    const users = this.getUsers();
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);

    let addedCount = 0;
    const now = Date.now();

    studentsData.forEach((item, index) => {
      if (!item.fullName || !item.fullName.trim()) return;

      const trimmedName = item.fullName.trim();
      let rawUsername = (item.username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (!rawUsername) {
        rawUsername = trimmedName.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      }
      if (!rawUsername) {
        rawUsername = `siswa${now}${index}`;
      }

      let finalUsername = rawUsername;
      let counter = 1;
      while (
        users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase()) ||
        Object.prototype.hasOwnProperty.call(creds, finalUsername.toLowerCase())
      ) {
        finalUsername = `${rawUsername}${counter}`;
        counter++;
      }

      const password = item.password && item.password.trim() ? item.password.trim() : 'siswa123';
      const uniqueSuffix = `${now}-${index}-${Math.random().toString(36).substring(2, 6)}`;
      const newUserId = `usr-mrd-${uniqueSuffix}`;
      const newStudentId = `std-${uniqueSuffix}`;

      const newUser: User = {
        id: newUserId,
        fullName: trimmedName,
        username: finalUsername,
        role: 'murid',
        createdAt: new Date().toISOString(),
      };

      const newStudent: Student = {
        id: newStudentId,
        userId: newUserId,
        classId: item.classId,
        name: trimmedName,
      };

      this.removeTombstone('ti_senang_deleted_student_ids', newStudentId);
      this.removeTombstone('ti_senang_deleted_student_ids', newUserId);
      users.push(newUser);
      students.push(newStudent);
      creds[finalUsername.toLowerCase()] = password;
      addedCount++;
    });

    this.setItem(STORAGE_KEYS.USERS, users);
    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);

    // Simpan batch ke database Firebase Realtime
    firebaseRealtime.saveStudents(students).catch(() => {});
    firebaseRealtime.saveUsers(users).catch(() => {});
    firebaseRealtime.saveCredentials(creds).catch(() => {});
    this.syncClassesAndKelompokToFirebase().catch(() => {});

    return addedCount;
  }

  public updateStudent(
    studentIdOrUserId: string,
    fullName: string,
    username: string,
    classId: string,
    password?: string,
  ): void {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const sIdx = students.findIndex((s) => s.id === studentIdOrUserId || s.userId === studentIdOrUserId);
    if (sIdx === -1) return;

    students[sIdx].classId = classId;
    students[sIdx].name = fullName;
    this.setItem(STORAGE_KEYS.STUDENTS, students);

    const updatedUser = this.updateUser(students[sIdx].userId, { fullName, username });

    if (password) {
      const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
      creds[username.toLowerCase()] = password;
      this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
      firebaseRealtime.saveCredential(username, password).catch(() => {});
      firebaseRealtime.saveCredentials(creds).catch(() => {});
    }

    // Simpan ke database Firebase Realtime
    firebaseRealtime.saveStudent(students[sIdx]).catch(() => {});
    if (updatedUser) {
      firebaseRealtime.saveUser(updatedUser).catch(() => {});
    }
    firebaseRealtime.saveStudents(students).catch(() => {});
    firebaseRealtime.saveUsers(this.getUsers()).catch(() => {});
  }

  public batchUpdateStudentKelompok(list: Array<{ studentId: string; kelompok: string }>): void {
    const students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    let changed = false;
    for (const item of list) {
      const s = students.find((st) => st.id === item.studentId || st.userId === item.studentId);
      if (s) {
        s.kelompok = item.kelompok;
        changed = true;
      }
    }
    if (changed) {
      this.setItem(STORAGE_KEYS.STUDENTS, students);
      firebaseRealtime.saveStudents(students).catch(() => {});
      this.syncClassesAndKelompokToFirebase().catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tisenang_students_updated', { detail: students }));
        window.dispatchEvent(new CustomEvent('tisenang_student_kelompok_updated', { detail: students }));
      }
    }
  }

  public deleteStudent(studentIdOrUserId: string): void {
    let students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    let users = this.getUsers();

    const targetStudent = students.find(
      (s) => s.id === studentIdOrUserId || s.userId === studentIdOrUserId,
    );
    const targetUserId = targetStudent ? targetStudent.userId : studentIdOrUserId;
    const targetStudentId = targetStudent ? targetStudent.id : studentIdOrUserId;

    // Catat tombstone agar murid yang dihapus admin tidak pernah muncul kembali
    this.addTombstone('ti_senang_deleted_student_ids', targetStudentId);
    this.addTombstone('ti_senang_deleted_student_ids', targetUserId);
    this.addTombstone('ti_senang_deleted_student_ids', studentIdOrUserId);

    students = students.filter(
      (s) => s.id !== targetStudentId && s.userId !== targetUserId && s.id !== studentIdOrUserId && s.userId !== studentIdOrUserId,
    );
    const deletedUser = users.find((u) => u.id === targetUserId || u.id === studentIdOrUserId);
    users = users.filter((u) => u.id !== targetUserId && u.id !== studentIdOrUserId);

    if (deletedUser) {
      const creds = this.getItem<Record<string, string>>(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS);
      delete creds[deletedUser.username.toLowerCase()];
      this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
      firebaseRealtime.deleteCredential(deletedUser.username).catch(() => {});
      firebaseRealtime.saveCredentials(creds).catch(() => {});
    }

    try {
      const tasks = this.getItem<any[]>('ti_senang_tugas_siswa', []);
      const filteredTasks = tasks.filter(
        (t) => t.studentId !== targetStudentId && t.studentId !== targetUserId && t.studentId !== studentIdOrUserId,
      );
      this.setItem('ti_senang_tugas_siswa', filteredTasks);
    } catch {}

    this.setItem(STORAGE_KEYS.STUDENTS, students);
    this.setItem(STORAGE_KEYS.USERS, users);

    // Hapus dan sinkronisasi ke database Firebase Realtime
    firebaseRealtime.deleteStudent(targetStudentId).catch(() => {});
    if (targetUserId && targetUserId !== targetStudentId) {
      firebaseRealtime.deleteStudent(targetUserId).catch(() => {});
    }
    firebaseRealtime.deleteUser(targetUserId).catch(() => {});
    firebaseRealtime.saveStudents(students).catch(() => {});
    firebaseRealtime.saveUsers(users).catch(() => {});
    this.syncClassesAndKelompokToFirebase().catch(() => {});
  }

  public getStudentsByClass(classId: string): Array<Student & { user: User; className: string }> {
    return this.getStudents().filter((s) => s && (s.classId === classId || (s as any).student?.classId === classId));
  }

  // --- Classes ---
  public getClasses(): ClassRoom[] {
    return this.getItem<ClassRoom[]>(STORAGE_KEYS.CLASSES, DEFAULT_CLASSES);
  }

  public getClassById(id: string): ClassRoom | undefined {
    return this.getClasses().find((c) => c.id === id);
  }

  public addClass(className: string): ClassRoom {
    const classes = this.getClasses();
    const newClass: ClassRoom = {
      id: `cls-${Date.now()}`,
      className,
      createdAt: new Date().toISOString(),
    };
    classes.push(newClass);
    this.setItem(STORAGE_KEYS.CLASSES, classes);

    // Simpan ke database Firebase Realtime
    firebaseRealtime.saveClass(newClass).catch(() => {});
    firebaseRealtime.saveClasses(classes).catch(() => {});
    this.syncClassesAndKelompokToFirebase().catch(() => {});

    return newClass;
  }

  public updateClass(classId: string, className: string): void {
    const classes = this.getClasses();
    const idx = classes.findIndex((c) => c.id === classId);
    if (idx !== -1) {
      classes[idx].className = className;
      this.setItem(STORAGE_KEYS.CLASSES, classes);

      // Simpan ke database Firebase Realtime
      firebaseRealtime.saveClass(classes[idx]).catch(() => {});
      firebaseRealtime.saveClasses(classes).catch(() => {});
      this.syncClassesAndKelompokToFirebase().catch(() => {});
    }
  }

  public deleteClass(classId: string): void {
    const classes = this.getClasses().filter((c) => c.id !== classId);
    this.setItem(STORAGE_KEYS.CLASSES, classes);

    // Hapus dan sinkronisasi ke database Firebase Realtime
    firebaseRealtime.deleteClass(classId).catch(() => {});
    firebaseRealtime.saveClasses(classes).catch(() => {});
    this.syncClassesAndKelompokToFirebase().catch(() => {});
  }

  // --- Hierarki Kelas, Kelompok, & List Siswa (/data_kelompok) ---
  public buildClassesAndKelompokHierarchy(): Record<string, any> {
    const classes = this.getClasses();
    const students = this.getStudents();
    const KELOMPOK_DEFAULT = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5'];
    const hierarchy: Record<string, any> = {};

    classes.forEach((c) => {
      const classStudents = students.filter(
        (s) => s.classId === c.id || s.className === c.className
      );

      const kelompokMap: Record<string, any> = {};
      KELOMPOK_DEFAULT.forEach((kName) => {
        const members = classStudents.filter((s) => s.kelompok === kName);
        const memberSummaries = members.map((m) => ({
          id: m.id,
          name: m.name,
          nisn: m.nisn || '',
          userId: m.userId,
        }));
        const memberNames = members.map((m) => m.name);

        kelompokMap[kName] = {
          nama: kName,
          kelompok: kName,
          jumlah_siswa: members.length,
          siswa: memberSummaries,
          daftar_siswa: memberNames,
          anggota: memberNames,
        };
      });

      // Siswa kelas ini yang belum ditugaskan kelompok
      const unassigned = classStudents.filter(
        (s) => !s.kelompok || !KELOMPOK_DEFAULT.includes(s.kelompok)
      );
      if (unassigned.length > 0) {
        kelompokMap['Belum Ditugaskan'] = {
          nama: 'Belum Ditugaskan',
          kelompok: 'Belum Ditugaskan',
          jumlah_siswa: unassigned.length,
          siswa: unassigned.map((m) => ({ id: m.id, name: m.name, nisn: m.nisn || '', userId: m.userId })),
          daftar_siswa: unassigned.map((m) => m.name),
          anggota: unassigned.map((m) => m.name),
        };
      }

      const classData = {
        className: c.className,
        classId: c.id,
        total_siswa: classStudents.length,
        daftar_kelompok: KELOMPOK_DEFAULT,
        kelompok: kelompokMap,
        ...kelompokMap,
      };

      hierarchy[c.className] = classData;
    });

    return hierarchy;
  }

  public getDataKelompokHierarchy(): Record<string, any> {
    const cached = this.getItem<Record<string, any>>('ti_senang_data_kelompok_hierarchy', null as any);
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      return cached;
    }
    return this.buildClassesAndKelompokHierarchy();
  }

  public async syncClassesAndKelompokToFirebase(): Promise<void> {
    try {
      const hierarchy = this.buildClassesAndKelompokHierarchy();
      await firebaseRealtime.saveDataKelompokHierarchy(hierarchy);
      this.setItem('ti_senang_data_kelompok_hierarchy', hierarchy);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tisenang_data_kelompok_updated', { detail: hierarchy }));
      }
    } catch (e) {
      console.warn('Gagal sinkronisasi hirarki data_kelompok ke Firebase:', e);
    }
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    const list = this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, DEFAULT_SUBJECTS);
    if (list && Array.isArray(list) && !list.some((s) => s.id === 'sbj-integrasi' || s.name.toLowerCase().includes('integrasi'))) {
      const updated: Subject[] = [
        ...list,
        { id: 'sbj-integrasi', name: 'Integrasi Mata Pelajaran', code: 'INT-MIPA', category: 'Integrasi' },
      ];
      this.setItem(STORAGE_KEYS.SUBJECTS, updated);
      return updated;
    }
    return list;
  }

  // --- Profiles ---
  public getTeacherProfile(userId: string): TeacherProfileData | null {
    const user = this.getUserById(userId);
    if (!user || user.role !== 'guru') return null;

    const teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    let teacher = teachers.find((t) => t.userId === userId);
    if (!teacher) {
      teacher = { id: `tch-${userId}`, userId };
    }

    const subjects = this.getSubjects();
    const classes = this.getClasses();
    const teacherClasses = this.getItem<TeacherClass[]>(STORAGE_KEYS.TEACHER_CLASSES, INITIAL_TEACHER_CLASSES);
    const assigned = teacherClasses.filter((tc) => tc.teacherId === teacher?.id);

    return {
      user,
      teacher,
      subjects,
      classes,
      assignedTeacherClasses: assigned.length > 0 ? assigned : teacherClasses,
    };
  }

  public getStudentProfile(userIdOrStudentId: string): StudentProfileData | null {
    let user = this.getUserById(userIdOrStudentId);
    let student = this.getStudentByUserId(userIdOrStudentId);
    if (!student) {
      student = this.getStudentById(userIdOrStudentId);
      if (student && !user) {
        user = this.getUserById(student.userId);
      }
    }
    if (!user && student) {
      user = this.getUserById(student.userId);
    }
    if (!user || user.role !== 'murid') return null;

    if (!student) {
      const classes = this.getClasses();
      student = { id: `std-${user.id}`, userId: user.id, classId: classes?.[0]?.id || 'cls-xii-1', name: user.fullName };
    }

    const classes = this.getClasses();
    const classObj = classes.find((c) => c.id === student?.classId);
    const className = classObj ? classObj.className : 'XII-1';

    const allPortfolio = this.getStudentPortfolios(student.id);
    const progressList = this.getAllStudentProgress(student.id);

    const currentSemester = this.getActiveSemester();
    const resets = this.getItem<Record<string, { semester: '1' | '2'; resetAt: number }>>(
      'ti_senang_student_semester_resets',
      {},
    );
    const studentReset = resets[student.id];

    const completedProgress = progressList.filter((p) => p.status === 'COMPLETED');
    const missionXp = completedProgress.reduce((sum, p) => sum + (p.xp || 100), 0);
    const portfolioXp = allPortfolio.reduce((sum, p) => sum + (p.xpEarned || 0), 0);

    let totalXp = 0;
    if (studentReset && studentReset.semester === currentSemester) {
      // Semester baru aktif: XP direset ke 0 dan bertambah hanya jika ada misi baru yang diselesaikan setelah pergantian semester
      const postResetProgress = completedProgress.filter((p) => {
        const compTime = p.completedAt ? new Date(p.completedAt).getTime() : 0;
        return compTime > studentReset.resetAt;
      });
      totalXp = postResetProgress.reduce((sum, p) => sum + (p.xp || 100), 0);
    } else {
      totalXp = missionXp + portfolioXp + 450;
    }

    return {
      user,
      student,
      className,
      xp: totalXp,
      level: Math.max(1, Math.floor(totalXp / 300) + 1),
      completedMissionsCount: completedProgress.length,
      streakDays: 7,
      missions: [],
      portfolio: allPortfolio,
    };
  }

  // --- Semester Management & XP Reset ---
  public getActiveSemester(): '1' | '2' {
    return this.getItem<'1' | '2'>('ti_senang_active_semester', '1');
  }

  public setActiveSemester(semester: '1' | '2', studentId?: string): void {
    const previous = this.getActiveSemester();
    this.setItem('ti_senang_active_semester', semester);

    // Jika beralih atau memulai semester baru, reset poin XP murid kembali dari 0
    if (studentId) {
      this.resetStudentForNewSemester(studentId, semester);
    }
  }

  public resetStudentForNewSemester(studentId: string, semester: '1' | '2'): void {
    const resets = this.getItem<Record<string, { semester: '1' | '2'; resetAt: number }>>(
      'ti_senang_student_semester_resets',
      {},
    );
    resets[studentId] = { semester, resetAt: Date.now() };
    this.setItem('ti_senang_student_semester_resets', resets);

    // Reset progress misi siswa agar memulai semester baru dengan segar
    const allProgress = this.getAllStudentProgress(studentId);
    const resetProgress = allProgress.map((p) => ({
      ...p,
      status: 'AVAILABLE' as const,
      score: 0,
      xp: 0,
      attempts: 0,
      completedAt: undefined,
    }));
    this.setItem(STORAGE_KEYS.STUDENT_PROGRESS, resetProgress);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_semester_changed', { detail: { semester, studentId } }));
    }
  }

  public isStudentSemesterReset(studentId: string, semester: '1' | '2'): boolean {
    const resets = this.getItem<Record<string, { semester: '1' | '2'; resetAt: number }>>(
      'ti_senang_student_semester_resets',
      {},
    );
    return resets[studentId]?.semester === semester;
  }

  // --- Missions ---
  public getAllMissions(): Mission[] {
    return this.getItem<Mission[]>(STORAGE_KEYS.CORE_MISSIONS, INITIAL_CORE_MISSIONS);
  }

  public syncMissionsFromFirebase(remoteMissions: Mission[]): void {
    if (!remoteMissions || !Array.isArray(remoteMissions)) return;
    const localMissions = this.getItem<Mission[]>(STORAGE_KEYS.CORE_MISSIONS, []);
    const map = new Map<string, Mission>();
    remoteMissions.forEach((m) => {
      if (m && m.id && !this.isTombstoned('ti_senang_deleted_mission_ids', m.id)) {
        map.set(m.id, m);
      }
    });
    // Pertahankan misi lokal yang belum dihapus oleh guru
    localMissions.forEach((m) => {
      if (m && m.id && !this.isTombstoned('ti_senang_deleted_mission_ids', m.id) && !map.has(m.id)) {
        map.set(m.id, m);
        firebaseRealtime.saveMission(m).catch(() => {});
      }
    });
    const merged = Array.from(map.values());
    const isDifferent =
      localMissions.length !== merged.length ||
      merged.some((m, idx) => {
        const l = localMissions[idx];
        return !l || l.id !== m.id || l.title !== m.title || l.updatedAt !== m.updatedAt;
      });

    if (isDifferent) {
      this.setItem(STORAGE_KEYS.CORE_MISSIONS, merged);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: merged }));
      }
    }
  }

  public getMissionsByClass(classId: string): Mission[] {
    const all = this.getAllMissions() || [];
    if (!classId || classId === 'ALL' || classId === 'all' || classId === 'semua') return all;

    const normalizedQuery = (classId || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    return all.filter((m) => {
      if (!m) return false;
      // Jika misi ditugaskan untuk semua kelas
      if (m.classId === 'ALL' || m.classId === 'semua' || !m.classId) return true;

      const normClassId = (m.classId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normClassName = (m.className || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      return (
        m.classId === classId ||
        normClassId === normalizedQuery ||
        normClassName === normalizedQuery ||
        (normalizedQuery.length >= 3 && (normClassId.includes(normalizedQuery) || normClassName.includes(normalizedQuery))) ||
        (normClassId.length >= 3 && normalizedQuery.includes(normClassId)) ||
        (normClassName.length >= 3 && normalizedQuery.includes(normClassName))
      );
    });
  }

  public createMission(payload: Partial<Mission>): Mission {
    const missions = this.getAllMissions();
    const newMission: Mission = {
      id: payload.id || `msn-${payload.classId || 'cls-xii-1'}-${Date.now()}`,
      coreMissionNumber: payload.coreMissionNumber || 1,
      coreTitle: payload.coreTitle || 'Misi Pembelajaran MIPA',
      title: payload.title || 'Misi Baru',
      description: payload.description || '',
      status: payload.status || 'PUBLISHED',
      subjectId: payload.subjectId || 'sbj-fisika',
      subjectName: payload.subjectName || 'Fisika Eksperimental',
      classId: payload.classId || 'cls-xii-1',
      className: payload.className || 'XII-1',
      xpReward: payload.xpReward || 100,
      createdAt: new Date().toISOString(),
      ...payload,
    };

    this.removeTombstone('ti_senang_deleted_mission_ids', newMission.id);
    missions.push(newMission);
    this.setItem(STORAGE_KEYS.CORE_MISSIONS, missions);

    // Sinkronisasi Real-time ke Firebase Realtime Database node /misi
    firebaseRealtime.saveMission(newMission).catch((err) => {
      console.warn('[Firebase RTDB] saveMission warning:', err);
    });

    // Simpan ke Firestore Cache-First
    firestoreCache.saveMission(newMission).catch(() => {});

    // Siarkan ke seluruh tab & akun siswa secara instan
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: missions }));
    }

    return newMission;
  }

  public updateMission(id: string, payload: Partial<Mission>): Mission | null {
    const missions = this.getAllMissions();
    const idx = missions.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    missions[idx] = { ...missions[idx], ...payload, updatedAt: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.CORE_MISSIONS, missions);

    // Sinkronisasi Real-time ke Firebase Realtime Database node /misi
    firebaseRealtime.saveMission(missions[idx]).catch((err) => {
      console.warn('[Firebase RTDB] updateMission warning:', err);
    });

    // Perbarui ke Firestore Cache-First
    firestoreCache.saveMission(missions[idx]).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: missions }));
    }

    return missions[idx];
  }

  public deleteMission(id: string): void {
    const cleanId = id.trim();
    this.addTombstone('ti_senang_deleted_mission_ids', cleanId);
    const missions = this.getAllMissions().filter((m) => m.id !== cleanId && m.id !== id);
    this.setItem(STORAGE_KEYS.CORE_MISSIONS, missions);

    // Hapus dari Firebase Realtime Database node /misi
    firebaseRealtime.deleteMission(cleanId).catch((err) => {
      console.warn('[Firebase RTDB] deleteMission warning:', err);
    });

    // Hapus dari Firestore Cache-First
    firestoreCache.deleteMission(cleanId).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: missions }));
    }
  }

  public togglePublishMission(id: string): void {
    const missions = this.getAllMissions();
    const idx = missions.findIndex((m) => m.id === id);
    if (idx !== -1) {
      missions[idx].status = missions[idx].status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      missions[idx].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.CORE_MISSIONS, missions);

      firebaseRealtime.saveMission(missions[idx]).catch((err) => {
        console.warn('[Firebase RTDB] togglePublishMission warning:', err);
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: missions }));
      }
    }
  }

  public getMissions(): Mission[] {
    return this.getAllMissions();
  }

  public saveMissions(missions: Mission[]): void {
    this.setItem(STORAGE_KEYS.CORE_MISSIONS, missions);
    missions.forEach((m) => {
      firebaseRealtime.saveMission(m).catch(() => {});
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_missions_updated', { detail: missions }));
    }
  }

  // --- Student Progress ---
  public getAllStudentProgress(studentId: string): StudentProgress[] {
    const all = this.getItem<StudentProgress[]>(STORAGE_KEYS.STUDENT_PROGRESS, INITIAL_STUDENT_PROGRESS);
    return all.filter((p) => p.studentId === studentId);
  }

  public getStudentProgress(studentId: string, missionId: string): StudentProgress | undefined {
    const list = this.getAllStudentProgress(studentId);
    return list.find((p) => p.missionId === missionId);
  }

  public completeMission(studentId: string, missionId: string, score = 90, xpReward = 100): void {
    const all = this.getItem<StudentProgress[]>(STORAGE_KEYS.STUDENT_PROGRESS, INITIAL_STUDENT_PROGRESS);
    const idx = all.findIndex((p) => p.studentId === studentId && p.missionId === missionId);

    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        progress: 100,
        status: 'COMPLETED',
        score,
        xp: xpReward,
        completedAt: new Date().toISOString(),
      };
    } else {
      all.push({
        id: `prog-${studentId}-${missionId}`,
        studentId,
        missionId,
        progress: 100,
        status: 'COMPLETED',
        score,
        xp: xpReward,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }

    this.setItem(STORAGE_KEYS.STUDENT_PROGRESS, all);
  }

  public updateMissionProgress(studentId: string, missionId: string, progress: number): void {
    const all = this.getItem<StudentProgress[]>(STORAGE_KEYS.STUDENT_PROGRESS, INITIAL_STUDENT_PROGRESS);
    const idx = all.findIndex((p) => p.studentId === studentId && p.missionId === missionId);

    if (idx !== -1) {
      all[idx].progress = progress;
      if (progress >= 100) {
        all[idx].status = 'COMPLETED';
        all[idx].completedAt = new Date().toISOString();
      } else {
        all[idx].status = 'IN PROGRESS';
      }
    } else {
      all.push({
        id: `prog-${studentId}-${missionId}`,
        studentId,
        missionId,
        progress,
        status: progress >= 100 ? 'COMPLETED' : 'IN PROGRESS',
        score: 0,
        xp: 0,
        startedAt: new Date().toISOString(),
        completedAt: progress >= 100 ? new Date().toISOString() : undefined,
      });
    }

    this.setItem(STORAGE_KEYS.STUDENT_PROGRESS, all);
  }

  // --- Misi 1 Student Notes (Informasi Penting Bahan Ajar/Video) ---
  public saveMisi1Notes(studentId: string, note: string, missionId?: string): void {
    const all = this.getItem<Record<string, { note: string; updatedAt: string; missionId?: string }>>(
      STORAGE_KEYS.MISI1_NOTES,
      {}
    );
    all[studentId] = {
      note,
      updatedAt: new Date().toISOString(),
      missionId,
    };
    this.setItem(STORAGE_KEYS.MISI1_NOTES, all);
  }

  public getMisi1Notes(studentId: string): string | null {
    const all = this.getItem<Record<string, { note: string; updatedAt: string; missionId?: string }>>(
      STORAGE_KEYS.MISI1_NOTES,
      {}
    );
    return all[studentId]?.note || null;
  }

  // --- Experiment Sessions ---
  public getStudentExperimentSession(studentId: string, missionId?: string): ExperimentSession | null {
    const all = this.getItem<ExperimentSession[]>(STORAGE_KEYS.EXPERIMENT_SESSIONS, []);
    if (missionId) {
      const match = all.find((s) => s.studentId === studentId && s.missionId === missionId);
      if (match && match.rows && match.rows.length > 0) return match;
    }
    // Fallback: cari sesi eksperimen terbaru milik siswa ini yang memiliki data baris
    const studentSessions = all.filter((s) => s.studentId === studentId && s.rows && s.rows.length > 0);
    if (studentSessions.length > 0) {
      return studentSessions[studentSessions.length - 1];
    }
    return all.find((s) => s.studentId === studentId) || null;
  }

  public saveExperimentSession(session: ExperimentSession): void {
    const all = this.getItem<ExperimentSession[]>(STORAGE_KEYS.EXPERIMENT_SESSIONS, []);
    const idx = all.findIndex(
      (s) => s.studentId === session.studentId && s.missionId === session.missionId,
    );

    if (idx !== -1) {
      all[idx] = session;
    } else {
      all.push(session);
    }

    this.setItem(STORAGE_KEYS.EXPERIMENT_SESSIONS, all);
  }

  // --- Portfolios ---
  public getAllPortfolios(): PortfolioItem[] {
    const list = this.getItem<PortfolioItem[]>(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
    // Pastikan seluruh portofolio memiliki foto dokumentasi nyata siswa (bukan logo misi)
    return list.map((item) => {
      const doc = item.documentation;
      const isInvalidDoc =
        !doc ||
        typeof doc !== 'string' ||
        doc.trim() === '' ||
        doc.includes('misi_') ||
        doc.includes('logo');

      if (isInvalidDoc) {
        if (item.id === 'pf-01' || item.title?.toLowerCase().includes('kalorimeter') || item.title?.toLowerCase().includes('radiasi')) {
          return { ...item, documentation: photoCalorimeter };
        }
        if (item.id === 'pf-02' || item.title?.toLowerCase().includes('regresi') || item.title?.toLowerCase().includes('bivariat')) {
          return { ...item, documentation: photoRegression };
        }
        if (item.id === 'pf-03' || item.title?.toLowerCase().includes('kimia') || item.title?.toLowerCase().includes('reaksi')) {
          return { ...item, documentation: photoChem };
        }
        if (item.id === 'pf-04' || item.title?.toLowerCase().includes('transpirasi') || item.title?.toLowerCase().includes('biologi') || item.title?.toLowerCase().includes('daun')) {
          return { ...item, documentation: photoBio };
        }
        return { ...item, documentation: photoCalorimeter };
      }
      return item;
    });
  }

  public getStudentPortfolios(studentId: string): PortfolioItem[] {
    return this.getAllPortfolios().filter((p) => p.studentId === studentId);
  }

  public getClassPortfolios(classId: string): PortfolioItem[] {
    // Semua portofolio karya siswa dapat dilihat oleh seluruh teman sekelas dan guru
    return this.getAllPortfolios().filter((p) => p && (!p.classId || p.classId === classId || p.visibility === 'CLASS'));
  }

  public savePortfolio(item: PortfolioItem): void {
    if (item?.id) {
      this.deletedPortfolioIds.delete(item.id.trim());
    }
    // Pastikan visibilitas portofolio selalu terbuka untuk seluruh kelas dan guru
    const itemWithVisibility: PortfolioItem = {
      ...item,
      visibility: 'CLASS',
    };
    const all = this.getAllPortfolios();
    const idx = all.findIndex((p) => p.id === itemWithVisibility.id);
    if (idx !== -1) {
      all[idx] = itemWithVisibility;
    } else {
      all.unshift(itemWithVisibility);
    }
    this.setItem(STORAGE_KEYS.PORTFOLIO, all);

    // Sinkronkan ke Firebase Realtime Database node /portofolio dengan kompresi foto base64
    // Mengompres string base64 foto secara optimal sehingga sangat ringan (< 45KB) dan tidak menyebabkan overload
    const itemForFirebase: PortfolioItem = {
      ...itemWithVisibility,
    };

    if (itemForFirebase.documentation && itemForFirebase.documentation.startsWith('data:image')) {
      compressBase64ForFirebase(itemForFirebase.documentation)
        .then((compressedDoc) => {
          itemForFirebase.documentation = compressedDoc;
          // Perbarui juga data lokal agar hemat ruang penyimpanan
          const updatedAll = this.getAllPortfolios();
          const target = updatedAll.find((p) => p.id === itemForFirebase.id);
          if (target) {
            target.documentation = compressedDoc;
            this.setItem(STORAGE_KEYS.PORTFOLIO, updatedAll);
          }
          firebaseRealtime.publishPortfolio(itemForFirebase).catch((err) => {
            console.warn('[Firebase RTDB] publishPortfolio warning:', err);
          });
        })
        .catch(() => {
          firebaseRealtime.publishPortfolio(itemForFirebase).catch((err) => {
            console.warn('[Firebase RTDB] publishPortfolio warning:', err);
          });
        });
    } else {
      firebaseRealtime.publishPortfolio(itemForFirebase).catch((err) => {
        console.warn('[Firebase RTDB] publishPortfolio warning:', err);
      });
    }
  }

  public async deletePortfolio(id: string): Promise<void> {
    if (!id) return;
    const cleanId = id.trim();
    this.deletedPortfolioIds.add(cleanId);
    const all = this.getAllPortfolios().filter(
      (p) => p && p.id && p.id.trim() !== cleanId && String(p.id) !== String(id)
    );
    this.setItem(STORAGE_KEYS.PORTFOLIO, all);
    window.dispatchEvent(new CustomEvent('tisenang_portfolios_updated', { detail: all }));

    try {
      await firebaseRealtime.deletePortfolio(cleanId);
    } catch (err) {
      console.warn('[Firebase RTDB] deletePortfolio warning:', err);
    }
  }

  public likePortfolio(portfolioId: string, studentId: string): void {
    const all = this.getAllPortfolios();
    const item = all.find((p) => p.id === portfolioId);
    if (item) {
      item.likedBy = item.likedBy || {};
      if (!item.likedBy[studentId]) {
        item.likedBy[studentId] = true;
        item.likesCount = (item.likesCount || 0) + 1;
      } else {
        delete item.likedBy[studentId];
        item.likesCount = Math.max(0, (item.likesCount || 1) - 1);
      }
      this.setItem(STORAGE_KEYS.PORTFOLIO, all);
      firebaseRealtime.likePortfolio(portfolioId, studentId).catch(() => {});
    }
  }

  public commentPortfolio(
    portfolioId: string,
    comment: { authorName: string; text: string; authorId?: string; authorRole?: 'guru' | 'murid' | 'admin' }
  ): void {
    const all = this.getAllPortfolios();
    const item = all.find((p) => p.id === portfolioId);
    if (item) {
      item.comments = item.comments || [];
      const newComment = {
        id: `cmt-${Date.now()}`,
        authorId: comment.authorId || 'usr-anonymous',
        authorName: comment.authorName,
        authorRole: (comment.authorRole || 'murid') as 'guru' | 'murid' | 'admin',
        text: comment.text,
        createdAt: new Date().toISOString(),
      };
      item.comments.push(newComment);
      this.setItem(STORAGE_KEYS.PORTFOLIO, all);
      firebaseRealtime.addPortfolioComment(portfolioId, newComment).catch(() => {});
    }
  }

  // --- Student Task Submissions (node /tugas_siswa) ---
  public submitStudentTask(submission: StudentTaskSubmission): void {
    if (submission?.id) {
      this.removeTombstone('ti_senang_deleted_task_ids', submission.id);
    }
    const all = this.getItem<StudentTaskSubmission[]>('ti_senang_tugas_siswa', []);
    const idx = all.findIndex((t) => t.id === submission.id);
    if (idx !== -1) {
      all[idx] = submission;
    } else {
      all.unshift(submission);
    }
    this.setItem('ti_senang_tugas_siswa', all);
    // Sinkronkan ke Firebase Realtime Database node /tugas_siswa
    firebaseRealtime.submitStudentTask(submission).catch((err) => {
      console.warn('[Firebase RTDB] submitStudentTask warning:', err);
    });
  }

  public getStudentTasks(studentId?: string, missionId?: string): StudentTaskSubmission[] {
    let all = this.getItem<StudentTaskSubmission[]>('ti_senang_tugas_siswa', []);
    if (studentId) {
      all = all.filter((t) => t.studentId === studentId);
    }
    if (missionId) {
      all = all.filter((t) => t.missionId === missionId);
    }
    return all;
  }

  public getStudentTasksByClass(classId?: string): StudentTaskSubmission[] {
    const all = this.getItem<StudentTaskSubmission[]>('ti_senang_tugas_siswa', []);
    if (classId && classId !== 'all') {
      return all.filter((t) => t.classId === classId);
    }
    return all;
  }

  public gradeStudentTask(taskId: string, grade: number, feedback: string): void {
    const all = this.getItem<StudentTaskSubmission[]>('ti_senang_tugas_siswa', []);
    const task = all.find((t) => t.id === taskId);
    if (task) {
      task.status = 'GRADED';
      task.score = grade;
      task.teacherFeedback = feedback;
      this.setItem('ti_senang_tugas_siswa', all);
      firebaseRealtime.submitStudentTask(task).catch(() => {});
    }
  }

  public updateStudentTaskGrade(taskId: string, updates: Partial<StudentTaskSubmission>): void {
    const all = this.getItem<StudentTaskSubmission[]>('ti_senang_tugas_siswa', []);
    const task = all.find((t) => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      this.setItem('ti_senang_tugas_siswa', all);
      firebaseRealtime.submitStudentTask(task).catch(() => {});
    }
  }

  public deleteStudentTask(id: string): void {
    const cleanId = id.trim();
    this.addTombstone('ti_senang_deleted_task_ids', cleanId);
    const tasks = this.getItem<StudentTaskSubmission[]>('ti_senang_tugas_siswa', []);
    const filtered = tasks.filter((t) => t.id !== cleanId && t.id !== id);
    this.setItem('ti_senang_tugas_siswa', filtered);

    firebaseRealtime.deleteStudentTask(cleanId).catch(() => {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_tasks_updated', { detail: filtered }));
    }
  }

  // --- Student Reflection & Self-Assessment (Misi 5) ---
  public saveStudentReflection(reflection: StudentReflectionSubmission): void {
    const all = this.getItem<StudentReflectionSubmission[]>('ti_senang_refleksi_siswa', []);
    const idx = all.findIndex((r) => r.id === reflection.id || (r.studentId === reflection.studentId && r.missionId === reflection.missionId));
    if (idx !== -1) {
      all[idx] = reflection;
    } else {
      all.unshift(reflection);
    }
    this.setItem('ti_senang_refleksi_siswa', all);

    // Also bridge as task submission for teacher review
    const taskSubmission: StudentTaskSubmission = {
      id: `task-refl-${reflection.studentId}-${reflection.missionId}`,
      missionId: reflection.missionId,
      studentId: reflection.studentId,
      studentName: reflection.studentName,
      classId: reflection.classId,
      className: reflection.className,
      status: 'SUBMITTED',
      score: reflection.selfAssessment?.totalScorePercentage || 90,
      xpEarned: 110,
      submittedAt: reflection.submittedAt,
      reflection: JSON.stringify(reflection.reflectionAnswers),
      conclusion: reflection.selfAssessment?.komitmen || '',
      content: `[Refleksi Pembelajaran & Penilaian Diri] Capaian Diri: ${reflection.selfAssessment?.totalScorePercentage || 90}%. Komitmen: ${reflection.selfAssessment?.komitmen || '-'}`,
      answers: {
        reflectionAnswers: reflection.reflectionAnswers,
        selfAssessment: reflection.selfAssessment,
      },
    };
    this.submitStudentTask(taskSubmission);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_refleksi_updated', { detail: reflection }));
    }
  }

  public getStudentReflections(classId?: string, studentId?: string): StudentReflectionSubmission[] {
    let all = this.getItem<StudentReflectionSubmission[]>('ti_senang_refleksi_siswa', []);
    if (classId && classId !== 'all') {
      all = all.filter((r) => r.classId === classId);
    }
    if (studentId) {
      all = all.filter((r) => r.studentId === studentId);
    }
    return all;
  }

  // Teacher Reflection & Rubric Configuration (Misi 5)
  public saveTeacherReflectionConfig(config: TeacherReflectionConfig): void {
    const allConfigs = this.getItem<TeacherReflectionConfig[]>('ti_senang_teacher_refleksi_configs', []);
    const idx = allConfigs.findIndex(
      (c) => c.classId === config.classId || (config.missionId && c.missionId === config.missionId),
    );
    if (idx !== -1) {
      allConfigs[idx] = config;
    } else {
      allConfigs.push(config);
    }
    this.setItem('ti_senang_teacher_refleksi_configs', allConfigs);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tisenang_teacher_refleksi_config_updated', { detail: config }),
      );
    }
  }

  public getTeacherReflectionConfig(classId?: string, missionId?: string): TeacherReflectionConfig | null {
    const allConfigs = this.getItem<TeacherReflectionConfig[]>('ti_senang_teacher_refleksi_configs', []);
    if (missionId) {
      const matchMission = allConfigs.find((c) => c.missionId === missionId);
      if (matchMission) return matchMission;
    }
    if (classId && classId !== 'all') {
      const matchClass = allConfigs.find((c) => c.classId === classId);
      if (matchClass) return matchClass;
    }
    return allConfigs[0] || null;
  }

  public addStudentXp(studentId: string, xp: number): void {
    const profiles = this.getItem<Record<string, any>>(STORAGE_KEYS.STUDENTS, {});
    if (profiles[studentId]) {
      profiles[studentId].xp = (profiles[studentId].xp || 0) + xp;
      this.setItem(STORAGE_KEYS.STUDENTS, profiles);
    }
  }

  // --- ALME Recommendations ---
  public getAlmeRecommendation(studentId: string): AlmeRecommendation | null {
    const recs = this.getItem<Record<string, AlmeRecommendation>>(
      STORAGE_KEYS.ALME_RECOMMENDATIONS,
      {},
    );
    return recs[studentId] || null;
  }

  public saveAlmeRecommendation(studentIdOrRec: string | (Record<string, any> & { studentId?: string }), recommendation?: any): void {
    const recs = this.getItem<Record<string, AlmeRecommendation>>(
      STORAGE_KEYS.ALME_RECOMMENDATIONS,
      {},
    );
    if (typeof studentIdOrRec === 'string' && recommendation) {
      recs[studentIdOrRec] = recommendation;
    } else if (typeof studentIdOrRec === 'object' && studentIdOrRec) {
      const sId = studentIdOrRec.studentId;
      if (sId) {
        recs[sId] = studentIdOrRec as AlmeRecommendation;
      }
    }
    this.setItem(STORAGE_KEYS.ALME_RECOMMENDATIONS, recs);
  }

  public addAlmeRecommendation(rec: any): void {
    if (rec && rec.studentId) {
      this.saveAlmeRecommendation(rec.studentId, rec);
    }
  }

  // --- Tujuan Pembelajaran (TP) ---
  public getTujuanPembelajaran(subjectId?: string): TujuanPembelajaran[] {
    const all = this.getItem<TujuanPembelajaran[]>(
      STORAGE_KEYS.TUJUAN_PEMBELAJARAN,
      INITIAL_TUJUAN_PEMBELAJARAN,
    );
    if (subjectId && subjectId !== 'all') {
      return all.filter((tp) => tp.subjectId === subjectId);
    }
    return all;
  }

  public saveTujuanPembelajaran(tp: TujuanPembelajaran): void {
    if (tp?.id) {
      this.removeTombstone('ti_senang_deleted_tp_ids', tp.id);
    }
    const all = this.getItem<TujuanPembelajaran[]>(
      STORAGE_KEYS.TUJUAN_PEMBELAJARAN,
      INITIAL_TUJUAN_PEMBELAJARAN,
    );
    const idx = all.findIndex((item) => item.id === tp.id);
    if (idx !== -1) {
      all[idx] = tp;
    } else {
      all.push(tp);
    }
    this.setItem(STORAGE_KEYS.TUJUAN_PEMBELAJARAN, all);
    // Sinkronisasi ke Firebase node /tujuan_pembelajaran
    firebaseRealtime.saveTujuanPembelajaran(tp).catch((err) => {
      console.warn('[Firebase RTDB] saveTujuanPembelajaran warning:', err);
    });
  }

  public deleteTujuanPembelajaran(id: string): void {
    const cleanId = id.trim();
    this.addTombstone('ti_senang_deleted_tp_ids', cleanId);
    const all = this.getItem<TujuanPembelajaran[]>(
      STORAGE_KEYS.TUJUAN_PEMBELAJARAN,
      INITIAL_TUJUAN_PEMBELAJARAN,
    );
    this.setItem(
      STORAGE_KEYS.TUJUAN_PEMBELAJARAN,
      all.filter((tp) => tp.id !== cleanId && tp.id !== id),
    );
    // Hapus dari Firebase node /tujuan_pembelajaran
    firebaseRealtime.deleteTujuanPembelajaran(cleanId).catch((err) => {
      console.warn('[Firebase RTDB] deleteTujuanPembelajaran warning:', err);
    });
  }

  // --- Asesmen Awal ---
  public getAsesmenAwal(classId?: string): AsesmenAwalInput[] {
    const all = this.getItem<AsesmenAwalInput[]>(STORAGE_KEYS.ASESMEN_AWAL, []);
    if (classId && classId !== 'all') {
      return all.filter((item) => item.classId === classId);
    }
    return all;
  }

  public saveAsesmenAwal(record: AsesmenAwalInput): void {
    if (record?.id) {
      this.removeTombstone('ti_senang_deleted_asesmen_awal_ids', record.id);
    }
    const all = this.getItem<AsesmenAwalInput[]>(STORAGE_KEYS.ASESMEN_AWAL, []);
    const idx = all.findIndex((r) => r.id === record.id);
    if (idx !== -1) {
      all[idx] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.ASESMEN_AWAL, all);
    // Sinkronisasi ke Firebase node /asesmen_awal
    firebaseRealtime.saveAsesmenAwal(record).catch((err) => {
      console.warn('[Firebase RTDB] saveAsesmenAwal warning:', err);
    });
  }

  public deleteAsesmenAwal(id: string): void {
    const cleanId = id.trim();
    this.addTombstone('ti_senang_deleted_asesmen_awal_ids', cleanId);
    const all = this.getItem<AsesmenAwalInput[]>(STORAGE_KEYS.ASESMEN_AWAL, []);
    this.setItem(
      STORAGE_KEYS.ASESMEN_AWAL,
      all.filter((r) => r.id !== cleanId && r.id !== id),
    );
    // Hapus dari Firebase node /asesmen_awal
    firebaseRealtime.deleteAsesmenAwal(cleanId).catch((err) => {
      console.warn('[Firebase RTDB] deleteAsesmenAwal warning:', err);
    });
  }

  public deleteAllAsesmenAwal(classId?: string): void {
    const all = this.getItem<AsesmenAwalInput[]>(STORAGE_KEYS.ASESMEN_AWAL, []);
    let remaining: AsesmenAwalInput[] = [];
    let toDelete: AsesmenAwalInput[] = [];

    if (classId && classId !== 'all') {
      remaining = all.filter((r) => r.classId !== classId);
      toDelete = all.filter((r) => r.classId === classId);
    } else {
      remaining = [];
      toDelete = all;
    }

    toDelete.forEach((r) => {
      if (r?.id) {
        this.addTombstone('ti_senang_deleted_asesmen_awal_ids', r.id);
      }
    });

    this.setItem(STORAGE_KEYS.ASESMEN_AWAL, remaining);
    toDelete.forEach((r) => {
      firebaseRealtime.deleteAsesmenAwal(r.id).catch((err) => {
        console.warn('[Firebase RTDB] deleteAsesmenAwal warning:', err);
      });
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tisenang_asesmen_awal_updated'));
    }
  }

  // --- Asesmen Akhir ---
  public getAsesmenAkhir(classId?: string, subjectId?: string): AsesmenAkhirRecord[] {
    const all = this.getItem<AsesmenAkhirRecord[]>(STORAGE_KEYS.ASESMEN_AKHIR, []);
    return all.filter((item) => {
      if (classId && classId !== 'all' && item.classId !== classId) return false;
      if (subjectId && subjectId !== 'all' && item.subjectId !== subjectId) return false;
      return true;
    });
  }

  public getAsesmenAkhirRecords(classId?: string, subjectId?: string): AsesmenAkhirRecord[] {
    return this.getAsesmenAkhir(classId, subjectId);
  }

  public saveAsesmenAkhir(record: AsesmenAkhirRecord): void {
    if (record?.id) {
      this.removeTombstone('ti_senang_deleted_asesmen_akhir_ids', record.id);
    }
    const all = this.getItem<AsesmenAkhirRecord[]>(STORAGE_KEYS.ASESMEN_AKHIR, []);
    const idx = all.findIndex((r) => r.id === record.id);
    if (idx !== -1) {
      all[idx] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.ASESMEN_AKHIR, all);
    // Sinkronisasi ke Firebase node /asesmen_akhir
    firebaseRealtime.saveAsesmenAkhir(record).catch((err) => {
      console.warn('[Firebase RTDB] saveAsesmenAkhir warning:', err);
    });
  }

  public saveAsesmenAkhirRecord(record: AsesmenAkhirRecord): void {
    this.saveAsesmenAkhir(record);
  }

  public deleteAsesmenAkhir(id: string): void {
    const cleanId = id.trim();
    this.addTombstone('ti_senang_deleted_asesmen_akhir_ids', cleanId);
    const all = this.getItem<AsesmenAkhirRecord[]>(STORAGE_KEYS.ASESMEN_AKHIR, []);
    this.setItem(
      STORAGE_KEYS.ASESMEN_AKHIR,
      all.filter((r) => r.id !== cleanId && r.id !== id),
    );
    // Hapus dari Firebase node /asesmen_akhir
    firebaseRealtime.deleteAsesmenAkhir(cleanId).catch((err) => {
      console.warn('[Firebase RTDB] deleteAsesmenAkhir warning:', err);
    });
  }

  // --- ALME Individual Mission Insertion per Student ---
  public getAlmeIndividualMissions(studentId?: string): AlmeIndividualMission[] {
    const all = this.getItem<AlmeIndividualMission[]>(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, []);
    if (studentId) {
      return all.filter(
        (m) =>
          m.studentId === studentId ||
          (studentId.startsWith('std-') && m.studentId === studentId.replace('std-', '')) ||
          (m.studentId.startsWith('std-') && studentId === m.studentId.replace('std-', ''))
      );
    }
    return all;
  }

  public saveAlmeIndividualMission(mission: AlmeIndividualMission): void {
    const all = this.getItem<AlmeIndividualMission[]>(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, []);
    const idx = all.findIndex((m) => m.id === mission.id);
    if (idx !== -1) {
      all[idx] = mission;
    } else {
      all.unshift(mission);
    }
    this.setItem(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, all);
    // Sinkronisasi ke Firebase Realtime Database node /alme_sisipan
    firebaseRealtime.triggerAlmeMission(mission).catch((err) => {
      console.warn('[Firebase RTDB] triggerAlmeMission warning:', err);
    });
  }

  public completeAlmeIndividualMission(missionId: string, studentId: string): void {
    const all = this.getItem<AlmeIndividualMission[]>(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, []);
    const mission = all.find((m) => m.id === missionId);
    if (mission) {
      mission.status = 'COMPLETED';
      mission.completedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, all);
      // Update ke Firebase node /alme_sisipan
      firebaseRealtime.triggerAlmeMission(mission).catch((err) => {
        console.warn('[Firebase RTDB] completeAlmeIndividualMission warning:', err);
      });
    }
  }

  public markAllAlmeIndividualMissionsCompleted(studentId: string): void {
    const all = this.getItem<AlmeIndividualMission[]>(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, []);
    let changed = false;
    all.forEach((m) => {
      const match =
        m.studentId === studentId ||
        (studentId.startsWith('std-') && m.studentId === studentId.replace('std-', '')) ||
        (m.studentId.startsWith('std-') && studentId === m.studentId.replace('std-', ''));
      if (match) {
        m.status = 'COMPLETED';
        m.completedAt = new Date().toISOString();
        changed = true;
        firebaseRealtime.triggerAlmeMission(m).catch(() => {});
      }
    });
    if (changed) {
      this.setItem(STORAGE_KEYS.ALME_INDIVIDUAL_MISSIONS, all);
    }
  }

  public async seedCurriculumMissionsIfEmpty(): Promise<Mission[]> {
    const current = this.getAllMissions();
    if (current && current.length > 0) return current;
    const starter = generateCurriculumMissionsTemplate();
    for (const m of starter) {
      await firebaseRealtime.saveMission(m);
    }
    this.setItem(STORAGE_KEYS.CORE_MISSIONS, starter);
    return starter;
  }

  // --- Automatic ALME Calculation of Literacy & Numeracy from Student Missions ---
  public calculateStudentLiteracy(studentId: string, baselineScore: number = 75): number {
    const portfolios = this.getStudentPortfolios(studentId);
    // Portofolio dengan refleksi konsep, analisis teks, dan sains
    const litPortfolios = portfolios.filter(
      (p) => p.category === 'Analisis Data' || p.category === 'Refleksi' || (p.reflectionSummary && p.reflectionSummary.length > 20)
    );
    const bonus = Math.min(litPortfolios.length * 4, 18);
    // Variasi individual stabil berdasarkan ID murid
    const charCodeSum = studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const individualOffset = (charCodeSum % 7) - 2;
    return Math.max(40, Math.min(98, Math.round(baselineScore * 0.95 + bonus + individualOffset)));
  }

  public calculateStudentNumeracy(studentId: string, baselineScore: number = 75): number {
    const allExp = this.getItem<ExperimentSession[]>(STORAGE_KEYS.EXPERIMENT_SESSIONS, []);
    const experiments = allExp.filter((e) => e.studentId === studentId);
    const dataBonus = Math.min(experiments.length * 5, 20);
    const charCodeSum = studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const individualOffset = (charCodeSum % 9) - 3;
    return Math.max(40, Math.min(98, Math.round(baselineScore * 0.92 + dataBonus + individualOffset)));
  }
}

export const storage = new StorageService();
