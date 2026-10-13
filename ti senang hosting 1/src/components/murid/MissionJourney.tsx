import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Lightbulb,
  FlaskConical,
  Target,
  Gamepad2,
  Brain,
  Trophy,
  Zap,
  Flame,
  ChevronDown,
  Check,
  Lock,
  Play,
  Sparkles,
  Star,
  AlertCircle,
  Compass,
  X,
} from 'lucide-react';
import { Mission, StudentProgress, AlmeRecommendation, StudentProfileData, TujuanPembelajaran } from '../../types';
import { storage } from '../../services/storage';
import { AlmePopupModal } from './mission/AlmePopupModal';
import { AlmeEngine } from '../../services/alme/almeEngine';

import logoMisiPahamiKonsep from '../../assets/images/misi_pahami_konsep.jpg';
import logoMisiEksperimenSimulasi from '../../assets/images/misi_eksperimen_simulasi.jpg';
import logoMisiSelesaikanMasalah from '../../assets/images/misi_selesaikan_masalah.jpg';
import logoMisiGame from '../../assets/images/misi_game.jpg';
import logoMisiLatihanRefleksi from '../../assets/images/misi_latihan_refleksi.jpg';
import logoMisiAsesmenAkhir from '../../assets/images/misi_asesmen_akhir.jpg';

export interface MissionJourneyProps {
  studentId?: string;
  missions: Mission[];
  progressList: StudentProgress[];
  almeRecommendation?: AlmeRecommendation | null;
  studentName?: string;
  className?: string;
  studentProfile?: StudentProfileData | null;
  onOpenMission: (mission: Mission) => void;
  onOpenLab?: () => void;
  onRefreshData?: () => void;
}

interface CardSpec {
  slotNumber: number;
  coreNumber: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  imageSrc: string;
  iconColor: string;
  iconGlow: string;
  iconBg: string;
  xpReward: number;
  defaultStatus: 'completed' | 'recommended' | 'locked' | 'available';
}

const SUBJECT_OPTIONS = [
  { id: 'sbj-matematika', name: 'Matematika' },
  { id: 'sbj-fisika', name: 'Fisika' },
  { id: 'sbj-kimia', name: 'Kimia' },
  { id: 'sbj-biologi', name: 'Biologi' },
  { id: 'sbj-mat-lanjut', name: 'Matematika TL' },
];

const MISSION_CARDS_SPEC: CardSpec[] = [
  // BARIS 1
  {
    slotNumber: 1,
    coreNumber: 1,
    title: 'Pahami Konsep',
    subtitle: '',
    icon: Lightbulb,
    imageSrc: logoMisiPahamiKonsep,
    iconColor: 'text-amber-400',
    iconGlow: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]',
    iconBg: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
    xpReward: 120,
    defaultStatus: 'completed',
  },
  {
    slotNumber: 2,
    coreNumber: 2,
    title: 'Studi Kasus',
    subtitle: '',
    icon: Target,
    imageSrc: logoMisiSelesaikanMasalah,
    iconColor: 'text-rose-400',
    iconGlow: 'shadow-[0_0_25px_rgba(244,63,94,0.4)]',
    iconBg: 'bg-rose-500/25 border-rose-400/50 text-rose-200',
    xpReward: 120,
    defaultStatus: 'recommended',
  },
  {
    slotNumber: 3,
    coreNumber: 3,
    title: 'Eksperimen Lab',
    subtitle: '',
    icon: FlaskConical,
    imageSrc: logoMisiEksperimenSimulasi,
    iconColor: 'text-cyan-300',
    iconGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    iconBg: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',
    xpReward: 120,
    defaultStatus: 'locked',
  },
  // BARIS 2
  {
    slotNumber: 4,
    coreNumber: 4,
    title: 'Game Sains',
    subtitle: '',
    icon: Gamepad2,
    imageSrc: logoMisiGame,
    iconColor: 'text-purple-400',
    iconGlow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    iconBg: 'bg-purple-500/20 border-purple-400/40 text-purple-300',
    xpReward: 100,
    defaultStatus: 'locked',
  },
  {
    slotNumber: 5,
    coreNumber: 5,
    title: 'Refleksi Diri',
    subtitle: '',
    icon: Brain,
    imageSrc: logoMisiLatihanRefleksi,
    iconColor: 'text-emerald-400',
    iconGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    iconBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
    xpReward: 110,
    defaultStatus: 'locked',
  },
  {
    slotNumber: 6,
    coreNumber: 6,
    title: 'Asesmen Akhir',
    subtitle: '',
    icon: Trophy,
    imageSrc: logoMisiAsesmenAkhir,
    iconColor: 'text-yellow-400',
    iconGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    iconBg: 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300',
    xpReward: 130,
    defaultStatus: 'locked',
  },
];

