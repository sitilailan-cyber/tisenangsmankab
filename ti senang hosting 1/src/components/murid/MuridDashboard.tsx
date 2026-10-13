import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  Flame,
  Award,
  ArrowRight,
  X,
  Target,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  ChevronRight,
  Compass,
  Cpu,
  MapPin,
  Home,
  User,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { DashboardGuideBanner } from '../common/DashboardGuideBanner';
import { User as UserType, Mission, StudentProgress, PortfolioItem } from '../../types';
import { storage, generateCurriculumMissionsTemplate } from '../../services/storage';
import { firebaseRealtime } from '../../services/firebaseRealtime';
import { firestoreCache } from '../../services/firestoreCacheService';
import { MuridBottomNav, MuridTabType } from './MuridBottomNav';
import { MissionJourney } from './MissionJourney';
import { Misi1PahamiKonsep } from './Misi1PahamiKonsep';
import { Misi2Eksplorasi } from './Misi2Eksplorasi';
import { Misi4Game } from './Misi4Game';
import { Misi5Refleksi } from './Misi5Refleksi';
import { Misi6Asesmen } from './Misi6Asesmen';
import { VirtualLab } from './VirtualLab';
import { DeviceCenter } from './DeviceCenter';
import { TemanBerpikirAI } from './TemanBerpikirAI';
import { MuridBeranda } from './MuridBeranda';
import { MuridProfil } from './MuridProfil';
import { MisiInteractiveRunner } from './MisiInteractiveRunner';
import logoTiSenang from '../../assets/images/logo_ti_senang.png';
import bgMisi from '../../assets/images/bg_misi.jpg';
import { AlmeEngine } from '../../services/alme/almeEngine';
import { AlmeRecommendation } from '../../types';
import { joyfulGameMusic } from '../../services/audio/joyfulGameMusic';
import { getOptimizedImageUrl, STUDENT_DRIVE_FOLDER_URL } from '../../utils/googleDrive';

const RAW_MISSION_BG = 'https://raw.githubusercontent.com/sitilailan-cyber/bgmisi/02dce2d950de3a83b216246bd43ef54dd005cd78/Gemini_Generated_Image_tq0dr7tq0dr7tq0d%20(1).jpg';

interface MuridDashboardProps {
  user: UserType;
  onLogout: () => void;
}

