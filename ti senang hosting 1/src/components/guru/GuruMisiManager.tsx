import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Target,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Send,
  Eye,
  AlertCircle,
  X,
  Sparkles,
  Link,
  FileText,
  Video,
  Gamepad2,
  HelpCircle,
  CheckSquare,
  UploadCloud,
  ExternalLink,
  FolderOpen,
  Inbox,
  FileCheck,
  Star,
  Brain,
  ListPlus,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  Mission,
  ClassRoom,
  Subject,
  MissionStatus,
  MissionCoreNumber,
  MissionCategoryType,
  QuestionItem,
  MissionMediaResource,
  StudentTaskSubmission,
  TujuanPembelajaran,
} from '../../types';
import { storage } from '../../services/storage';
import { QuestionMaker } from './QuestionMaker';
import { parseGoogleDriveUrl } from '../../utils/googleDrive';
import { STUDENT_DRIVE_FOLDER_URL } from '../../services/firebaseRealtime';

export interface M1LinkItem {
  type: 'pdf' | 'video' | 'link';
  title: string;
  url: string;
}

interface GuruMisiManagerProps {
  missions: Mission[];
  classes: ClassRoom[];
  subjects: Subject[];
  selectedClassId: string;
  selectedSubjectId?: string;
  selectedSemester?: string;
  onRefresh: () => void;
}