export const MissionJourney: React.FC<MissionJourneyProps> = ({
  studentId: propStudentId,
  missions = [],
  progressList = [],
  almeRecommendation,
  studentName = 'Murid',
  className = 'XII-1',
  studentProfile,
  onOpenMission,
  onOpenLab,
  onRefreshData,
}) => {
  const studentId =
    propStudentId ||
    studentProfile?.student?.id ||
    (studentProfile?.user?.id ? (studentProfile.user.id.startsWith('std-') ? studentProfile.user.id : `std-${studentProfile.user.id}`) : 'std-01');

  // 1. Pilihan Mata Pelajaran (Matematika, Fisika, Kimia, Biologi, Matematika TL)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('tisenang_active_subject_id');
      if (saved && SUBJECT_OPTIONS.some((s) => s.id === saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'sbj-fisika';
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSemester, setActiveSemester] = useState<'1' | '2'>(() => storage.getActiveSemester());
  const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);

  const handleSelectSemester = (sem: '1' | '2') => {
    setActiveSemester(sem);
    setIsSemesterDropdownOpen(false);
    storage.setActiveSemester(sem, studentId);
    showToast(`Sem ${sem} dipilih. XP direset ke 0 untuk semester baru.`);
    if (onRefreshData) {
      onRefreshData();
    }
  };

  const selectedSubject = useMemo(() => {
    return SUBJECT_OPTIONS.find((s) => s.id === selectedSubjectId) || SUBJECT_OPTIONS[1];
  }, [selectedSubjectId]);

  // Online / Offline detection
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [tpRefreshKey, setTpRefreshKey] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => setTpRefreshKey((k) => k + 1);
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Tujuan Pembelajaran yang sudah diinput oleh guru untuk mata pelajaran aktif
  const availableTps = useMemo(() => {
    const all = storage.getTujuanPembelajaran();
    const filtered = all.filter((tp) => {
      if (tp.subjectId === selectedSubjectId) return true;
      if (selectedSubjectId === 'sbj-matematika' && (tp.code?.toUpperCase().includes('MAT') && !tp.code?.toUpperCase().includes('TL'))) return true;
      if (selectedSubjectId === 'sbj-fisika' && tp.code?.toUpperCase().includes('FIS')) return true;
      if (selectedSubjectId === 'sbj-kimia' && tp.code?.toUpperCase().includes('KIM')) return true;
      if (selectedSubjectId === 'sbj-biologi' && tp.code?.toUpperCase().includes('BIO')) return true;
      if (selectedSubjectId === 'sbj-mat-lanjut' && (tp.code?.toUpperCase().includes('TL') || tp.code?.toUpperCase().includes('LANJUT'))) return true;
      return false;
    });

    return filtered;
  }, [selectedSubjectId, tpRefreshKey]);

  const [selectedTpId, setSelectedTpId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('tisenang_active_tp_id');
      if (saved && availableTps.some((tp) => tp.id === saved)) {
        return saved;
      }
    } catch {}
    return availableTps[0]?.id || '';
  });
  const [isTpDropdownOpen, setIsTpDropdownOpen] = useState(false);

  useEffect(() => {
    if (availableTps.length === 0) {
      setSelectedTpId('');
      try {
        localStorage.removeItem('tisenang_active_tp_id');
        localStorage.removeItem('tisenang_active_tp_title');
        localStorage.removeItem('tisenang_active_tp_code');
      } catch {}
    } else if (!availableTps.some((tp) => tp.id === selectedTpId)) {
      setSelectedTpId(availableTps[0].id);
      try {
        localStorage.setItem('tisenang_active_tp_id', availableTps[0].id);
        localStorage.setItem('tisenang_active_tp_title', availableTps[0].title);
        localStorage.setItem('tisenang_active_tp_code', availableTps[0].code);
      } catch {}
    }
  }, [availableTps, selectedTpId]);

  const selectedTp = useMemo(() => {
    if (availableTps.length === 0 || !selectedTpId) return null;
    const found = availableTps.find((tp) => tp.id === selectedTpId) || null;
    if (found && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('tisenang_active_tp_id', found.id);
        localStorage.setItem('tisenang_active_tp_title', found.title);
        localStorage.setItem('tisenang_active_tp_code', found.code);
      } catch {}
    }
    return found;
  }, [availableTps, selectedTpId]);

  // Click-outside handling for all 3 dropdowns
  const mapelDropdownRef = useRef<HTMLDivElement>(null);
  const semesterDropdownRef = useRef<HTMLDivElement>(null);
  const tpDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (mapelDropdownRef.current && !mapelDropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(target)) {
        setIsSemesterDropdownOpen(false);
      }
      if (tpDropdownRef.current && !tpDropdownRef.current.contains(target)) {
        setIsTpDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // ALME Checkpoint Status
  const [activeAlmeCheckpoint, setActiveAlmeCheckpoint] = useState<1 | 2 | null>(null);
  const [almeRefreshTrigger, setAlmeRefreshTrigger] = useState(0);

  const isAlme1Completed = useMemo(() => {
    const key = `tisenang_alme_chk_${studentId}_${selectedSubjectId}_1`;
    try {
      return localStorage.getItem(key) === 'completed';
    } catch {
      return false;
    }
  }, [studentId, selectedSubjectId, almeRefreshTrigger]);

  const isAlme2Completed = useMemo(() => {
    const key = `tisenang_alme_chk_${studentId}_${selectedSubjectId}_2`;
    try {
      return localStorage.getItem(key) === 'completed';
    } catch {
      return false;
    }
  }, [studentId, selectedSubjectId, almeRefreshTrigger]);

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sisipan Misi Personal ALME yang unik untuk masing-masing murid sesuai asesmen diagnostik & progress
  const studentAlmeRecommendation = useMemo(() => {
    return almeRecommendation || storage.getAlmeRecommendation(studentId);
  }, [almeRecommendation, studentId, almeRefreshTrigger]);

  const [isAlmeMissionModalOpen, setIsAlmeMissionModalOpen] = useState(false);
  const [almeUserAnswers, setAlmeUserAnswers] = useState<Record<number, string>>({});
  const [almeSubmitted, setAlmeSubmitted] = useState(false);
  const checkAlmeMissionDone = (): boolean => {
    try {
      const idsToCheck = [
        studentId,
        studentProfile?.student?.id,
        studentProfile?.user?.id,
        `std-${studentProfile?.user?.id}`,
        studentProfile?.user?.id?.replace('usr-', ''),
        studentProfile?.user?.id?.replace('std-', ''),
      ].filter(Boolean) as string[];

      // 1. Cek semua variasi kunci localStorage
      for (const id of idsToCheck) {
        if (localStorage.getItem(`tisenang_alme_indiv_${id}_done`) === 'true') {
          return true;
        }
      }

      // 2. Cek list misi ALME individual di storage berdasarkan ID
      for (const id of idsToCheck) {
        const myAlme = storage.getAlmeIndividualMissions(id);
        if (Array.isArray(myAlme) && myAlme.some((m) => m.status === 'COMPLETED')) {
          return true;
        }
      }

      // 3. Cek seluruh koleksi misi ALME di storage
      const allAlme = storage.getAlmeIndividualMissions();
      const studentAlme = allAlme.filter((m) => idsToCheck.includes(m.studentId));
      if (studentAlme.length > 0 && studentAlme.some((m) => m.status === 'COMPLETED')) {
        return true;
      }

      // Jika ada misi ALME untuk murid ini dan tidak ada satupun yang statusnya PENDING
      if (studentAlme.length > 0 && !studentAlme.some((m) => m.status === 'PENDING')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const [isAlmeMissionDone, setIsAlmeMissionDone] = useState<boolean>(() => checkAlmeMissionDone());
  const [showAlmeRequiredPopup, setShowAlmeRequiredPopup] = useState<boolean>(false);

  useEffect(() => {
    setIsAlmeMissionDone(checkAlmeMissionDone());
  }, [studentId, almeRefreshTrigger]);

  const activeInterventionContent = useMemo(() => {
    const itype =
      studentAlmeRecommendation?.interventionType ||
      (studentAlmeRecommendation?.type?.toLowerCase().includes('remedial')
        ? 'remedial'
        : studentAlmeRecommendation?.type?.toLowerCase().includes('pengayaan')
        ? 'pengayaan'
        : studentAlmeRecommendation?.type?.toLowerCase().includes('numerasi')
        ? 'soal_numerasi'
        : studentAlmeRecommendation?.type?.toLowerCase().includes('literasi')
        ? 'soal_literasi'
        : 'latihan_soal');
    return AlmeEngine.getInterventionContent(itype as any, selectedSubject?.name || 'Fisika', selectedTp);
  }, [studentAlmeRecommendation, selectedSubject?.name, selectedTp]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Helper to check whether a mission matches the selected TP
  const matchesTp = (m: Mission, targetTp?: TujuanPembelajaran | null): boolean => {
    if (!targetTp) return true;
    if (m.tpId && targetTp.id && m.tpId === targetTp.id) return true;
    if (m.tpCode && targetTp.code && m.tpCode.trim().toLowerCase() === targetTp.code.trim().toLowerCase()) return true;
    if (!m.tpId && !m.tpCode) return true;
    return false;
  };

  // Helper to retrieve the matching teacher mission object for each card slot based on Subject AND TP
  const getMissionForSlot = (slot: CardSpec): Mission => {
    const isMatchingSubject = (m: Mission): boolean => {
      if (m.subjectId === selectedSubjectId) return true;
      if (
        selectedSubject?.name &&
        m.subjectName &&
        m.subjectName.toLowerCase().trim() === selectedSubject.name.toLowerCase().trim()
      ) {
        return true;
      }
      return false;
    };

    // 1. Direct match with subject, coreMissionNumber, AND selected TP
    const exactMatch = missions.find(
      (m) =>
        isMatchingSubject(m) &&
        m.coreMissionNumber === slot.coreNumber &&
        matchesTp(m, selectedTp),
    );
    if (exactMatch) return exactMatch;

    // 2. Direct match with subject and coreMissionNumber
    const subjectMatch = missions.find(
      (m) => isMatchingSubject(m) && m.coreMissionNumber === slot.coreNumber,
    );
    if (subjectMatch) return subjectMatch;

    // Specialty check for slot 2 (Selesaikan Masalah) within selected subject
    if (slot.slotNumber === 2) {
      const masalahMatch = missions.find(
        (m) =>
          isMatchingSubject(m) &&
          (m.missionCategory === 'selesaikan_masalah' ||
            m.coreTitle?.toLowerCase().includes('masalah') ||
            m.title?.toLowerCase().includes('masalah')),
      );
      if (masalahMatch) {
        return {
          ...masalahMatch,
          coreMissionNumber: 2,
          subjectId: selectedSubjectId,
          subjectName: selectedSubject?.name || masalahMatch.subjectName,
          tpId: selectedTp?.id,
          tpCode: selectedTp?.code,
        };
      }
    }

    // Specialty check for slot 3 (Eksperimen / Simulasi) within selected subject
    if (slot.slotNumber === 3) {
      const eksperimenMatch = missions.find(
        (m) =>
          isMatchingSubject(m) &&
          (m.missionCategory === 'simulasi' ||
            m.coreTitle?.toLowerCase().includes('eksperimen') ||
            m.coreTitle?.toLowerCase().includes('simulasi') ||
            m.title?.toLowerCase().includes('eksperimen')),
      );
      if (eksperimenMatch) {
        return {
          ...eksperimenMatch,
          coreMissionNumber: 3,
          subjectId: selectedSubjectId,
          subjectName: selectedSubject?.name || eksperimenMatch.subjectName,
          tpId: selectedTp?.id,
          tpCode: selectedTp?.code,
        };
      }
    }

    // For slot 6 (Asesmen Akhir) within selected subject
    if (slot.slotNumber === 6) {
      const sumatifMatch = missions.find(
        (m) => isMatchingSubject(m) && ((m.coreMissionNumber as any) === 7 || m.coreMissionNumber === 6),
      );
      if (sumatifMatch) {
        return {
          ...sumatifMatch,
          subjectId: selectedSubjectId,
          subjectName: selectedSubject?.name || sumatifMatch.subjectName,
          tpId: selectedTp?.id,
          tpCode: selectedTp?.code,
        };
      }
    }

    // 3. Fallback safe mission object strictly tied to active Subject and active TP
    const tpSuffix = selectedTp?.code ? `-${selectedTp.code.toLowerCase()}` : '';
    return {
      id: `msn-${selectedSubjectId}${tpSuffix}-${slot.slotNumber}`,
      coreMissionNumber: slot.coreNumber as any,
      coreTitle: slot.title,
      title: slot.title,
      description: '',
      status: 'PUBLISHED',
      subjectId: selectedSubjectId,
      subjectName: selectedSubject?.name || 'MIPA',
      tpId: selectedTp?.id,
      tpCode: selectedTp?.code,
      classId: className,
      className: className,
      xpReward: slot.xpReward,
      createdAt: new Date().toISOString(),
    };
  };

  // 2. Evaluate card states strictly per Subject and per TP
  const evaluatedCards = useMemo(() => {
    // Helper pengecekan penyelesaian misi strictly per mapel dan TP yang sedang aktif
    const isMissionCompleted = (missionObj: Mission, slotNum: number): boolean => {
      // 1. Cek langsung dari progressList berdasarkan exact mission id
      if (
        progressList.some(
          (p) => p.status === 'COMPLETED' && (p.missionId === missionObj.id || (missionObj.id && p.missionId?.includes(missionObj.id))),
        )
      ) {
        return true;
      }

      // 2. Cek progress yang secara eksplisit mencocokkan coreMissionNumber, subjectId, dan TP
      return progressList.some((p) => {
        if (p.status !== 'COMPLETED') return false;
        const matched = missions.find((m) => m.id === p.missionId);
        if (!matched) return false;

        if (matched.coreMissionNumber !== slotNum) return false;

        const sameSubject =
          matched.subjectId === selectedSubjectId ||
          (selectedSubject?.name &&
            matched.subjectName &&
            matched.subjectName.toLowerCase().trim() === selectedSubject.name.toLowerCase().trim());
        if (!sameSubject) return false;

        // Cek kecocokan TP
        if (selectedTp) {
          if (matched.tpId && selectedTp.id && matched.tpId === selectedTp.id) return true;
          if (matched.tpCode && selectedTp.code && matched.tpCode.trim().toLowerCase() === selectedTp.code.trim().toLowerCase()) return true;
          if (!matched.tpId && !matched.tpCode) return true;
          return false;
        }

        return true;
      });
    };

    // Evaluasi spesifik untuk slot 1..6 pada mata pelajaran dan TP aktif ini
    const m1Obj = getMissionForSlot(MISSION_CARDS_SPEC[0]);
    const m2Obj = getMissionForSlot(MISSION_CARDS_SPEC[1]);
    const m3Obj = getMissionForSlot(MISSION_CARDS_SPEC[2]);
    const m4Obj = getMissionForSlot(MISSION_CARDS_SPEC[3]);
    const m5Obj = getMissionForSlot(MISSION_CARDS_SPEC[4]);
    const m6Obj = getMissionForSlot(MISSION_CARDS_SPEC[5]);

    const isM1Done = isMissionCompleted(m1Obj, 1);
    const isM2Done = isMissionCompleted(m2Obj, 2);
    const isM3Done = isMissionCompleted(m3Obj, 3) || isM2Done;
    const isM4Done = isMissionCompleted(m4Obj, 4);
    const isM5Done = isMissionCompleted(m5Obj, 5);
    const isM6Done = isMissionCompleted(m6Obj, 6);

    return MISSION_CARDS_SPEC.map((spec) => {
      const mission = getMissionForSlot(spec);
      const isCompleted = isMissionCompleted(mission, spec.slotNumber);

      let status: 'completed' | 'recommended' | 'locked' | 'available' = 'locked';

      if (!selectedTp) {
        // Ketika TP belum ditambahkan, keseluruhan misi tetap terbuka untuk akses belajar offline mandiri
        status = isCompleted ? 'completed' : spec.slotNumber === 1 ? 'recommended' : 'available';
      } else {
        if (spec.slotNumber === 1) {
          status = isCompleted ? 'completed' : 'recommended';
        } else if (spec.slotNumber === 2) {
          if (isCompleted) {
            status = 'completed';
          } else if (isM1Done) {
            status = 'recommended';
          } else {
            status = 'locked';
          }
        } else if (spec.slotNumber === 3) {
          if (isCompleted) {
            status = 'completed';
          } else if (isM2Done) {
            status = 'available';
          } else {
            status = 'locked';
          }
        } else if (spec.slotNumber === 4) {
          if (isCompleted) {
            status = 'completed';
          } else if (isM3Done || isM2Done) {
            status = 'recommended';
          } else {
            status = 'locked';
          }
        } else if (spec.slotNumber === 5) {
          if (isCompleted) {
            status = 'completed';
          } else if (isM4Done) {
            status = 'recommended';
          } else {
            status = 'locked';
          }
        } else if (spec.slotNumber === 6) {
          if (isCompleted) {
            status = 'completed';
          } else if (isM5Done) {
            status = 'recommended';
          } else if (isM4Done) {
            status = 'available';
          } else {
            status = 'locked';
          }
        }
      }

      return {
        ...spec,
        mission,
        status,
      };
    });
  }, [missions, progressList, selectedSubjectId, selectedSubject, selectedTp, studentId, studentProfile]);

  // Statistics: ⚡ PENGALAMAN & 🔥 KONSISTENSI
  const totalXp = studentProfile?.xp ?? 800;
  const streakDays = studentProfile?.streakDays ?? 7;

  // Handle Card Click
  const handleCardClick = (card: (typeof evaluatedCards)[0]) => {
    // Jika belum ada TP (akses offline mandiri), seluruh misi tetap bisa terbuka langsung
    if (!selectedTp) {
      if (card.slotNumber === 3 || card.title.includes('EKSPERIMEN')) {
        if (onOpenLab) {
          onOpenLab();
          return;
        }
      }
      onOpenMission(card.mission);
      return;
    }

    const card4 = evaluatedCards.find((c) => c.slotNumber === 4);
    const isCard4Completed = card4?.status === 'completed';
    const card5 = evaluatedCards.find((c) => c.slotNumber === 5);
    const isCard5Completed = card5?.status === 'completed';

    // 1. Cek Khusus Asesmen Akhir (Slot 6): Otomatis terbuka saat Misi 4 selesai
    if (
      card.slotNumber === 6 ||
      card.title?.toLowerCase().includes('asesmen akhir') ||
      card.mission?.coreMissionNumber === 6 ||
      card.mission?.missionCategory === 'asesmen'
    ) {
      if (!isCard4Completed && !isCard5Completed && card.status === 'locked') {
        showToast('Selesaikan Misi 4 (Game Edukasi) pada mata pelajaran & TP ini terlebih dahulu untuk membuka Asesmen Akhir!');
        return;
      }
      onOpenMission(card.mission);
      return;
    }

    // If Card 3 (Eksperimen / Simulasi) is clicked
    if (card.slotNumber === 3 || card.title.includes('EKSPERIMEN')) {
      if (card.status === 'locked') {
        showToast('Selesaikan Misi 2 (Selesaikan Masalah) pada mata pelajaran & TP ini untuk membuka Eksperimen / Simulasi!');
        return;
      }
      if (onOpenLab) {
        onOpenLab();
        return;
      }
      onOpenMission(card.mission);
      return;
    }

    if (card.status === 'locked') {
      if (card.slotNumber === 5 || card.slotNumber === 6) {
        showToast('Selesaikan Misi 4 (Game Edukasi) pada mata pelajaran & TP ini terlebih dahulu untuk membuka misi ini!');
        return;
      }
      showToast('Selesaikan misi sebelumnya pada mata pelajaran & TP ini untuk membuka misi ini!');
      return;
    }

    onOpenMission(card.mission);
  };

  // Overall mission completion telemetry
  const completedMissionsCount = useMemo(() => {
    return evaluatedCards.filter((c) => c.status === 'completed').length;
  }, [evaluatedCards]);

  const progressPercentage = Math.round((completedMissionsCount / evaluatedCards.length) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center select-none px-3 sm:px-4 py-2 pb-28 sm:pb-32 relative">
      {/* Ambient living background glow accents & subtle floating shapes */}
      <div className="pointer-events-none absolute -top-14 left-1/4 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-12 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl animate-float-delayed" />
      <div className="pointer-events-none absolute top-10 right-10 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-ping opacity-60" />
      <div className="pointer-events-none absolute bottom-28 left-8 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d] animate-pulse opacity-70" />

      {/* 1. HEADER (Compact, Clean Learning Progress) */}
      <header className="flex flex-col items-center justify-center text-center shrink-0 z-10 w-full max-w-lg mx-auto mb-1">
        <div className="flex items-center justify-between w-full px-3.5 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-tight">Progres Misi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-emerald-300">{completedMissionsCount}/6 Selesai</span>
            <div className="w-20 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(12, progressPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* 3. PILIHAN MATA PELAJARAN, SEMESTER & TUJUAN PEMBELAJARAN (1 BARIS KOMPAK) */}
      <div className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 my-1.5 shrink-0 z-40 max-w-full px-1 overflow-visible">
        {/* Dropdown Pilihan Mata Pelajaran */}
        <div className="relative inline-block text-left shrink-0" ref={mapelDropdownRef}>
          <button
            type="button"
            id="btn-pilihan-mata-pelajaran"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen((prev) => !prev);
              setIsTpDropdownOpen(false);
              setIsSemesterDropdownOpen(false);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-blue-400/80 text-white shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer max-w-[140px] sm:max-w-xs"
          >
            <span className="text-xs sm:text-sm shrink-0">📚</span>
            <span className="text-[11px] sm:text-xs font-bold text-blue-200 truncate">
              {selectedSubject?.name || 'Fisika'}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-300 shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu Mata Pelajaran */}
          {isDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-48 sm:w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1.5 overflow-hidden"
            >
              {SUBJECT_OPTIONS.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSubjectId(sub.id);
                      try {
                        localStorage.setItem('tisenang_active_subject_id', sub.id);
                        localStorage.setItem('tisenang_active_subject_name', sub.name);
                      } catch {
                        // ignore
                      }
                      // Cek apakah mata pelajaran yang diklik sudah memiliki TP
                      const all = storage.getTujuanPembelajaran();
                      const hasTp = all.some((tp) => {
                        if (tp.subjectId === sub.id) return true;
                        if (sub.id === 'sbj-matematika' && (tp.code?.toUpperCase().includes('MAT') && !tp.code?.toUpperCase().includes('TL'))) return true;
                        if (sub.id === 'sbj-fisika' && tp.code?.toUpperCase().includes('FIS')) return true;
                        if (sub.id === 'sbj-kimia' && tp.code?.toUpperCase().includes('KIM')) return true;
                        if (sub.id === 'sbj-biologi' && tp.code?.toUpperCase().includes('BIO')) return true;
                        if (sub.id === 'sbj-mat-lanjut' && (tp.code?.toUpperCase().includes('TL') || tp.code?.toUpperCase().includes('LANJUT'))) return true;
                        return false;
                      });
                      if (!hasTp) {
                        setSelectedTpId('');
                        try {
                          localStorage.removeItem('tisenang_active_tp_id');
                          localStorage.removeItem('tisenang_active_tp_title');
                          localStorage.removeItem('tisenang_active_tp_code');
                        } catch {}
                      }
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 text-blue-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium">{sub.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dropdown Pilihan Semester (Sem 1 / Sem 2) */}
        <div className="relative inline-block text-left shrink-0" ref={semesterDropdownRef}>
          <button
            type="button"
            id="btn-pilihan-semester"
            onClick={(e) => {
              e.stopPropagation();
              setIsSemesterDropdownOpen((prev) => !prev);
              setIsDropdownOpen(false);
              setIsTpDropdownOpen(false);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/80 text-white shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <span className="text-xs sm:text-sm shrink-0">🗓️</span>
            <span className="text-[11px] sm:text-xs font-bold text-amber-200">
              Sem {activeSemester}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-300 shrink-0 transition-transform duration-200 ${
                isSemesterDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu Semester */}
          {isSemesterDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-32 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1.5 overflow-hidden"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectSemester('1');
                }}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                  activeSemester === '1'
                    ? 'bg-amber-600/30 text-amber-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-xs sm:text-sm font-medium">Sem 1</span>
                {activeSemester === '1' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectSemester('2');
                }}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                  activeSemester === '2'
                    ? 'bg-amber-600/30 text-amber-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-xs sm:text-sm font-medium">Sem 2</span>
                {activeSemester === '2' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Pilihan Tujuan Pembelajaran */}
        <div className="relative inline-block text-left shrink-0" ref={tpDropdownRef}>
          <button
            type="button"
            id="btn-pilihan-tujuan-pembelajaran"
            onClick={(e) => {
              e.stopPropagation();
              if (availableTps.length === 0) return;
              setIsTpDropdownOpen((prev) => !prev);
              setIsDropdownOpen(false);
              setIsSemesterDropdownOpen(false);
              setTpRefreshKey((k) => k + 1);
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-purple-400/80 text-white shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer max-w-[140px] sm:max-w-xs ${
              !selectedTp ? 'opacity-80' : ''
            }`}
          >
            <span className="text-xs sm:text-sm shrink-0">🎯</span>
            <span className="text-[11px] sm:text-xs font-bold text-purple-200 truncate">
              {selectedTp ? selectedTp.code : ''}
            </span>
            {selectedTp && (
              <ChevronDown
                className={`w-3 h-3 text-slate-300 shrink-0 transition-transform duration-200 ${
                  isTpDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {/* Dropdown Menu Tujuan Pembelajaran */}
          {isTpDropdownOpen && selectedTp && availableTps.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-72 sm:w-80 max-h-72 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1.5 overflow-x-hidden"
            >
              {availableTps.map((tp) => {
                const isSelected = tp.id === selectedTpId;
                return (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTpId(tp.id);
                      setIsTpDropdownOpen(false);
                      showToast(`TP aktif: ${tp.code}`);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex flex-col gap-0.5 transition-colors cursor-pointer border-b border-slate-800/50 last:border-0 ${
                      isSelected
                        ? 'bg-purple-600/30 text-purple-200 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-purple-300 font-mono">
                        {tp.code}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    </div>
                    <span className="text-xs font-medium leading-snug">{tp.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-800/95 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SISIPAN MISI INDIVIDU DARI ALME (Ringkas, Hanya Muncul Jika TP Aktif Ada) */}
      {selectedTp && (
        <div className="w-full max-w-5xl mx-auto px-1">
          <div
            onClick={() => {
              setAlmeSubmitted(false);
              setIsAlmeMissionModalOpen(true);
            }}
            className={`relative overflow-hidden rounded-2xl p-2.5 sm:p-3 px-3 sm:px-4 flex items-center justify-between gap-3 border transition-all cursor-pointer select-none active:scale-[0.99] ${
              isAlmeMissionDone
                ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400'
                : activeInterventionContent.type === 'remedial'
                ? 'bg-gradient-to-r from-amber-950/80 via-rose-950/70 to-purple-950/70 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:border-amber-300'
                : activeInterventionContent.type === 'pengayaan'
                ? 'bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-cyan-950/70 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:border-cyan-300'
                : 'bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-sky-950/70 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isAlmeMissionDone
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
                    : 'bg-amber-400/20 border-amber-400/50 text-amber-300 animate-pulse'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Rekomendasi:{' '}
                    {activeInterventionContent.type === 'remedial'
                      ? 'Remedial'
                      : activeInterventionContent.type === 'pengayaan'
                      ? 'Pengayaan'
                      : activeInterventionContent.type === 'soal_literasi'
                      ? 'Literasi'
                      : activeInterventionContent.type === 'soal_numerasi'
                      ? 'Numerasi'
                      : 'Latihan'}
                  </span>
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.2 rounded-md">
                    +120 XP
                  </span>
                  {isAlmeMissionDone && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Selesai
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                  {activeInterventionContent.title}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all inline-flex items-center justify-center min-h-[36px] ${
                  isAlmeMissionDone
                    ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                }`}
              >
                {isAlmeMissionDone ? 'Buka' : 'Kerjakan'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. KOTAK-KOTAK MISI DIPERKECIL (Grid Kompak 3x2, Tetap Terbuka untuk Akses Offline) */}
      <div className="w-full max-w-[760px] mx-auto grid grid-rows-2 gap-2 sm:gap-2.5 my-1.5 shrink-0">
        {/* BARIS 1: PAHAMI KONSEP, SELESAIKAN MASALAH, EKSPERIMEN / SIMULASI */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-stretch">
          {evaluatedCards.slice(0, 3).map((card) => {
            const isCompleted = card.status === 'completed';
            const isRecommended = card.status === 'recommended'; // Card 2 - Featured
            const isLocked = card.status === 'locked';

            return (
              <div
                key={card.slotNumber}
                onClick={() => handleCardClick(card)}
                className={`relative group flex flex-col justify-between p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 select-none overflow-hidden h-[122px] sm:h-[130px] md:h-[138px] ${
                  isRecommended
                    ? 'shimmer-effect animate-glow-pulse bg-gradient-to-b from-slate-900/95 via-slate-800/95 to-slate-900/95 border-2 border-amber-400/90 shadow-[0_0_28px_rgba(245,158,11,0.38)] hover:border-amber-300 hover:shadow-[0_0_42px_rgba(245,158,11,0.58)] hover:-translate-y-1 hover:scale-[1.02] ring-1 ring-amber-400/40 cursor-pointer active:scale-98'
                    : isCompleted
                    ? 'bg-gradient-to-b from-slate-900/95 via-emerald-950/30 to-slate-900/95 border border-emerald-500/70 shadow-[0_4px_20px_rgba(16,185,129,0.28)] hover:border-emerald-400 hover:shadow-[0_6px_26px_rgba(16,185,129,0.4)] hover:-translate-y-1 hover:scale-[1.015] cursor-pointer active:scale-98'
                    : isLocked
                    ? 'bg-slate-900/75 border border-slate-800/80 backdrop-blur-xs opacity-65 hover:opacity-85 hover:border-slate-700/80 cursor-pointer active:scale-98 transition-all'
                    : 'bg-gradient-to-b from-slate-900/95 via-blue-950/30 to-slate-900/95 border border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.26)] hover:border-blue-400 hover:shadow-[0_6px_26px_rgba(59,130,246,0.38)] hover:-translate-y-1 hover:scale-[1.015] cursor-pointer active:scale-98'
                }`}
              >
                {/* Visual Glow & Sheen (+10% opacity) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Top Badge: Misi + XP */}
                <div className="flex items-center justify-between w-full shrink-0">
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono font-bold tracking-tight ${
                      isRecommended ? 'text-amber-300 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    Misi {card.slotNumber}
                  </span>
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-amber-400">
                    <Zap className="w-2.5 h-2.5 fill-amber-400" />
                    <span>+{card.xpReward} XP</span>
                  </div>
                </div>

                {/* Center: Logo Image + Short Title */}
                <div className="flex flex-col items-center text-center my-auto">
                  <div
                    className={`w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] md:w-[42px] md:h-[42px] rounded-xl overflow-hidden flex items-center justify-center border transition-all duration-300 group-hover:scale-105 shadow-md ${
                      isRecommended
                        ? 'border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/60'
                        : isCompleted
                        ? 'border-emerald-400/80 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                        : isLocked
                        ? 'border-slate-700/60 opacity-70 grayscale-[0.4]'
                        : 'border-blue-400/70 shadow-[0_0_14px_rgba(59,130,246,0.4)]'
                    }`}
                  >
                    <img
                      src={card.imageSrc}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <h2 className="text-[11px] sm:text-xs font-bold text-white tracking-tight leading-snug mt-1 font-display line-clamp-1">
                    {card.title}
                  </h2>
                </div>

                {/* Bottom: Status Badge */}
                <div className="shrink-0 pt-0.5">
                  {isRecommended ? (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[9px] sm:text-[10px] font-bold shadow-md shadow-amber-500/30">
                      <Star className="w-2.5 h-2.5 fill-slate-950 stroke-slate-950" />
                      <span>Rekomendasi</span>
                    </div>
                  ) : isCompleted ? (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-[9px] sm:text-[10px] font-bold shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Selesai</span>
                    </div>
                  ) : isLocked ? (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[9px] sm:text-[10px] font-medium">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Terkunci</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-blue-500/20 border border-blue-400/50 text-blue-300 text-[9px] sm:text-[10px] font-bold group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Mulai</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* BARIS 2: GAME, LATIHAN & REFLEKSI, ASESMEN AKHIR */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-stretch">
          {evaluatedCards.slice(3, 6).map((card) => {
            const isCompleted = card.status === 'completed';
            const isRecommended = card.status === 'recommended';
            const isLocked = card.status === 'locked';

            return (
              <div
                key={card.slotNumber}
                onClick={() => handleCardClick(card)}
                className={`relative group flex flex-col justify-between p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 select-none overflow-hidden h-[122px] sm:h-[130px] md:h-[138px] ${
                  isCompleted
                    ? 'bg-gradient-to-b from-slate-900/95 via-emerald-950/30 to-slate-900/95 border border-emerald-500/70 shadow-[0_4px_20px_rgba(16,185,129,0.28)] hover:border-emerald-400 hover:shadow-[0_6px_26px_rgba(16,185,129,0.4)] hover:-translate-y-1 hover:scale-[1.015] cursor-pointer active:scale-98'
                    : isRecommended
                    ? 'shimmer-effect animate-glow-pulse bg-gradient-to-b from-slate-900/95 via-slate-800/95 to-slate-900/95 border-2 border-amber-400/90 shadow-[0_0_28px_rgba(245,158,11,0.38)] hover:border-amber-300 hover:shadow-[0_0_42px_rgba(245,158,11,0.58)] hover:-translate-y-1 hover:scale-[1.02] ring-1 ring-amber-400/40 cursor-pointer active:scale-98'
                    : isLocked
                    ? 'bg-slate-900/75 border border-slate-800/80 backdrop-blur-xs opacity-65 hover:opacity-85 hover:border-slate-700/80 cursor-pointer active:scale-98 transition-all'
                    : 'bg-gradient-to-b from-slate-900/95 via-blue-950/30 to-slate-900/95 border border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.26)] hover:border-blue-400 hover:shadow-[0_6px_26px_rgba(59,130,246,0.38)] hover:-translate-y-1 hover:scale-[1.015] cursor-pointer active:scale-98'
                }`}
              >
                {/* Visual Glow & Sheen (+10% opacity) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Top Badge: Misi + XP */}
                <div className="flex items-center justify-between w-full shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-tight text-slate-400">
                    Misi {card.slotNumber}
                  </span>
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-amber-400">
                    <Zap className="w-2.5 h-2.5 fill-amber-400" />
                    <span>+{card.xpReward} XP</span>
                  </div>
                </div>

                {/* Center: Logo Image + Short Title */}
                <div className="flex flex-col items-center text-center my-auto">
                  <div
                    className={`w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] md:w-[42px] md:h-[42px] rounded-xl overflow-hidden flex items-center justify-center border transition-all duration-300 group-hover:scale-105 shadow-md ${
                      isCompleted
                        ? 'border-emerald-400/80 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                        : isLocked
                        ? 'border-slate-700/60 opacity-70 grayscale-[0.4]'
                        : 'border-blue-400/70 shadow-[0_0_14px_rgba(59,130,246,0.4)]'
                    }`}
                  >
                    <img
                      src={card.imageSrc}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <h2 className="text-[11px] sm:text-xs font-bold text-white tracking-tight leading-snug mt-1 font-display line-clamp-1">
                    {card.title}
                  </h2>
                </div>

                {/* Bottom: Status Badge */}
                <div className="shrink-0 pt-0.5">
                  {isCompleted ? (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-[9px] sm:text-[10px] font-bold shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Selesai</span>
                    </div>
                  ) : isLocked ? (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[9px] sm:text-[10px] font-medium">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Terkunci</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 py-0.5 px-2 rounded-lg bg-blue-500/20 border border-blue-400/50 text-blue-300 text-[9px] sm:text-[10px] font-bold group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Mulai</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SWITCHER NAVIGASI HALAMAN BAWAH [MISI] [LAB EKSPERIMEN] */}
      <div className="flex items-center justify-center shrink-0 pt-2 pb-3 z-20">
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg">
          <button
            id="btn-subnav-misi"
            className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-blue-400/50 active:scale-95 cursor-pointer min-h-[40px]"
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Misi Belajar</span>
          </button>
          <button
            id="btn-subnav-eksperimen"
            onClick={() => {
              if (onOpenLab) onOpenLab();
            }}
            className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 cursor-pointer min-h-[40px] group"
          >
            <FlaskConical className="w-4 h-4 text-cyan-300 group-hover:scale-105 transition-transform" />
            <span>Lab Eksperimen</span>
          </button>
        </div>
      </div>

      {/* ALME Recommendation Pop-up Modal */}
      {activeAlmeCheckpoint && (
        <AlmePopupModal
          isOpen={true}
          onClose={() => setActiveAlmeCheckpoint(null)}
          checkpointNumber={activeAlmeCheckpoint}
          studentId={studentId}
          studentName={studentName}
          subjectId={selectedSubjectId}
          subjectName={selectedSubject?.name || 'MIPA'}
          onCompleted={(rewardXp) => {
            setAlmeRefreshTrigger((prev) => prev + 1);
            if (onRefreshData) onRefreshData();
            showToast(`⭐ Misi Rekomendasi ALME 0${activeAlmeCheckpoint} Selesai! +${rewardXp} XP`);
          }}
        />
      )}

      {/* Modal Sisipan Misi Personal ALME (Adaptif per individu dibuat otomatis oleh AI berdasarkan progress murid) */}
      {isAlmeMissionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-4xl sm:max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto">
            {/* Header Modal */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                    <span>AI Adaptive Learning Engine (ALME)</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-black">
                      {activeInterventionContent.type === 'remedial'
                        ? 'REMEDIAL'
                        : activeInterventionContent.type === 'pengayaan'
                        ? 'PENGAYAAN'
                        : activeInterventionContent.type === 'soal_literasi'
                        ? 'SOAL LITERASI'
                        : activeInterventionContent.type === 'soal_numerasi'
                        ? 'SOAL NUMERASI'
                        : 'LATIHAN SOAL'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[9px] font-black">
                      📚 {selectedSubject?.name || 'Fisika'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[9px] font-black">
                      🎯 {selectedTp?.code || 'TP-01'}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-display font-extrabold text-white line-clamp-1">
                    {activeInterventionContent.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAlmeMissionModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Soal dan Analisis AI */}
            <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto text-xs text-slate-300 flex-1">
              {/* Box Info Analisis AI Berdasarkan Progress */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-1">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Rekomendasi AI Otomatis Berdasarkan Progress: {studentName}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {studentAlmeRecommendation?.whyExplanation ||
                    studentAlmeRecommendation?.reason ||
                    activeInterventionContent.summary}
                </p>
                <div className="text-[10px] text-amber-300/80 italic">
                  💡 {activeInterventionContent.instructions}
                </div>
              </div>

              {/* Daftar Soal Interaktif */}
              <div className="space-y-3">
                {activeInterventionContent.questions.map((q, qIdx) => {
                  const selected = almeUserAnswers[qIdx];
                  const isAnswered = selected !== undefined;
                  const isCorrect = selected === q.correctAnswer;

                  return (
                    <div
                      key={qIdx}
                      className="p-3 sm:p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                          Soal {qIdx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-white whitespace-pre-line leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Pilihan Jawaban - Grid 2 Kolom untuk menghemat tinggi */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        {(q.options || []).map((opt, optIdx) => {
                          const isOptionSelected = selected === opt;
                          const showCorrectness = isAnswered;
                          const isThisCorrect = opt === q.correctAnswer;

                          let btnStyle =
                            'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800/80';

                          if (showCorrectness) {
                            if (isThisCorrect) {
                              btnStyle =
                                'bg-emerald-950/60 border-emerald-500/80 text-emerald-200 font-semibold shadow-xs shadow-emerald-500/20';
                            } else if (isOptionSelected) {
                              btnStyle =
                                'bg-rose-950/60 border-rose-500/80 text-rose-200 font-semibold';
                            }
                          } else if (isOptionSelected) {
                            btnStyle =
                              'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                setAlmeUserAnswers((prev) => ({
                                  ...prev,
                                  [qIdx]: opt,
                                }));
                              }}
                              className={`w-full text-left p-2 sm:p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2 cursor-pointer ${btnStyle}`}
                            >
                              <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="leading-snug">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Pembahasan / Penjelasan AI */}
                      {isAnswered && (
                        <div
                          className={`p-2 sm:p-2.5 rounded-xl text-[11px] border leading-relaxed ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5 mb-0.5">
                            {isCorrect ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Jawaban Benar!</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>Penjelasan Konsep:</span>
                              </>
                            )}
                          </div>
                          <p className="text-slate-300">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Target & Reward */}
              <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="text-[10px] text-slate-400">Target Belajar</div>
                  <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5 uppercase">
                    {activeInterventionContent.type.replace('_', ' ')}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div className="text-[10px] text-slate-400">Bonus Hadiah</div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">+120 XP & Badge</div>
                </div>
              </div>
            </div>

            {/* Footer Modal - Selalu terlihat jelas dengan tombol KIRIM */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 flex items-center justify-between sm:justify-end gap-3 bg-slate-900 shrink-0 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setIsAlmeMissionModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Tutup
              </button>
              <button
                id="btn-kirim-misi-alme"
                type="button"
                onClick={() => {
                  try {
                    const idsToSave = [
                      studentId,
                      studentProfile?.student?.id,
                      studentProfile?.user?.id,
                      studentProfile?.user?.id ? `std-${studentProfile.user.id}` : undefined,
                      studentProfile?.user?.id?.replace('usr-', ''),
                      studentProfile?.user?.id?.replace('std-', ''),
                    ].filter(Boolean) as string[];

                    idsToSave.forEach((id) => {
                      localStorage.setItem(`tisenang_alme_indiv_${id}_done`, 'true');
                      storage.markAllAlmeIndividualMissionsCompleted(id);
                    });
                  } catch {}
                  setIsAlmeMissionDone(true);
                  setIsAlmeMissionModalOpen(false);
                  showToast('🎉 Selamat! Misi Penguatan ALME berhasil dikirim & diselesaikan (+120 XP)');
                  if (onRefreshData) onRefreshData();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isAlmeMissionDone ? 'Kirim / Selesai' : 'Kirim Misi Penguatan ALME (+120 XP)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* POP UP KETIKA ASESMEN AKHIR DIKLIK SEBELUM MENYELESAIKAN MISI PENGUATAN ALME */}
      {showAlmeRequiredPopup && (
        <div
          id="modal-alme-required-popup"
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full mx-auto shadow-2xl border border-amber-200 text-center flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300/80 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-wide text-center leading-snug">
              KERJAKAN MISI PENGUATAN ALME TERLEBIH DAHULU !
            </div>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Asesmen Akhir (Misi 6) baru dapat dibuka setelah Anda menyelesaikan misi penguatan adaptif ALME.
            </p>
            <div className="w-full flex flex-col gap-2 pt-1">
              <button
                id="btn-open-alme-from-popup"
                type="button"
                onClick={() => {
                  setShowAlmeRequiredPopup(false);
                  setIsAlmeMissionModalOpen(true);
                }}
                className="w-full py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buka Misi Penguatan ALME Sekarang</span>
              </button>
              <button
                id="btn-close-alme-required-popup"
                type="button"
                onClick={() => setShowAlmeRequiredPopup(false)}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