export const MuridDashboard: React.FC<MuridDashboardProps> = ({ user, onLogout }) => {
  // Hanya 3 Menu Utama: 'beranda' | 'misi' | 'profil'
  const [activeTab, setActiveTab] = useState<MuridTabType>('misi');

  // Inside 'misi' tab: submode 'map' (Peta Belajar) vs 'lab' (Eksperimen & Simulasi Virtual)
  const [misiSubMode, setMisiSubMode] = useState<'map' | 'lab'>('map');

  // Inside 'lab' submode: 'device_center' | 'virtual_lab'
  const [labSubTab, setLabSubTab] = useState<'device_center' | 'virtual_lab'>('device_center');

  // Student Profile Data from Storage
  const [profileData, setProfileData] = useState(() => storage.getStudentProfile(user.id));
  const student = profileData?.student;
  const studentId = student?.id || `std-${user.id}`;
  const classId = student?.classId || 'cls-xii-1';
  const className = profileData?.className || 'XII-1';

  // Mission & Progress Data
  const [classMissions, setClassMissions] = useState<Mission[]>([]);
  const [studentProgressList, setStudentProgressList] = useState<StudentProgress[]>([]);
  const [classPortfolios, setClassPortfolios] = useState<PortfolioItem[]>([]);
  const [studentPortfolios, setStudentPortfolios] = useState<PortfolioItem[]>([]);

  // Active mission modal state
  const [activeMissionModal, setActiveMissionModal] = useState<Mission | null>(null);
  const [misi4ActiveGameId, setMisi4ActiveGameId] = useState<string | null>(null);
  const [showAlmeRequiredPopup, setShowAlmeRequiredPopup] = useState<boolean>(false);
  const [hasStartedLearning, setHasStartedLearning] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  const isAlmeCompletedForUser = () => {
    try {
      // 1. Periksa localStorage dengan berbagai kemungkinan ID (user.id, studentId, student?.id)
      const idsToCheck = [
        user.id,
        studentId,
        student?.id,
        `std-${user.id}`,
        user.id.replace('usr-', ''),
        user.id.replace('std-', ''),
      ].filter(Boolean) as string[];

      for (const id of idsToCheck) {
        if (localStorage.getItem(`tisenang_alme_indiv_${id}_done`) === 'true') {
          return true;
        }
      }

      // 2. Periksa list misi ALME individual di storage
      for (const id of idsToCheck) {
        const myAlme = storage.getAlmeIndividualMissions(id);
        if (Array.isArray(myAlme) && myAlme.some((m) => m.status === 'COMPLETED')) {
          return true;
        }
      }

      // 3. Periksa semua misi ALME
      const allAlme = storage.getAlmeIndividualMissions();
      const studentAlme = allAlme.filter((m) => idsToCheck.includes(m.studentId));
      if (studentAlme.length > 0 && studentAlme.some((m) => m.status === 'COMPLETED')) {
        return true;
      }

      // Jika ada misi ALME untuk murid ini dan tidak ada satupun yang berstatus PENDING
      if (studentAlme.length > 0 && !studentAlme.some((m) => m.status === 'PENDING')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Floating AI drawer
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Refresh all state from storage
  const refreshData = () => {
    const updatedProfile = storage.getStudentProfile(user.id);
    setProfileData(updatedProfile);

    // Missions strictly by assigned class
    const missions = storage.getMissionsByClass(classId);
    setClassMissions(missions);

    const progress = storage.getAllStudentProgress(studentId);
    setStudentProgressList(progress);

    // Class Portfolios: classmates portfolios with visibility 'CLASS'
    const classPfs = storage.getClassPortfolios(classId);
    setClassPortfolios(classPfs);

    // Student Portfolios: all portfolios belonging to this student
    const studentPfs = storage.getStudentPortfolios(studentId);
    setStudentPortfolios(studentPfs);
  };

  // Cleaned student name without parentheses
  const cleanStudentName = useMemo(
    () => (user.fullName || user.name || 'Murid').replace(/\s*\([^)]*\)/g, '').trim(),
    [user],
  );

  const handleOpenNextMission = (targetNum: number) => {
    refreshData();
    if (targetNum === 6) {
      if (!isAlmeCompletedForUser()) {
        setActiveMissionModal(null);
        setShowAlmeRequiredPopup(true);
        return;
      }
    }
    if (targetNum === 3) {
      // Beralih langsung ke Halaman Eksperimen / Simulasi (Misi 3)
      setActiveMissionModal(null);
      setActiveTab('misi');
      setMisiSubMode('lab');
      return;
    }

    setMisiSubMode('map');
    const activeSubId = activeMissionModal?.subjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_subject_id') : null) || 'sbj-fisika';
    const activeSubName = activeMissionModal?.subjectName || (typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_subject_name') : null) || (activeSubId.includes('mat') ? 'Matematika' : 'Fisika Eksperimental & Terapan');

    const allMissions = storage.getMissionsByClass(classId);
    let nextMission = allMissions.find((m) => m.coreMissionNumber === targetNum && (m.subjectId === activeSubId || m.subjectName === activeSubName));
    if (!nextMission) {
      nextMission = allMissions.find((m) => m.coreMissionNumber === targetNum);
    }
    if (!nextMission) {
      nextMission = allMissions.find(
        (m) =>
          (targetNum === 1 && (m.missionCategory === 'pahami_konsep' || m.coreTitle?.toLowerCase().includes('pahami'))) ||
          (targetNum === 2 && (m.missionCategory === 'selesaikan_masalah' || m.coreTitle?.toLowerCase().includes('masalah') || m.title?.toLowerCase().includes('masalah'))) ||
          (targetNum === 4 && (m.missionCategory === 'game' || m.coreTitle?.toLowerCase().includes('game') || m.title?.toLowerCase().includes('game'))) ||
          (targetNum === 5 && (m.missionCategory === 'latihan_refleksi' || m.coreTitle?.toLowerCase().includes('refleksi') || m.title?.toLowerCase().includes('refleksi'))) ||
          (targetNum === 6 && (m.missionCategory === 'asesmen' || m.coreTitle?.toLowerCase().includes('asesmen')))
      );
    }
    if (!nextMission) {
      const template = generateCurriculumMissionsTemplate();
      nextMission = template.find((m) => m.coreMissionNumber === targetNum) || {
        id: `msn-${classId}-${targetNum}`,
        coreMissionNumber: targetNum as any,
        coreTitle: `Misi ${targetNum}`,
        title: `Misi ${targetNum}`,
        description: '',
        status: 'PUBLISHED',
        subjectId: activeSubId,
        subjectName: activeSubName,
        classId: classId,
        className: className,
        xpReward: 120,
        createdAt: new Date().toISOString(),
      };
    }
    if (nextMission) {
      const activeTpId = typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_tp_id') : null;
      const activeTpCode = typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_tp_code') : null;
      nextMission = {
        ...nextMission,
        subjectId: activeSubId,
        subjectName: activeSubName,
        tpId: activeTpId || undefined,
        tpCode: activeTpCode || undefined,
      };
    }
    setMisi4ActiveGameId(null);
    setActiveMissionModal(nextMission);
  };

  const handleFinishExperiment = () => {
    // 1. Tuntaskan Misi 3 di database & Firebase
    const m3Id = `msn-${classId}-3`;
    storage.completeMission(studentId, m3Id, 100, 150);
    classMissions
      .filter(
        (m) =>
          m.coreMissionNumber === 3 ||
          m.missionCategory === 'simulasi' ||
          m.coreTitle?.toLowerCase().includes('eksperimen') ||
          m.title?.toLowerCase().includes('eksperimen'),
      )
      .forEach((m) => {
        storage.completeMission(studentId, m.id, 100, 150);
      });

    // 2. Dispatch events
    window.dispatchEvent(new CustomEvent('tisenang_missions_updated'));
    refreshData();

    // 3. Berpindah membuka Misi 4 (Game Edukasi Sains)
    handleOpenNextMission(4);
  };

  const handleBackToMisi2 = (targetStep: 'COLLECT' | 'OBSERVE' | 'EXPERIMENT' = 'COLLECT') => {
    try {
      localStorage.setItem('tisenang_misi2_active_step', targetStep);
    } catch {
      // ignore
    }
    const allMissions = storage.getMissionsByClass(classId);
    let m2 = allMissions.find((m) => m.coreMissionNumber === 2);
    if (!m2) {
      m2 = classMissions.find(
        (m) =>
          m.coreMissionNumber === 2 ||
          m.missionCategory === 'selesaikan_masalah' ||
          m.coreTitle?.toLowerCase().includes('masalah') ||
          m.title?.toLowerCase().includes('masalah') ||
          m.id.includes('-2'),
      );
    }
    if (!m2) {
      m2 = {
        id: `msn-${classId}-2`,
        coreMissionNumber: 2,
        coreTitle: 'Misi 2: Selesaikan Masalah',
        title: 'Misi 2: Selesaikan Masalah & Eksplorasi',
        description: 'Penyelidikan saintifik dan eksperimen',
        status: 'PUBLISHED',
        subjectId: 'sbj-fisika',
        subjectName: 'Fisika Eksperimental & Terapan',
        classId: classId,
        className: className,
        xpReward: 150,
        createdAt: new Date().toISOString(),
      } as any;
    }
    setMisiSubMode('map');
    setActiveMissionModal({
      ...m2,
      initialStep: targetStep,
    } as any);
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener('tisenang_missions_updated', handleSync);
    window.addEventListener('tisenang_portfolios_updated', handleSync);
    window.addEventListener('tisenang_alme_updated', handleSync);
    window.addEventListener('tisenang_tasks_updated', handleSync);
    window.addEventListener('tisenang_semester_changed', handleSync);
    window.addEventListener('tisenang_student_kelompok_updated', handleSync);
    window.addEventListener('tisenang_students_updated', handleSync);
    return () => {
      window.removeEventListener('tisenang_missions_updated', handleSync);
      window.removeEventListener('tisenang_portfolios_updated', handleSync);
      window.removeEventListener('tisenang_alme_updated', handleSync);
      window.removeEventListener('tisenang_tasks_updated', handleSync);
      window.removeEventListener('tisenang_semester_changed', handleSync);
      window.removeEventListener('tisenang_student_kelompok_updated', handleSync);
      window.removeEventListener('tisenang_students_updated', handleSync);
    };
  }, [user.id, classId, studentId]);

  // Sinkronisasi misi satu kali saat mount atau classId berubah
  useEffect(() => {
    let isCancelled = false;
    firestoreCache
      .getMissionsCacheFirst(classId)
      .then((cachedMissions) => {
        if (isCancelled) return;
        if (cachedMissions && cachedMissions.length > 0) {
          storage.syncMissionsFromFirebase(cachedMissions);
        } else {
          firebaseRealtime.fetchMissionsREST().then((fbMissions) => {
            if (isCancelled) return;
            if (fbMissions && fbMissions.length > 0) {
              storage.syncMissionsFromFirebase(fbMissions);
            }
          });
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [classId]);

  // Rule-based ALME Recommendation Engine (Tailored per individual student based on real progress & assessment)
  const almeRecommendation: AlmeRecommendation = useMemo(() => {
    // 1. Get student's Asesmen Awal record from storage
    const asesmenList = storage.getAsesmenAwal(classId);
    const myAsesmen = asesmenList.find(
      (a) =>
        a.studentId === studentId ||
        (a.studentName && user.name && a.studentName.toLowerCase().trim() === user.name.toLowerCase().trim())
    );

    // 2. Completed count and scores from student progress
    const completedMissions = studentProgressList.filter((p) => p.status === 'COMPLETED');
    const completedCount = completedMissions.length;
    const scores = completedMissions.map((p) => p.score || 0).filter((s) => s > 0);
    const avgMissionScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    // 3. Compute effective scores influenced by both diagnostic & current mission progress
    const initialDiag = myAsesmen?.diagnosticScore ?? 75;
    const effectiveDiag =
      avgMissionScore !== null
        ? Math.round(initialDiag * 0.35 + avgMissionScore * 0.65)
        : initialDiag;

    const litScore = myAsesmen?.literacyScore ?? (avgMissionScore !== null ? Math.max(65, Math.min(95, avgMissionScore - 2)) : 78);
    const numScore = myAsesmen?.numeracyScore ?? (avgMissionScore !== null ? Math.max(65, Math.min(95, avgMissionScore + 2)) : 76);
    const reasScore = myAsesmen?.reasoningScore ?? 80;

    const m1Prog = studentProgressList.find((p) => p.missionId.includes('-1'));
    const m2Prog = studentProgressList.find((p) => p.missionId.includes('-2'));
    const expSession = storage.getStudentExperimentSession(studentId, 'msn-cls-xii-1-2');
    const studentPfs = storage.getStudentPortfolios(studentId);

    const activeSubId = (typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_subject_id') : null) || 'sbj-fisika';
    const activeSubName = (typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_subject_name') : null) || (activeSubId.includes('mat') ? 'Matematika' : activeSubId.includes('kim') ? 'Kimia' : activeSubId.includes('bio') ? 'Biologi' : 'Fisika');
    const activeTpId = typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_tp_id') : null;
    const activeTpTitle = typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_tp_title') : null;
    const activeTpCode = typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_tp_code') : null;

    const rec = AlmeEngine.analyze({
      assessmentResult: effectiveDiag,
      assessmentResultScore: effectiveDiag,
      literacy: litScore,
      literacyScore: litScore,
      numeracy: numScore,
      numeracyScore: numScore,
      reasoning: reasScore,
      reasoningScore: reasScore,
      quizScore: m1Prog?.score ?? avgMissionScore ?? 80,
      experimentResult: m2Prog?.score ?? (expSession ? 90 : (avgMissionScore ?? 75)),
      experimentResultScore: m2Prog?.score ?? (expSession ? 90 : (avgMissionScore ?? 75)),
      practiceScore: avgMissionScore ?? (completedCount >= 1 ? 82 : 70),
      missionProgress: Math.round((completedCount / (classMissions.length || 7)) * 100),
      subjectName: activeSubName,
      subjectId: activeSubId,
      materi: activeTpTitle || undefined,
      tp: activeTpTitle
        ? {
            id: activeTpId || 'tp-01',
            code: activeTpCode || 'TP-01',
            title: activeTpTitle,
          }
        : null,
      portfolioEvidence: (studentPfs && studentPfs.length > 0 && studentPfs[0]) ? {
        completed: true,
        category: studentPfs[0].category,
        hasData: !!studentPfs[0].experimentData,
        hasGraph: true,
        hasConclusion: !!studentPfs[0].conclusion,
        hasReflection: !!studentPfs[0].reflectionSummary,
      } : undefined,
      hintLevelReached: 0,
      currentDifficulty: Math.min(5, Math.max(1, completedCount + 1)),
    });

    storage.saveAlmeRecommendation(studentId, rec);

    // Sinkronkan ke misi individual ALME
    const existingAlme = storage.getAlmeIndividualMissions(studentId);
    const hasActiveAlme = existingAlme.some((m) => m.status === 'PENDING');
    if (!hasActiveAlme) {
      storage.saveAlmeIndividualMission({
        id: `alme-${studentId}-${Date.now()}`,
        studentId,
        title: `Misi Sisipan ALME: ${rec.title}`,
        description: rec.message || rec.whyExplanation,
        subjectId: activeSubId,
        subjectName: activeSubName,
        recommendedCategory:
          rec.interventionType === 'soal_numerasi'
            ? 'selesaikan_masalah'
            : rec.interventionType === 'pengayaan'
            ? 'simulasi'
            : 'pahami_konsep',
        status: 'PENDING',
        xpReward: rec.xpReward || 120,
        reason: rec.whyExplanation || rec.reason,
        createdAt: new Date().toISOString(),
      });
    }

    return rec;
  }, [studentProgressList, studentId, classId, user.name, classMissions.length]);

  const currentAvatar = user.avatarUrl;
  const isImageAvatar = Boolean(
    currentAvatar && (
      currentAvatar.startsWith('data:image') ||
      currentAvatar.startsWith('http') ||
      currentAvatar.startsWith('/') ||
      currentAvatar.startsWith('blob:')
    )
  );
  const isCartoonSvgAvatar = Boolean(currentAvatar && currentAvatar.startsWith('data:image/svg'));
  const isEmojiAvatar = Boolean(currentAvatar && !isImageAvatar && currentAvatar.length <= 6);

  useEffect(() => {
    const handleUserUpdated = () => {
      setProfileData(storage.getStudentProfile(user.id));
    };
    window.addEventListener('tisenang_user_updated', handleUserUpdated);
    return () => window.removeEventListener('tisenang_user_updated', handleUserUpdated);
  }, [user.id]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* Pop-up Petunjuk (Muncul saat pertama kali masuk atau saat diklik dari header) */}
      {(!hasStartedLearning || showGuideModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-950/35 backdrop-blur-[2px] overflow-hidden">
          <div className="w-full max-w-[96vw] sm:max-w-xl lg:max-w-4xl my-auto animate-beranda-enter drop-shadow-2xl">
            <DashboardGuideBanner
              role="murid"
              userName={cleanStudentName || user.fullName || user.name || 'Murid'}
              onClose={() => {
                setHasStartedLearning(true);
                setShowGuideModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Dashboard Murid (Terlihat samar-samar di belakang pop-up saat pop-up aktif) */}
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className={`bg-slate-50 text-slate-800 transition-all duration-300 ${
          (!hasStartedLearning || showGuideModal)
            ? 'filter blur-[2px] opacity-85 select-none pointer-events-none'
            : ''
        }`}
      >
        {/* Top Application Bar (Clean White Background with subtle soft shadow & rounded precision) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.03)] shrink-0 z-30 min-h-13 sm:min-h-14">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-white border border-slate-200/90 flex items-center justify-center p-0.5 shrink-0 shadow-xs hover:scale-105 transition-transform">
            <img
              src={logoTiSenang}
              alt="TI SENANG"
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                TI SENANG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Teknologi Inovatif untuk Sistem Pembelajaran Adaptif dan Menyenangkan
            </p>
          </div>
        </div>

        {/* Right: XP badge (hanya XP di Misi & Beranda, disembunyikan saat di Profil) + Petunjuk + Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Tampil hanya saat di Beranda & Misi, dan HANYA XP saja */}
          {activeTab !== 'profil' && (
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-slate-200/80 text-xs shadow-2xs transition-colors">
              <span className="flex items-center gap-1 font-mono font-black text-blue-700" title="Total Poin Pengalaman">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                {profileData?.xp || 800} XP
              </span>
            </div>
          )}

          {/* Quick Petunjuk button to re-read guide */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
            title="Buka Petunjuk Langkah Belajar Murid"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Petunjuk</span>
          </button>

          {/* Avatar button linking to Profile */}
          <button
            id="btn-nav-to-profile"
            onClick={() => setActiveTab('profil')}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center justify-center font-display font-bold text-xs transition-all border border-blue-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400/50 active:scale-95 shadow-2xs"
            title="Buka Profil Murid"
          >
            {isCartoonSvgAvatar ? (
              <img src={currentAvatar} alt={user.name} className="w-full h-full object-contain p-0.5" />
            ) : (
              <span className="text-base select-none leading-none">
                {isEmojiAvatar ? currentAvatar : '🧑‍🎓'}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area (Scrolls independently between header and bottom nav) */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '24px',
          ...(activeTab === 'misi' || activeTab === 'beranda'
            ? {
                backgroundImage:
                  activeTab === 'beranda'
                    ? `linear-gradient(to bottom, rgba(6, 12, 26, 0.93), rgba(4, 8, 20, 0.97)), url(${bgMisi}), url('${RAW_MISSION_BG}')`
                    : `linear-gradient(to bottom, rgba(10, 15, 29, 0.70), rgba(6, 10, 20, 0.82)), url(${bgMisi}), url('${RAW_MISSION_BG}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundColor: '#090d16',
              }
            : {}),
        }}
        className={
          activeTab === 'misi' || activeTab === 'beranda'
            ? 'p-2.5 sm:p-4 lg:p-6 text-white min-h-0'
            : 'p-2.5 sm:p-4 lg:p-6 min-h-0'
        }
      >
        {/* =========================================================================
            MENU 1: BERANDA (Portofolio Teman-Teman Sekelas)
            ========================================================================= */}
        {activeTab === 'beranda' && (
          <MuridBeranda
            className={className}
            classPortfolios={classPortfolios}
            studentId={studentId}
            studentName={cleanStudentName}
            avatarUrl={user.avatarUrl}
            classId={classId}
            onRefreshPortfolios={refreshData}
          />
        )}

        {/* =========================================================================
            MENU 2: MISI (Mission Map / Learning Journey + Eksperimen & Simulasi)
            ========================================================================= */}
        {activeTab === 'misi' && (
          <div className="w-full max-w-5xl mx-auto">
            {/* Render Map OR Lab inside Misi */}
            {misiSubMode === 'map' ? (
              <MissionJourney
                studentId={studentId}
                missions={classMissions}
                progressList={studentProgressList}
                almeRecommendation={almeRecommendation}
                studentName={cleanStudentName}
                className={className}
                studentProfile={profileData}
                onOpenMission={(m) => {
                  if (
                    m.coreMissionNumber === 6 ||
                    m.missionCategory === 'asesmen' ||
                    m.title?.toLowerCase().includes('asesmen akhir') ||
                    m.coreTitle?.toLowerCase().includes('asesmen akhir')
                  ) {
                    if (!isAlmeCompletedForUser()) {
                      setShowAlmeRequiredPopup(true);
                      return;
                    }
                  }
                  setMisi4ActiveGameId(null);
                  setActiveMissionModal(m);
                }}
                onOpenLab={() => setMisiSubMode('lab')}
                onRefreshData={refreshData}
              />
            ) : (
              <div className="space-y-4">
                {/* Lab Sub-tabs: Device Center vs Virtual Lab */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                    <button
                      id="btn-lab-device-center"
                      onClick={() => setLabSubTab('device_center')}
                      className={`min-h-[40px] px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center truncate ${
                        labSubTab === 'device_center'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Cpu className="w-4 h-4 shrink-0" />
                      <span className="truncate">Eksperimen (Kit TI SENANG)</span>
                    </button>
                    <button
                      id="btn-lab-virtual-calorimeter"
                      onClick={() => setLabSubTab('virtual_lab')}
                      className={`min-h-[40px] px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center truncate ${
                        labSubTab === 'virtual_lab'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FlaskConical className="w-4 h-4 shrink-0" />
                      <span className="truncate">Simulasi Virtual</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={() => setMisiSubMode('map')}
                      className="text-xs font-bold text-blue-600 hover:underline px-2 cursor-pointer"
                    >
                      ← Kembali ke Peta Misi
                    </button>
                  </div>
                </div>

                {labSubTab === 'device_center' ? (
                  <DeviceCenter
                    studentId={studentId}
                    missionId="msn-cls-xii-1-3"
                    studentKelompok={student?.kelompok}
                    studentClass={className}
                    onNavigateToMisi2={handleBackToMisi2}
                    onFinishExperiment={handleFinishExperiment}
                  />
                ) : (
                  <VirtualLab
                    studentId={studentId}
                    missionId="msn-cls-xii-1-3"
                    onFinishExperiment={handleFinishExperiment}
                    onNavigateToMisi2={handleBackToMisi2}
                  />
                )}

                {/* Switcher Navigasi Halaman Bawah di Mode Lab: [MISI] [EKSPERIMEN / SIMULASI] */}
                <div className="flex items-center justify-center pt-3 pb-2 z-20">
                  <div className="flex items-center p-1 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-lg">
                    <button
                      id="btn-lab-subnav-misi"
                      onClick={() => setMisiSubMode('map')}
                      className="px-4 sm:px-5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                      <span>MISI</span>
                    </button>
                    <button
                      id="btn-lab-subnav-eksperimen"
                      className="px-4 sm:px-5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md border border-cyan-400/50 cursor-pointer"
                    >
                      <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
                      <span>EKSPERIMEN / SIMULASI</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MENU 3: TEMAN BERPIKIR AI (Socratic AI Companion)
            ========================================================================= */}
        {activeTab === 'ai' && (
          <div className="h-[calc(100dvh-170px)] max-w-3xl mx-auto">
            <TemanBerpikirAI
              currentContext={`Murid ${user.fullName || user.name} • Kelas ${className} • MIPA Fase F`}
              isFloating={false}
            />
          </div>
        )}

        {/* =========================================================================
            MENU 4: PROFIL (Foto Profil, Nama, Progress Misi, XP, Portofolio CRUD)
            ========================================================================= */}
        {activeTab === 'profil' && profileData && (
          <MuridProfil
            profile={profileData}
            portfolios={studentPortfolios}
            progressList={studentProgressList}
            onRefreshPortfolios={refreshData}
            onLogout={onLogout}
            onNavigateToLab={() => {
              setActiveTab('misi');
              setMisiSubMode('lab');
              setLabSubTab('device_center');
            }}
          />
        )}
      </main>

      {/* Floating Socratic AI Button (at bottom right above nav) - hanya muncul di halaman menu misi */}
      {activeTab === 'misi' && (
        <div className="fixed right-5 bottom-20 z-40">
          <button
            onClick={() => setIsAiDrawerOpen((prev) => !prev)}
            className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 hover:from-blue-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transition-all border border-white/20 active:scale-95"
            title="Teman Berpikir Sokratik AI"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-amber-300">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold font-display tracking-tight hidden sm:inline">
              Teman Berpikir AI
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </button>

          {/* Floating AI popup dialog */}
          {isAiDrawerOpen && (
            <div className="absolute bottom-14 right-0 z-50">
              <TemanBerpikirAI
                currentContext={activeMissionModal?.title || 'Pembelajaran MIPA'}
                onClose={() => setIsAiDrawerOpen(false)}
                isFloating={true}
              />
            </div>
          )}
        </div>
      )}

      {/* MODAL FOR ACTIVE MISSION (LEVEL 1, LEVEL 2, ETC.) */}
      {activeMissionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs overflow-y-auto p-2 sm:p-6 flex items-start sm:items-center justify-center py-3 sm:py-8">
          <div
            className={`${
              activeMissionModal.coreMissionNumber === 1
                ? 'bg-slate-900 border border-slate-700/80 text-white max-w-3xl'
                : activeMissionModal.coreMissionNumber === 2
                ? 'bg-slate-900 border border-slate-700/80 text-white max-w-full sm:max-w-4xl lg:max-w-5xl'
                : 'bg-white max-w-3xl'
            } rounded-2xl sm:rounded-3xl w-full p-2.5 sm:p-6 md:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto`}
          >
            <button
              onClick={() => {
                if (activeMissionModal.coreMissionNumber === 4) {
                  if (misi4ActiveGameId) {
                    // Ketika sedang di tampilan game edukasi, klik tombol close kembali ke halaman misi 4 game sains, jangan kembali ke halaman misi
                    setMisi4ActiveGameId(null);
                    return;
                  }
                  joyfulGameMusic.stop();
                }
                setActiveMissionModal(null);
                setMisi4ActiveGameId(null);
                refreshData();
              }}
              className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full ${
                activeMissionModal.coreMissionNumber === 1 || activeMissionModal.coreMissionNumber === 2 || (activeMissionModal.coreMissionNumber === 4 && misi4ActiveGameId)
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              } flex items-center justify-center transition-colors z-30`}
              title={
                activeMissionModal.coreMissionNumber === 4 && misi4ActiveGameId
                  ? 'Tutup Game (Kembali ke Halaman Misi 4 Game Sains)'
                  : 'Tutup Misi'
              }
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Routing Komponen Khusus Berdasarkan Nomor Misi */}
            {activeMissionModal.coreMissionNumber === 1 ? (
              <Misi1PahamiKonsep
                studentId={studentId}
                missionId={activeMissionModal.id}
                mission={activeMissionModal}
                onCompleted={() => {
                  refreshData();
                }}
                onNextMission={handleOpenNextMission}
                onClose={() => {
                  setActiveMissionModal(null);
                  refreshData();
                }}
              />
            ) : activeMissionModal.coreMissionNumber === 2 ? (
              <Misi2Eksplorasi
                studentId={studentId}
                studentName={cleanStudentName}
                classId={classId}
                className={className}
                missionId={activeMissionModal.id}
                mission={activeMissionModal}
                initialStep={(activeMissionModal as any).initialStep}
                onNavigateToLab={() => {
                  setActiveMissionModal(null);
                  setActiveTab('misi');
                  setMisiSubMode('lab');
                }}
                onCompleted={() => {
                  setActiveMissionModal(null);
                  setActiveTab('misi');
                  setMisiSubMode('map');
                  refreshData();
                }}
                onNextMission={handleOpenNextMission}
                onClose={() => {
                  setActiveMissionModal(null);
                  setActiveTab('misi');
                  setMisiSubMode('map');
                  refreshData();
                }}
              />
            ) : activeMissionModal.coreMissionNumber === 4 ? (
              <Misi4Game
                studentId={studentId}
                studentName={cleanStudentName}
                missionId={activeMissionModal.id}
                mission={activeMissionModal}
                activeGameId={misi4ActiveGameId}
                onActiveGameChange={setMisi4ActiveGameId}
                onCompleted={() => {
                  refreshData();
                }}
                onNextMission={handleOpenNextMission}
                onClose={() => {
                  if (misi4ActiveGameId) {
                    setMisi4ActiveGameId(null);
                  } else {
                    joyfulGameMusic.stop();
                    setActiveMissionModal(null);
                    setMisi4ActiveGameId(null);
                    refreshData();
                  }
                }}
              />
            ) : activeMissionModal.coreMissionNumber === 5 ? (
              <Misi5Refleksi
                studentId={studentId}
                studentName={cleanStudentName}
                classId={classId}
                className={className}
                missionId={activeMissionModal.id}
                mission={activeMissionModal}
                onCompleted={() => {
                  refreshData();
                }}
                onNextMission={handleOpenNextMission}
                onClose={() => {
                  setActiveMissionModal(null);
                  refreshData();
                }}
              />
            ) : activeMissionModal.coreMissionNumber === 6 ? (
              <Misi6Asesmen
                studentId={studentId}
                studentName={cleanStudentName}
                classId={classId}
                className={className}
                missionId={activeMissionModal.id}
                mission={activeMissionModal}
                onCompleted={() => {
                  refreshData();
                }}
                onClose={() => {
                  setActiveMissionModal(null);
                  refreshData();
                }}
              />
            ) : (
              <MisiInteractiveRunner
                mission={activeMissionModal}
                studentId={studentId}
                studentName={cleanStudentName}
                classId={classId}
                className={className}
                onOpenLab={() => {
                  setActiveMissionModal(null);
                  setActiveTab('misi');
                  setMisiSubMode('lab');
                }}
                onCompleted={() => {
                  refreshData();
                }}
                onNextMission={handleOpenNextMission}
                onClose={() => {
                  setActiveMissionModal(null);
                  refreshData();
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Header Bagian Bawah: Menu Beranda, Misi, Profil (Panjang di seluruh layar, tidak tumpang tindih dengan background) */}
      <MuridBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'misi') {
            setIsAiDrawerOpen(false);
          }
          if (tab === 'misi') {
            setMisiSubMode('map');
          }
        }}
      />

      {/* POP UP KETIKA ASESMEN AKHIR DIKLIK SEBELUM MENYELESAIKAN MISI PENGUATAN ALME */}
      {showAlmeRequiredPopup && (
        <div
          id="dashboard-modal-alme-required-popup"
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full mx-auto shadow-2xl border border-amber-200 text-center flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300/80 text-amber-600 flex items-center justify-center shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-wide text-center leading-snug">
              KERJAKAN MISI PENGUATAN ALME TERLEBIH DAHULU !
            </div>
            <button
              id="btn-close-dashboard-alme-required-popup"
              type="button"
              onClick={() => setShowAlmeRequiredPopup(false)}
              className="w-full py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