export const GuruMisiManager: React.FC<GuruMisiManagerProps> = ({
  missions,
  classes = [],
  subjects = [],
  selectedClassId,
  selectedSubjectId,
  selectedSemester,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const tpListFromStorage = storage.getTujuanPembelajaran(selectedSubjectId);
  const activeTpList: TujuanPembelajaran[] = useMemo(() => {
    return tpListFromStorage || [];
  }, [tpListFromStorage]);

  const tpList = activeTpList;

  // Filter "Pilih TP" di sub menu Kelola Misi
  const [selectedTpFilter, setSelectedTpFilter] = useState<string>('all');
  const [isTpDropdownOpen, setIsTpDropdownOpen] = useState(false);
  const tpDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tpDropdownRef.current && !tpDropdownRef.current.contains(event.target as Node)) {
        setIsTpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>(
    selectedSubjectId || subjects?.[0]?.id || 'sbj-fisika',
  );

  useEffect(() => {
    if (selectedSubjectId) {
      setActiveSubjectFilter(selectedSubjectId);
      setSubjectId(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedClassId) {
      setTargetClassId(selectedClassId);
    }
  }, [selectedClassId]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetClassId, setTargetClassId] = useState(selectedClassId || classes?.[0]?.id || 'cls-xii-1');
  const [subjectId, setSubjectId] = useState(selectedSubjectId || subjects?.[0]?.id || 'sbj-fisika');
  const [status, setStatus] = useState<MissionStatus>('PUBLISHED');
  const [coreNumber, setCoreNumber] = useState<MissionCoreNumber>(1);
  const [xpReward, setXpReward] = useState<number>(100);
  const [dueDate, setDueDate] = useState<string>('2026-10-15');
  const [selectedTpId, setSelectedTpId] = useState<string>(tpList?.[0]?.id || '');
  const [timeAllocationJp, setTimeAllocationJp] = useState<number>(2);

  const currentSubject = subjects.find((s) => s.id === subjectId);

  // States khusus untuk 6 Kategori Misi
  const [m1Links, setM1Links] = useState<M1LinkItem[]>([
    { type: 'pdf', title: '', url: '' },
    { type: 'video', title: '', url: '' },
  ]);

  // States khusus Misi 5 Refleksi & Penilaian Diri
  const [reflectionQ1, setReflectionQ1] = useState<string>(
    'Konsep apa yang paling bermakna dan paling Anda pahami setelah menyelesaikan misi pembelajaran ini?'
  );
  const [reflectionQ2, setReflectionQ2] = useState<string>(
    'Apa kendala atau kesulitan yang Anda hadapi saat belajar, dan bagaimana strategi Anda mengatasinya?'
  );
  const [reflectionQ3, setReflectionQ3] = useState<string>(
    'Bagaimana konsep yang dipelajari dapat diterapkan dalam kehidupan nyata, teknologi, atau penyelidikan sains?'
  );
  const [reflectionQ4, setReflectionQ4] = useState<string>(
    'Apa rencana tindak lanjut atau target pengembangan diri Anda untuk meningkatkan pemahaman materi selanjutnya?'
  );

  const [rubricAspect1, setRubricAspect1] = useState<string>('1. Kemandirian');
  const [rubricAspect2, setRubricAspect2] = useState<string>('2. Keaktifan Belajar');
  const [rubricAspect3, setRubricAspect3] = useState<string>('3. Pemahaman Konsep & Penalaran Ilmiah');
  const [rubricAspect4, setRubricAspect4] = useState<string>('4. Keterampilan Pemecahan Masalah');
  const [rubricAspect5, setRubricAspect5] = useState<string>('5. Sikap Kritis dan Teliti');
  const [rubricAspect6, setRubricAspect6] = useState<string>('6. Kerjasama dalam Kelompok');
  const [rubricAspect7, setRubricAspect7] = useState<string>('7. Bertanggung Jawab');

  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'pdf' | 'video' | 'link' | 'photo' | 'data'>('pdf');
  const [mediaTitle, setMediaTitle] = useState<string>('');
  const [readingModuleText, setReadingModuleText] = useState<string>('');
  const [simulationSteps, setSimulationSteps] = useState<string>('');
  const [simulationUrl, setSimulationUrl] = useState<string>('');
  const [triggerQuestions, setTriggerQuestions] = useState<string>('');
  const [analysisGuide, setAnalysisGuide] = useState<string>('');
  const [gameCreationMode, setGameCreationMode] = useState<'ai' | 'guru'>('ai');
  const [gameInstructions, setGameInstructions] = useState<string>('');
  const [gameTargetScore, setGameTargetScore] = useState<string>('');
  const [reflectionPrompt, setReflectionPrompt] = useState<string>('');
  const [problemPrompt, setProblemPrompt] = useState<string>('');
  const [supportingData, setSupportingData] = useState<string>('');
  const [gameUrl, setGameUrl] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const coreTitlesMap: Record<MissionCoreNumber, string> = {
    1: 'Misi 1 — Pahami Konsep',
    2: 'Misi 2 — Selesaikan Masalah Nyata',
    3: 'Misi 3 — Simulasi & Eksperimen',
    4: 'Misi 4 — Game Edukasi',
    5: 'Misi 5 — Refleksi dan Penilaian Diri',
    6: 'Misi 6 — Asesmen Akhir',
  };

  // Matching a mission to selected TP
  const matchesSelectedTp = (m: Mission): boolean => {
    if (selectedTpFilter === 'all') return true;

    // Find the target TP object and index
    const tpIndex = activeTpList.findIndex(
      (tp, idx) =>
        tp.id === selectedTpFilter ||
        tp.code === selectedTpFilter ||
        `idx-${idx}` === selectedTpFilter,
    );
    if (tpIndex === -1) return true;
    const targetTp = activeTpList[tpIndex];

    // Priority 1: direct ID match
    if (m.tpId && targetTp.id && m.tpId === targetTp.id) return true;
    // Priority 2: direct Code match
    if (
      m.tpCode &&
      targetTp.code &&
      m.tpCode.trim().toLowerCase() === targetTp.code.trim().toLowerCase()
    ) {
      return true;
    }

    // Priority 3: fallback if mission has no explicit tpId/tpCode, or standard 6-misi mapping
    if (!m.tpId && !m.tpCode) {
      if (tpIndex === 0) return m.coreMissionNumber === 1 || m.coreMissionNumber === 2;
      if (tpIndex === 1) return m.coreMissionNumber === 3 || m.coreMissionNumber === 4;
      if (tpIndex === 2) return m.coreMissionNumber === 5 || m.coreMissionNumber === 6;
      return m.coreMissionNumber === tpIndex + 1;
    }

    // Check code substring like 01 / 02 / 03
    const indexStr = String(tpIndex + 1).padStart(2, '0');
    if (m.tpCode && m.tpCode.includes(indexStr)) return true;

    return false;
  };

  // Filter missions strictly for the currently selected class AND selected subject AND selected TP
  const currentSubjectObj = subjects.find((s) => s.id === activeSubjectFilter);
  const displayMissions = missions.filter((m) => {
    if (!m) return false;
    const matchClass = m.classId === targetClassId || m.classId === selectedClassId || !m.classId;
    const matchSubject =
      m.subjectId === activeSubjectFilter ||
      (currentSubjectObj?.name &&
        m.subjectName &&
        m.subjectName.toLowerCase() === currentSubjectObj.name.toLowerCase());
    const matchTp = matchesSelectedTp(m);
    return matchClass && matchSubject && matchTp;
  });

  const openCreateModal = () => {
    setEditingMission(null);
    setTitle('');
    setDescription('');
    setTargetClassId(selectedClassId || classes?.[0]?.id || 'cls-xii-1');
    setSubjectId(activeSubjectFilter || subjects?.[0]?.id || 'sbj-fisika');
    setStatus('PUBLISHED');
    setCoreNumber(1);
    setXpReward(100);
    setDueDate('2026-10-15');
    setSelectedTpId(tpList?.[0]?.id || '');
    setTimeAllocationJp(2);
    setM1Links([
      { type: 'pdf', title: '', url: '' },
      { type: 'video', title: '', url: '' },
    ]);
    setReflectionQ1('Konsep apa yang paling bermakna dan paling Anda pahami setelah menyelesaikan misi pembelajaran ini?');
    setReflectionQ2('Apa kendala atau kesulitan yang Anda hadapi saat belajar, dan bagaimana strategi Anda mengatasinya?');
    setReflectionQ3('Bagaimana konsep yang dipelajari dapat diterapkan dalam kehidupan nyata, teknologi, atau penyelidikan sains?');
    setReflectionQ4('Apa rencana tindak lanjut atau target pengembangan diri Anda untuk meningkatkan pemahaman materi selanjutnya?');
    setMediaUrl('');
    setMediaType('pdf');
    setMediaTitle('');
    setReadingModuleText('');
    setSimulationSteps('');
    setSimulationUrl('');
    setTriggerQuestions('');
    setAnalysisGuide('');
    setGameCreationMode('ai');
    setGameInstructions('');
    setGameTargetScore('');
    setReflectionPrompt('');
    setProblemPrompt('');
    setSupportingData('');
    setGameUrl('');
    setQuestions([]);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: Mission) => {
    setEditingMission(m);
    setTitle(m.title);
    setDescription(m.description);
    setTargetClassId(m.classId || targetClassId || classes?.[0]?.id || 'cls-xii-1');
    setSubjectId(m.subjectId || subjects?.[0]?.id || 'sbj-fisika');
    setStatus(m.status);
    setCoreNumber(m.coreMissionNumber);
    setXpReward(m.xpReward);
    setDueDate(m.dueDate || '2026-10-15');
    setSelectedTpId(m.tpId || tpList?.[0]?.id || '');
    setTimeAllocationJp(m.timeAllocationJp || 2);
    
    // Inisialisasi M1 Links (2-4 tautan)
    if (m.mediaResources && m.mediaResources.length > 0) {
      const links = m.mediaResources.slice(0, 4).map((r) => ({
        type: (r.type === 'pdf' || r.type === 'video' || r.type === 'link') ? r.type : ('link' as const),
        title: r.title || '',
        url: r.url || '',
      }));
      while (links.length < 2) {
        links.push({ type: 'link', title: '', url: '' });
      }
      setM1Links(links);
    } else {
      setM1Links([
        { type: 'pdf', title: '', url: '' },
        { type: 'video', title: '', url: '' },
      ]);
    }

    // Inisialisasi Misi 5 Refleksi & Penilaian Diri
    if (m.coreMissionNumber === 5 && m.reflectionPrompt) {
      try {
        const parsed = JSON.parse(m.reflectionPrompt);
        if (parsed.q1) setReflectionQ1(parsed.q1);
        if (parsed.q2) setReflectionQ2(parsed.q2);
        if (parsed.q3) setReflectionQ3(parsed.q3);
        if (parsed.q4) setReflectionQ4(parsed.q4);
        if (parsed.questions?.q1) setReflectionQ1(parsed.questions.q1);
        if (parsed.questions?.q2) setReflectionQ2(parsed.questions.q2);
        if (parsed.questions?.q3) setReflectionQ3(parsed.questions.q3);
        if (parsed.questions?.q4) setReflectionQ4(parsed.questions.q4);
        if (parsed.rubrics?.[0]?.label) setRubricAspect1(parsed.rubrics[0].label);
        if (parsed.rubrics?.[1]?.label) setRubricAspect2(parsed.rubrics[1].label);
        if (parsed.rubrics?.[2]?.label) setRubricAspect3(parsed.rubrics[2].label);
        if (parsed.rubrics?.[3]?.label) setRubricAspect4(parsed.rubrics[3].label);
        if (parsed.rubrics?.[4]?.label) setRubricAspect5(parsed.rubrics[4].label);
        if (parsed.rubrics?.[5]?.label) setRubricAspect6(parsed.rubrics[5].label);
        if (parsed.rubrics?.[6]?.label) setRubricAspect7(parsed.rubrics[6].label);
      } catch {
        setReflectionPrompt(m.reflectionPrompt);
      }
    } else {
      setReflectionQ1('Konsep apa yang paling bermakna dan paling Anda pahami setelah menyelesaikan misi pembelajaran ini?');
      setReflectionQ2('Apa kendala atau kesulitan yang Anda hadapi saat belajar, dan bagaimana strategi Anda mengatasinya?');
      setReflectionQ3('Bagaimana konsep yang dipelajari dapat diterapkan dalam kehidupan nyata, teknologi, atau penyelidikan sains?');
      setReflectionQ4('Apa rencana tindak lanjut atau target pengembangan diri Anda untuk meningkatkan pemahaman materi selanjutnya?');
      setRubricAspect1('1. Kemandirian');
      setRubricAspect2('2. Keaktifan Belajar');
      setRubricAspect3('3. Pemahaman Konsep & Penalaran Ilmiah');
      setRubricAspect4('4. Keterampilan Pemecahan Masalah');
      setRubricAspect5('5. Sikap Kritis dan Teliti');
      setRubricAspect6('6. Kerjasama dalam Kelompok');
      setRubricAspect7('7. Bertanggung Jawab');
    }

    setMediaUrl(m.mediaResources?.[0]?.url || '');
    setMediaType(m.mediaResources?.[0]?.type || 'pdf');
    setMediaTitle(m.mediaResources?.[0]?.title || '');
    setReadingModuleText(m.readingModuleText || '');
    setSimulationSteps(m.simulationSteps || '');
    setSimulationUrl(m.simulationUrl || '');
    setTriggerQuestions(m.triggerQuestions || '');
    setAnalysisGuide(m.analysisGuide || '');
    setGameCreationMode(m.gameCreationMode || (m.gameUrl ? 'guru' : 'ai'));
    setGameInstructions(m.gameInstructions || '');
    setGameTargetScore(m.gameTargetScore || '');
    setReflectionPrompt(m.reflectionPrompt || '');
    setProblemPrompt(m.problemPrompt || '');
    setSupportingData(m.supportingData || '');
    setGameUrl(m.gameUrl || '');
    setQuestions(m.questions || []);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (missionId: string) => {
    storage.togglePublishMission(missionId);
    onRefresh();
  };

  const handleDelete = (missionId: string, missionTitle?: string) => {
    setDeleteConfirm({ id: missionId, title: missionTitle || 'Misi Pembelajaran' });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    storage.deleteMission(deleteConfirm.id);
    setDeleteConfirm(null);
    onRefresh();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setValidationError('Mohon lengkapi judul dan deskripsi misi pembelajaran.');
      return;
    }
    setValidationError(null);

    const selectedSubj = subjects.find((s) => s.id === subjectId);
    const selectedCls = classes.find((c) => c.id === targetClassId);
    const linkedTp = tpList.find((tp) => tp.id === selectedTpId);

    // Kategori misi berdasarkan core number
    const categoryMapping: Record<MissionCoreNumber, MissionCategoryType> = {
      1: 'pahami_konsep',
      2: 'selesaikan_masalah',
      3: 'simulasi',
      4: 'game',
      5: 'latihan_refleksi',
      6: 'asesmen',
    };

    // Konstruksi daftar tautan media pembelajaran (Misi 1 mendukung 2-4 tautan)
    let mediaList: MissionMediaResource[] = [];
    if (Number(coreNumber) === 1) {
      mediaList = m1Links
        .filter((link) => link.url.trim().length > 0)
        .map((link, idx) => {
          const parsedDrive = parseGoogleDriveUrl(link.url);
          return {
            type: link.type,
            title: link.title.trim() || `Tautan Materi 0${idx + 1}`,
            url: parsedDrive.isDriveUrl ? parsedDrive.previewUrl || link.url : link.url,
            description: parsedDrive.isDriveUrl ? 'File terhubung dari Google Drive' : undefined,
          };
        });
    } else if (mediaUrl.trim()) {
      const parsedDrive = parseGoogleDriveUrl(mediaUrl);
      mediaList = [
        {
          type: mediaType,
          title: mediaTitle.trim() || (mediaType === 'pdf' ? 'Dokumen PDF Materi' : 'Video / Media Pembelajaran'),
          url: parsedDrive.isDriveUrl ? parsedDrive.previewUrl || mediaUrl : mediaUrl,
          description: parsedDrive.isDriveUrl ? 'File terhubung dari Google Drive' : undefined,
        },
      ];
    }

    // Untuk Misi 5 (Refleksi dan Penilaian Diri), simpan paket refleksi metakognitif
    let computedReflectionPrompt: string | undefined = undefined;
    if (Number(coreNumber) === 5) {
      const teacherConfig = {
        classId: targetClassId,
        missionId: editingMission?.id,
        updatedAt: new Date().toISOString(),
        questions: {
          q1: reflectionQ1.trim(),
          q2: reflectionQ2.trim(),
          q3: reflectionQ3.trim(),
          q4: reflectionQ4.trim(),
        },
        rubrics: [
          { id: 'aspect-1', label: rubricAspect1.trim() || '1. Kemandirian', desc: 'Inisiatif, kedisiplinan dan belajar tanpa bergantung penuh' },
          { id: 'aspect-2', label: rubricAspect2.trim() || '2. Keaktifan Belajar', desc: 'Antusiasme bertanya, mencoba simulasi, dan berpartisipasi aktif' },
          { id: 'aspect-3', label: rubricAspect3.trim() || '3. Pemahaman Konsep & Penalaran Ilmiah', desc: 'Kedalaman pemahaman teori dan penalaran prinsip saintifik' },
          { id: 'aspect-4', label: rubricAspect4.trim() || '4. Keterampilan Pemecahan Masalah', desc: 'Kemampuan menganalisis data dan memecahkan persoalan' },
          { id: 'aspect-5', label: rubricAspect5.trim() || '5. Sikap Kritis dan Teliti', desc: 'Kecermatan observasi, verifikasi data, dan ketelitian kesimpulan' },
          { id: 'aspect-6', label: rubricAspect6.trim() || '6. Kerjasama dalam Kelompok', desc: 'Kolaborasi yang saling menghargai dan berkontribusi dalam tim' },
          { id: 'aspect-7', label: rubricAspect7.trim() || '7. Bertanggung Jawab', desc: 'Integritas akademik, ketuntasan tugas, dan komitmen belajar' },
        ],
      };
      computedReflectionPrompt = JSON.stringify(teacherConfig);
      storage.saveTeacherReflectionConfig(teacherConfig);
    } else if (reflectionPrompt.trim()) {
      computedReflectionPrompt = reflectionPrompt.trim();
    }

    const missionPayload: Mission = {
      id: editingMission ? editingMission.id : `msn-${targetClassId}-${Date.now()}`,
      title,
      description,
      status,
      classId: targetClassId,
      className: selectedCls?.className || 'XII-1',
      subjectId,
      subjectName: selectedSubj?.name || 'Fisika Eksperimental & Terapan',
      coreMissionNumber: Number(coreNumber) as MissionCoreNumber,
      coreTitle: coreTitlesMap[Number(coreNumber) as MissionCoreNumber],
      xpReward: Number(xpReward),
      dueDate,
      tpId: linkedTp?.id,
      tpCode: linkedTp?.code,
      timeAllocationJp: Number(timeAllocationJp),
      timeAllocationMinutes: Number(timeAllocationJp) * 45,
      missionCategory: categoryMapping[Number(coreNumber) as MissionCoreNumber],
      mediaResources: mediaList,
      gameCreationMode: Number(coreNumber) === 4 ? gameCreationMode : undefined,
      gameUrl: Number(coreNumber) === 4 && gameCreationMode === 'guru' ? (gameUrl.trim() || undefined) : undefined,
      problemPrompt: problemPrompt.trim() || undefined,
      supportingData: supportingData.trim() || undefined,
      readingModuleText: readingModuleText.trim() || undefined,
      simulationSteps: simulationSteps.trim() || undefined,
      simulationUrl: simulationUrl.trim() || undefined,
      triggerQuestions: triggerQuestions.trim() || undefined,
      analysisGuide: analysisGuide.trim() || undefined,
      gameInstructions: Number(coreNumber) === 4 && gameCreationMode === 'guru' ? (gameInstructions.trim() || undefined) : undefined,
      gameTargetScore: undefined,
      reflectionPrompt: computedReflectionPrompt,
      questions: Number(coreNumber) === 5 ? undefined : (questions.length > 0 ? questions : undefined),
    };

    if (editingMission) {
      storage.updateMission(editingMission.id, missionPayload);
    } else {
      storage.createMission(missionPayload);
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const currentSelectedTpIndex = activeTpList.findIndex(
    (tp, idx) =>
      tp.id === selectedTpFilter ||
      tp.code === selectedTpFilter ||
      `idx-${idx}` === selectedTpFilter,
  );
  const currentSelectedTp =
    currentSelectedTpIndex >= 0 ? activeTpList[currentSelectedTpIndex] : null;
  const currentSelectedTpBadge = currentSelectedTp
    ? `TP ${currentSelectedTpIndex + 1}`
    : 'TP Terpilih';

  return (
    <div className="space-y-5">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200">
        <div>
          <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Kelola Misi Pembelajaran Kelas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Misi yang dipublikasikan hanya akan diterima oleh murid di kelas target yang Anda tentukan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Filter selector for Mission Table */}
          <select
            value={targetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Kelas {c.className}
              </option>
            ))}
          </select>

          <button
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Misi Baru</span>
          </button>

          {/* Tombol Pilih TP */}
          <div className="relative" ref={tpDropdownRef}>
            <button
              type="button"
              id="btn-pilih-tp"
              onClick={() => setIsTpDropdownOpen((prev) => !prev)}
              className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                selectedTpFilter !== 'all'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800 ring-2 ring-indigo-200/50'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Target className="w-4 h-4 text-indigo-600" />
              <span>
                {selectedTpFilter === 'all'
                  ? 'Pilih TP'
                  : `Pilih TP: ${currentSelectedTpBadge}`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isTpDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isTpDropdownOpen && (
              <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-72 sm:w-84 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    Pilih TP
                  </span>
                  {selectedTpFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTpFilter('all');
                        setIsTpDropdownOpen(false);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                    >
                      Reset (Semua TP)
                    </button>
                  )}
                </div>

                <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTpFilter('all');
                      setIsTpDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selectedTpFilter === 'all'
                        ? 'bg-indigo-50 font-bold text-indigo-700'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <span>Semua TP (Tampilkan Seluruh Misi)</span>
                    {selectedTpFilter === 'all' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  {activeTpList.map((tp, idx) => {
                    const tpKey = tp.id || tp.code || `idx-${idx}`;
                    const isSelected =
                      selectedTpFilter === tp.id ||
                      selectedTpFilter === tp.code ||
                      selectedTpFilter === `idx-${idx}`;
                    return (
                      <button
                        type="button"
                        key={tp.id || idx}
                        onClick={() => {
                          setSelectedTpFilter(tpKey);
                          setIsTpDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 font-bold text-indigo-800 border border-indigo-200'
                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                              TP {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">{tp.code}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 font-normal">
                            {tp.title}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner informasi jika filter TP aktif */}
      {selectedTpFilter !== 'all' && (
        <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-slate-700">
              Menampilkan hanya misi untuk <strong>TP {currentSelectedTpIndex + 1} ({currentSelectedTp?.code})</strong> — {displayMissions.length} misi aktif. Misi TP lain disembunyikan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTpFilter('all')}
            className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition-colors cursor-pointer shrink-0"
          >
            Tampilkan Semua TP
          </button>
        </div>
      )}

      {/* Missions Grid */}
      <div className="space-y-3">
        {displayMissions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            Tidak ada misi untuk filter TP yang dipilih. Klik tombol "Buat Misi Baru" untuk menambahkan misi pada TP ini.
          </div>
        ) : (
          displayMissions.map((m) => {
          const isPublished = m.status === 'PUBLISHED';
          return (
            <div
              key={m.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isPublished
                  ? 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs'
                  : 'bg-slate-50/80 border-slate-200/80 opacity-80'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {m.coreTitle}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded-md border border-indigo-200">
                    TP: {m.tpCode || (m.coreMissionNumber <= 2 ? 'TP-FIS-01' : m.coreMissionNumber <= 4 ? 'TP-FIS-02' : 'TP-FIS-03')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    {m.timeAllocationJp || 2} JP ({m.timeAllocationMinutes || (m.timeAllocationJp ? m.timeAllocationJp * 45 : 90)}m)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Kelas {m.className}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Tenggat: {m.dueDate || 'Sesuai Rencana'}
                  </span>
                </div>

                <h4 className="font-display font-bold text-slate-800 text-base">
                  {m.title}
                </h4>

                <p className="text-xs text-slate-600 max-w-2xl line-clamp-2">
                  {m.description}
                </p>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                {/* Publish Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    isPublished
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Klik untuk ubah status Publish / Draft"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPublished ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{isPublished ? 'Published' : 'Draft'}</span>
                </button>

                <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>+{m.xpReward} XP</span>
                </div>

                <button
                  onClick={() => openEditModal(m)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                  title="Edit Misi"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(m.id, m.title)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title="Hapus Misi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>

      {/* CREATE / EDIT MISSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 to-purple-700 text-white flex items-center justify-between shrink-0">
              <h3 className="font-display font-bold text-sm sm:text-base">
                {editingMission ? 'Edit Misi Pembelajaran' : 'Buat Misi Pembelajaran Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
              {validationError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Judul Misi
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Analisis Dinamika Termal & Efisiensi Pendinginan Kolektor Surya"
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Deskripsi & Arahan Murid
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan tujuan tugas, langkah penyelidikan, dan indikator saintifik yang diharapkan..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-200 text-xs"
                />
              </div>

              {/* Pilihan TP dan Alokasi Waktu Misi */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-indigo-950 block mb-1">
                      Tujuan Pembelajaran (TP) Terkait *
                    </label>
                    <select
                      value={selectedTpId}
                      onChange={(e) => setSelectedTpId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-indigo-200 text-xs font-semibold bg-white focus:border-indigo-500 outline-hidden"
                    >
                      <option value="">-- Pilih Tujuan Pembelajaran --</option>
                      {tpList.map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          [{tp.code}] {tp.title.slice(0, 28)}... ({tp.allocatedJp || 2} JP - Target: {tp.targetMissionCount || 2} Misi)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-indigo-950 block mb-1">
                      Alokasi Waktu Misi Ini *
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((jp) => (
                        <button
                          type="button"
                          key={jp}
                          onClick={() => setTimeAllocationJp(jp)}
                          className={`h-9 px-1 text-[11px] sm:text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center truncate cursor-pointer ${
                            timeAllocationJp === jp
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {jp} JP ({jp * 45}m)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-700">
                  ⚡ Alokasi waktu ini berkontribusi langsung pada total JP Capaian Pembelajaran ({selectedTpId ? tpList.find(t => t.id === selectedTpId)?.allocatedJp || 4 : 4} JP).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tahapan 6 Misi Utama
                  </label>
                  <select
                    value={coreNumber}
                    onChange={(e) => setCoreNumber(Number(e.target.value) as MissionCoreNumber)}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value={1}>M1 — Pahami Konsep</option>
                    <option value={2}>M2 — Selesaikan Masalah Nyata</option>
                    <option value={3}>M3 — Simulasi & Eksperimen</option>
                    <option value={4}>M4 — Permainan Edukasi</option>
                    <option value={5}>M5 — Refleksi & Penilaian Diri</option>
                    <option value={6}>M6 — Asesmen Akhir</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Target Kelas
                  </label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KONTEN SPESIFIK BERDASARKAN 6 KATEGORI MISI SESUAI ALUR GURU */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">
                      Pengaturan Konten Misi (Kategori: {coreTitlesMap[Number(coreNumber) as MissionCoreNumber]})
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Sesuaikan masukan materi, link Google Drive, game, atau soal sesuai jenis misi yang dipilih.
                    </p>
                  </div>
                </div>

                {/* KATEGORI 1: MISI PAHAMI KONSEP (2-4 Tautan Materi Digital + Teks Modul Bacaan) */}
                {coreNumber === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          1. Tautan Materi Digital ({m1Links.length} Tautan — Mendukung 2 sampai 4 Tautan)
                        </label>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          Google Drive / Video YouTube / Web
                        </span>
                      </div>

                      <div className="space-y-2">
                        {m1Links.map((link, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                                  {idx + 1}
                                </span>
                                Tautan {idx + 1} {idx < 2 ? '(Wajib/Utama)' : '(Tambahan)'}
                              </span>
                              {m1Links.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setM1Links(m1Links.filter((_, i) => i !== idx));
                                  }}
                                  className="text-rose-500 hover:text-rose-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                                  title="Hapus tautan ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Hapus
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <div className="sm:col-span-3">
                                <select
                                  value={link.type}
                                  onChange={(e) => {
                                    const updated = [...m1Links];
                                    updated[idx].type = e.target.value as any;
                                    setM1Links(updated);
                                  }}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-slate-50/50 font-medium"
                                >
                                  <option value="pdf">📄 Dokumen PDF / Drive</option>
                                  <option value="video">🎥 Video (YouTube/Drive)</option>
                                  <option value="link">🔗 Tautan Artikel / Web</option>
                                </select>
                              </div>
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  value={link.title}
                                  onChange={(e) => {
                                    const updated = [...m1Links];
                                    updated[idx].title = e.target.value;
                                    setM1Links(updated);
                                  }}
                                  placeholder={`Judul Tautan ${idx + 1} (cth: Modul Pokok / Video Animasi)`}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                                />
                              </div>
                              <div className="sm:col-span-5">
                                <input
                                  type="url"
                                  value={link.url}
                                  onChange={(e) => {
                                    const updated = [...m1Links];
                                    updated[idx].url = e.target.value;
                                    setM1Links(updated);
                                  }}
                                  placeholder="https://drive.google.com/... atau https://youtu.be/..."
                                  className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {m1Links.length < 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (m1Links.length < 4) {
                              setM1Links([...m1Links, { type: 'link', title: '', url: '' }]);
                            }
                          }}
                          className="w-full py-2 px-3 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl text-blue-600 hover:text-blue-700 bg-blue-50/40 hover:bg-blue-50/80 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Kolom Tautan ({m1Links.length}/4)
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        2. Modul Bacaan Teks Langsung (Dapat dibaca murid langsung di aplikasi)
                      </label>
                      <textarea
                        rows={3}
                        value={readingModuleText}
                        onChange={(e) => setReadingModuleText(e.target.value)}
                        placeholder="Tuliskan ringkasan materi, teori pokok, rumus esensial, atau penjelasan konsep penting untuk dibaca murid..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* KATEGORI 2: MISI SELESAIKAN MASALAH NYATA (Studi Kasus, Pertanyaan Pemantik, Data Pendukung, Panduan Analisis) */}
                {coreNumber === 2 && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-1">
                        <Target className="w-3.5 h-3.5 text-emerald-600" />
                        1. Studi Kasus / Masalah Nyata
                      </label>
                      <textarea
                        rows={2}
                        value={problemPrompt}
                        onChange={(e) => setProblemPrompt(e.target.value)}
                        placeholder="Contoh: Petani tambak garam menghadapi masalah lambatnya kristalisasi air laut pada musim penghujan akibat kelembaban tinggi..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-1">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        2. Pertanyaan Pemantik
                      </label>
                      <input
                        type="text"
                        value={triggerQuestions}
                        onChange={(e) => setTriggerQuestions(e.target.value)}
                        placeholder="Contoh: Bagaimana modifikasi kalorimeter dan pemanfaatan sensor IoT dapat mempercepat proses kristalisasi garam?"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          3. Data Pendukung / Parameter Lapangan:
                        </label>
                        <input
                          type="text"
                          value={supportingData}
                          onChange={(e) => setSupportingData(e.target.value)}
                          placeholder="Contoh: Suhu rata-rata = 29°C; Salinitas = 35 ppt; Kelembaban = 82%"
                          className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          Tautan Foto Masalah / Data Google Drive:
                        </label>
                        <input
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/... atau tautan file data"
                          className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        4. Panduan Analisis Saintifik
                      </label>
                      <textarea
                        rows={2}
                        value={analysisGuide}
                        onChange={(e) => setAnalysisGuide(e.target.value)}
                        placeholder="Panduan bagi murid: 1. Identifikasi variabel bebas dan terikat; 2. Rumuskan hipotesis; 3. Tuangkan solusi desain prototipe..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* KATEGORI 3: MISI SIMULASI (Panduan Praktikum / Langkah Kerja, Modul Eksperimen) */}
                {coreNumber === 3 && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Panduan Praktikum & Langkah Kerja Simulasi
                      </label>
                      <textarea
                        rows={3}
                        value={simulationSteps}
                        onChange={(e) => setSimulationSteps(e.target.value)}
                        placeholder="Tuliskan langkah-langkah kerja praktikum (misal: 1. Sambungkan probe sensor suhu; 2. Masukkan air panas 80°C; 3. Catat kurva kenaikan suhu di tabel; 4. Hitung azas Black)..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Link Modul Eksperimen / LKPD Google Drive (Opsional):
                      </label>
                      <input
                        type="url"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... dokumen LKPD panduan praktikum"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* KATEGORI 4: MISI GAME EDUKASI */}
                {coreNumber === 4 && (
                  <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200/80 text-xs text-purple-950 space-y-1.5 leading-relaxed">
                    <div className="flex items-center gap-2 font-bold text-purple-900">
                      <Gamepad2 className="w-4 h-4 text-purple-600" />
                      <span>Misi 4: Game Edukasi Terintegrasi</span>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      Murid dapat langsung memainkan game edukasi interaktif sains yang sudah disediakan oleh aplikasi di dashboard mereka. Nilai pengerjaan game akan otomatis terdata dan direkap pada penilaian kelas.
                    </p>
                  </div>
                )}

                {/* KATEGORI 5: MISI REFLEKSI DAN PENILAIAN DIRI */}
                {coreNumber === 5 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
                          <Brain className="w-4 h-4" />
                        </span>
                        <h6 className="font-bold text-amber-950 text-xs">
                          Alur Misi 5: Refleksi Metakognitif & Penilaian Diri Mandiri
                        </h6>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Pada Misi 5, murid tidak lagi mengerjakan soal drill/latihan pilihan ganda, melainkan melakukan refleksi metakognitif mendalam (4 aspek pertanyaan) dan evaluasi diri mandiri (Self-Assessment) menggunakan rubrik 4 kriteria serta komitmen belajar.
                      </p>
                    </div>

                    {/* 4 Butir Pertanyaan Panduan Refleksi */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          4 Pertanyaan Panduan Refleksi Metakognitif Murid
                        </label>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Dapat disesuaikan atau gunakan pertanyaan baku kurikulum
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">
                              1
                            </span>
                            Pertanyaan 1 — Konsep Bermakna yang Dipahami
                          </span>
                          <input
                            type="text"
                            value={reflectionQ1}
                            onChange={(e) => setReflectionQ1(e.target.value)}
                            placeholder="Konsep apa yang paling bermakna dan paling Anda pahami..."
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50/50"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">
                              2
                            </span>
                            Pertanyaan 2 — Kendala & Solusi Belajar
                          </span>
                          <input
                            type="text"
                            value={reflectionQ2}
                            onChange={(e) => setReflectionQ2(e.target.value)}
                            placeholder="Apa kendala atau kesulitan terbesar yang Anda hadapi..."
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50/50"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">
                              3
                            </span>
                            Pertanyaan 3 — Relevansi Nyata & Penerapan Konsep
                          </span>
                          <input
                            type="text"
                            value={reflectionQ3}
                            onChange={(e) => setReflectionQ3(e.target.value)}
                            placeholder="Bagaimana konsep yang dipelajari dapat diterapkan dalam kehidupan nyata..."
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50/50"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">
                              4
                            </span>
                            Pertanyaan 4 — Rencana Tindak Lanjut & Perbaikan
                          </span>
                          <input
                            type="text"
                            value={reflectionQ4}
                            onChange={(e) => setReflectionQ4(e.target.value)}
                            placeholder="Apa rencana tindak lanjut atau target pengembangan diri Anda..."
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rubrik Penilaian Diri (Self-Assessment 4 Aspek) */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          Rubrik Penilaian Diri Murid (Skala 1 - 4 Bintang)
                        </label>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Disesuaikan guru & otomatis terhubung ke Murid (Mode Online)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 1:</span>
                          <input
                            type="text"
                            value={rubricAspect1}
                            onChange={(e) => setRubricAspect1(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 2:</span>
                          <input
                            type="text"
                            value={rubricAspect2}
                            onChange={(e) => setRubricAspect2(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 3:</span>
                          <input
                            type="text"
                            value={rubricAspect3}
                            onChange={(e) => setRubricAspect3(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 4:</span>
                          <input
                            type="text"
                            value={rubricAspect4}
                            onChange={(e) => setRubricAspect4(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 5:</span>
                          <input
                            type="text"
                            value={rubricAspect5}
                            onChange={(e) => setRubricAspect5(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 6:</span>
                          <input
                            type="text"
                            value={rubricAspect6}
                            onChange={(e) => setRubricAspect6(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1 sm:col-span-2">
                          <span className="font-semibold text-slate-700 block text-[11px]">Aspek 7:</span>
                          <input
                            type="text"
                            value={rubricAspect7}
                            onChange={(e) => setRubricAspect7(e.target.value)}
                            className="w-full h-7 px-2 rounded-md border border-slate-300 text-xs bg-white font-medium"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        * Murid juga diwajibkan menuliskan komitmen pengembangan diri sebelum menyelesaikan refleksi ke portofolio.
                      </p>
                    </div>
                  </div>
                )}

                {/* KATEGORI 6: MISI ASESMEN AKHIR (6 Kategori Soal Lengkap: PG, PGK, Benar/Salah, Isian, Jodohkan, Urutkan) */}
                {coreNumber === 6 && (
                  <div className="space-y-3">
                    <QuestionMaker
                      questions={questions}
                      onChange={setQuestions}
                      mode="asesmen"
                      subjectName={currentSubject?.name || 'Fisika'}
                      topic={title || currentSubject?.name || 'Materi Pembelajaran'}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Status Rilis
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MissionStatus)}
                    className="w-full h-9 px-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Reward XP
                  </label>
                  <input
                    type="number"
                    step="25"
                    value={xpReward}
                    onChange={(e) => setXpReward(Number(e.target.value))}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tenggat Waktu
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 sticky bottom-0 bg-white z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  {editingMission ? 'Perbarui Misi' : 'Terbitkan Misi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Misi */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Hapus Misi Pembelajaran</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Apakah Anda yakin ingin menghapus misi{' '}
              <strong className="text-slate-800">"{deleteConfirm.title}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete-misi"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
