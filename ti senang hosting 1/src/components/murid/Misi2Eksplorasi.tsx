import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FlaskConical,
  Activity,
  Database,
  LineChart,
  BarChart2,
  ScatterChart,
  HelpCircle,
  FileCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Link,
  Zap,
  BookOpen,
  Target,
  Award,
  FileSpreadsheet,
  Download,
  RotateCw,
  Send,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage } from '../../services/storage';
import { STUDENT_DRIVE_FOLDER_URL } from '../../services/firebaseRealtime';
import { parseGoogleDriveUrl } from '../../utils/googleDrive';
import headerMisiBg from '../../assets/images/header_misi_bg.jpg';
import { exportMisi2ExperimentToPdf } from '../../utils/pdfExport';
import { compressImageFile, formatBytes, validateFileSize } from '../../utils/fileCompressor';
import {
  ExperimentRow,
  ExperimentData,
  AnalysisAnswers,
  PortfolioItem,
  PortfolioCategory,
  Subject,
  Mission,
} from '../../types';

// Fallback Tujuan Pembelajaran per mata pelajaran untuk menjamin keselarasan kurikulum
const FALLBACK_TPS: Record<string, Array<{ code: string; title: string; description: string }>> = {
  'sbj-fisika': [
    {
      code: 'TP-FIS-01',
      title: 'Penyelidikan Fenomena Suhu dan Kalor Virtual Lab',
      description: 'Menyelidiki laju perubahan suhu zat cair menggunakan kalorimeter dan sensor radiasi panas.',
    },
    {
      code: 'TP-FIS-02',
      title: 'Analisis Efisiensi Termodinamika & Energi Terbarukan',
      description: 'Mengevaluasi faktor penyerapan kalor pada kolektor surya dan sistem isolasi termal.',
    },
    {
      code: 'TP-FIS-03',
      title: 'Pengukuran Gelombang & Frekuensi Resonansi Akustik',
      description: 'Menganalisis karakteristik gelombang bunyi dan hubungan panjang gelombang terhadap frekuensi.',
    },
  ],
  'sbj-kimia': [
    {
      code: 'TP-KIM-01',
      title: 'Penyelidikan Laju Reaksi & Termokimia Larutan',
      description: 'Mengukur perubahan kalor reaksi eksoterm dan endoterm melalui kalorimeter larutan.',
    },
    {
      code: 'TP-KIM-02',
      title: 'Pengaruh Konsentrasi & Katalis Terhadap Kesetimbangan Kimia',
      description: 'Menganalisis pergeseran arah kesetimbangan Le Chatelier secara visual dan numerik.',
    },
  ],
  'sbj-biologi': [
    {
      code: 'TP-BIO-01',
      title: 'Pengamatan Laju Transpirasi & Fisiologi Tumbuhan',
      description: 'Menyelidiki pengaruh intensitas cahaya dan kelembaban terhadap laju transpirasi tanaman.',
    },
    {
      code: 'TP-BIO-02',
      title: 'Analisis Enzim Katalase pada Metabolisme Sel',
      description: 'Mengamati pengaruh pH dan suhu terhadap efektivitas kerja enzim pengurai hidrogen peroksida.',
    },
  ],
  'sbj-mat-lanjut': [
    {
      code: 'TP-MAT-01',
      title: 'Pemodelan Garis Regresi Linear Data Bivariat',
      description: 'Menentukan persamaan regresi linear, menghitung koefisien korelasi determinasi R², dan interpolasi.',
    },
    {
      code: 'TP-MAT-02',
      title: 'Aplikasi Vektor dan Matriks dalam Transformasi Geometri',
      description: 'Memodelkan pergerakan koordinat spasial dan analisis matriks determinan.',
    },
  ],
  'sbj-informatika': [
    {
      code: 'TP-INF-01',
      title: 'Akuisisi Data Sensor Mikroprosesor IoT',
      description: 'Mengambil data suhu, kelembaban, dan intensitas cahaya menggunakan mikrokontroler digital.',
    },
    {
      code: 'TP-INF-02',
      title: 'Visualisasi Data Saintifik & Analisis Algoritma',
      description: 'Membangun grafik telemetri real-time dan analisis statistik bivariat.',
    },
  ],
  'sbj-integrasi': [
    {
      code: 'TP-INT-01',
      title: 'Penyelidikan Fenomena Saintifik Interdisipliner MIPA',
      description: 'Menyelidiki masalah kontekstual MIPA secara terpadu melalui eksperimen, pemodelan matematis, dan analisis data.',
    },
    {
      code: 'TP-INT-02',
      title: 'Proyek Kolaboratif Rekayasa & Solusi Berkelanjutan',
      description: 'Menerapkan integrasi konsep fisika, kimia, biologi, dan matematika dalam proyek inovasi sains.',
    },
  ],
};

interface Misi2EksplorasiProps {
  studentId: string;
  studentName?: string;
  classId?: string;
  className?: string;
  missionId: string;
  mission?: any;
  initialStep?: StepType;
  onNavigateToLab?: () => void;
  onCompleted?: () => void;
  onNextMission?: (nextMissionNumber: number) => void;
  onClose?: () => void;
}

type StepType = 'OBSERVE' | 'EXPERIMENT' | 'COLLECT' | 'ANALYZE' | 'CONCLUDE' | 'REFLECT';
type GraphType = 'BAR' | 'LINE' | 'SCATTER';

export const Misi2Eksplorasi: React.FC<Misi2EksplorasiProps> = ({
  studentId,
  studentName = 'Murid MIPA',
  classId = 'cls-xii-1',
  className = 'XII-1',
  missionId,
  mission,
  initialStep,
  onNavigateToLab,
  onCompleted,
  onNextMission,
  onClose,
}) => {
  // Hubungkan data Misi 2 riil dari props mission atau dari storage (diberikan / diatur oleh guru)
  const currentMission: Mission | undefined = useMemo(() => {
    if (mission && (mission.problemPrompt || mission.title || mission.description)) {
      return mission;
    }
    const allMissions = storage.getMissions();
    const byId = allMissions.find((m) => m.id === missionId);
    if (byId && (byId.problemPrompt || byId.description)) return byId;
    const byClass = allMissions.find(
      (m) => m.coreMissionNumber === 2 && (m.classId === classId || !m.classId)
    );
    if (byClass && (byClass.problemPrompt || byClass.description)) return byClass;
    return byId || byClass || allMissions.find((m) => m.coreMissionNumber === 2) || mission;
  }, [mission, missionId, classId]);

  const contextualProblem =
    currentMission?.problemPrompt?.trim() ||
    currentMission?.description?.trim() ||
    'Saat kita menaruh bejana berisi air di bawah sumber panas radiatif (seperti lampu halogen atau cahaya matahari terfokus), kita merasakan bahwa air perlahan menjadi hangat. Tetapi mengapa laju kenaikan suhu tidak selalu sama setiap saat? Dan bagaimana energi radiasi berpindah ke molekul air?';

  const [activeStep, setActiveStep] = useState<StepType>(() => {
    if (initialStep) return initialStep;
    try {
      const pending = localStorage.getItem('tisenang_misi2_active_step') as StepType | null;
      if (pending) {
        localStorage.removeItem('tisenang_misi2_active_step');
        return pending;
      }
    } catch {
      // ignore
    }
    return 'OBSERVE';
  });

  useEffect(() => {
    if (initialStep) {
      setActiveStep(initialStep);
    }
  }, [initialStep]);

  // Graph Type & Regression State
  const [graphType, setGraphType] = useState<GraphType>('LINE');
  const [showRegression, setShowRegression] = useState<boolean>(false);

  // Input Mode: 'MANUAL' | 'SIMULATION'
  const [inputMode, setInputMode] = useState<'MANUAL' | 'SIMULATION'>('SIMULATION');

  // Table rows (data dummy dihapus - data diisi dari eksperimen Misi 3 atau input manual)
  const [tableRows, setTableRows] = useState<ExperimentRow[]>([]);

  // Sensor data state
  const [hasSensorData, setHasSensorData] = useState<boolean>(false);
  const [sensorSessionInfo, setSensorSessionInfo] = useState<string>('');

  // 4 Analisis questions
  const [analysis, setAnalysis] = useState<AnalysisAnswers>({
    q1_amat: '',
    q2_pola: '',
    q3_sebabSuhu: '',
    q4_hubunganVariabel: '',
  });

  // Conclusion and Reflection
  const [conclusion, setConclusion] = useState('');
  const [reflection, setReflection] = useState('');

  // Portfolio form states matching UploadPortfolioModal
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sbj-fisika');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('Fisika Eksperimental & Terapan');
  const [category, setCategory] = useState<PortfolioCategory>('Eksperimen');
  const [availableTps, setAvailableTps] = useState<Array<{ code: string; title: string }>>([]);
  const [selectedTpCode, setSelectedTpCode] = useState<string>('TP-FIS-01');
  const [selectedTpTitle, setSelectedTpTitle] = useState<string>('Penyelidikan Fenomena Suhu dan Kalor Virtual Lab');
  const [customTp, setCustomTp] = useState<string>('');
  const [isCustomTp, setIsCustomTp] = useState<boolean>(false);
  const [reportMode, setReportMode] = useState<'upload' | 'write' | 'both'>('both');
  const [laporanCatatan, setLaporanCatatan] = useState<string>('');

  // Portfolio settings & upload fields
  const [portfolioTitle, setPortfolioTitle] = useState(
    'Laporan Eksperimen: Kalor dan Kenaikan Suhu Air',
  );
  const [laporanUrl, setLaporanUrl] = useState('');
  const [dokumentasiUrl, setDokumentasiUrl] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<{
    name: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoCompressionInfo, setPhotoCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isSavedToPortfolio, setIsSavedToPortfolio] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Tab Mode: Online / Offline
  const [activeMenu, setActiveMenu] = useState<'online' | 'offline'>('online');

  // Menu Pengiriman Laporan: 'pdf' | 'portfolio' | null
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<'pdf' | 'portfolio' | null>(null);

  useEffect(() => {
    if (activeMenu === 'offline') {
      setSelectedDeliveryMethod('pdf');
    }
  }, [activeMenu]);

  // Load subjects from storage
  useEffect(() => {
    let loadedSubjects = storage.getSubjects();
    if (!loadedSubjects || loadedSubjects.length === 0) {
      loadedSubjects = [];
    }
    if (!loadedSubjects.some((s) => s.id === 'sbj-integrasi' || s.name.toLowerCase().includes('integrasi'))) {
      loadedSubjects = [
        ...loadedSubjects,
        { id: 'sbj-integrasi', name: 'Integrasi Mata Pelajaran', code: 'INT-MIPA', category: 'Integrasi' as any },
      ];
    }
    setSubjects(loadedSubjects);
    const fisika = loadedSubjects.find((s) => s.id === 'sbj-fisika') || loadedSubjects[0];
    setSelectedSubjectId(fisika.id);
    setSelectedSubjectName(fisika.name);
  }, []);

  // Sync Tujuan Pembelajaran when subject changes
  useEffect(() => {
    if (!selectedSubjectId) return;

    const fromStorage = storage.getTujuanPembelajaran(selectedSubjectId);
    let tps: Array<{ code: string; title: string }> = [];

    if (fromStorage && fromStorage.length > 0) {
      tps = fromStorage.map((tp) => ({ code: tp.code, title: tp.title }));
    } else if (FALLBACK_TPS[selectedSubjectId]) {
      tps = FALLBACK_TPS[selectedSubjectId].map((tp) => ({ code: tp.code, title: tp.title }));
    } else {
      tps = [
        { code: 'TP-01', title: 'Penyelidikan Konsep Saintifik & Analisis Eksperimen' },
        { code: 'TP-02', title: 'Aplikasi Prinsip MIPA dalam Pemecahan Masalah' },
      ];
    }

    setAvailableTps(tps);
    if (tps.length > 0) {
      setSelectedTpCode(tps[0].code);
      setSelectedTpTitle(tps[0].title);
      setIsCustomTp(false);
    }
  }, [selectedSubjectId]);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjId = e.target.value;
    setSelectedSubjectId(subjId);
    const subjObj = subjects.find((s) => s.id === subjId);
    if (subjObj) {
      setSelectedSubjectName(subjObj.name);
    }
  };

  const handleTpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setIsCustomTp(true);
      setSelectedTpCode('TP-KUSTOM');
      setSelectedTpTitle(customTp || 'Tujuan Pembelajaran Mandiri');
    } else {
      setIsCustomTp(false);
      const found = availableTps.find((tp) => tp.code === val);
      if (found) {
        setSelectedTpCode(found.code);
        setSelectedTpTitle(found.title);
      }
    }
  };

  const handlePhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah berkas gambar (.jpg, .png, .webp).');
      return;
    }
    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
      alert(sizeCheck.error);
      return;
    }
    setIsCompressingPhoto(true);
    try {
      const res = await compressImageFile(file, {
        maxWidth: 720,
        maxHeight: 720,
        quality: 0.6,
        targetMaxSizeBytes: 60 * 1024,
      });

      setUploadedPhoto({
        name: file.name,
        size: res.compressedSize,
        dataUrl: res.dataUrl,
      });

      setPhotoCompressionInfo({
        originalSize: res.originalSize,
        compressedSize: res.compressedSize,
        savingsPercent: res.savingsPercent,
      });
    } catch (err) {
      console.warn('Gagal kompres foto:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPhoto({
          name: file.name,
          size: file.size,
          dataUrl: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  // Linear Regression & Correlation Math
  const regressionStats = useMemo(() => {
    const valid = tableRows.filter((r) => !isNaN(r.waktu) && !isNaN(r.suhuAkhir));
    const n = valid.length;
    if (n < 2) {
      return {
        m: 0,
        c: 25,
        r: 0,
        r2: 0,
        equation: 'ŷ = 0x + 25',
        correlationDesc: 'Data belum memadai (minimal 2 titik data)',
        interpretasiFisis: 'Lakukan pengamatan lebih dari 2 titik waktu untuk analisis korelasi.',
      };
    }

    const sumX = valid.reduce((acc, r) => acc + r.waktu, 0);
    const sumY = valid.reduce((acc, r) => acc + r.suhuAkhir, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let ssXX = 0;
    let ssYY = 0;
    let ssXY = 0;

    valid.forEach((r) => {
      const dx = r.waktu - meanX;
      const dy = r.suhuAkhir - meanY;
      ssXX += dx * dx;
      ssYY += dy * dy;
      ssXY += dx * dy;
    });

    const m = ssXX !== 0 ? ssXY / ssXX : 0;
    const c = meanY - m * meanX;
    const denom = Math.sqrt(ssXX * ssYY);
    const r = denom !== 0 ? ssXY / denom : 0;
    const r2 = r * r;

    let correlationDesc = 'Korelasi Sangat Kuat Positif (Searah)';
    let interpretasiFisis =
      'Kenaikan suhu sebanding dengan durasi pemanasan (Q = m·c·ΔT). Laju penyerapan kalor radiasi berlangsung stabil.';
    if (r >= 0.95) {
      correlationDesc = 'Korelasi Sangat Kuat Positif (Sangat Linier, r ≈ ' + r.toFixed(3) + ')';
    } else if (r >= 0.75) {
      correlationDesc = 'Korelasi Kuat Positif (r = ' + r.toFixed(3) + ')';
    } else if (r >= 0.4) {
      correlationDesc = 'Korelasi Sedang Positif (r = ' + r.toFixed(3) + ')';
    } else {
      correlationDesc = 'Korelasi Lemah / Fluktuatif (r = ' + r.toFixed(3) + ')';
    }

    const sign = c >= 0 ? '+' : '-';
    const equation = `ŷ = ${m.toFixed(3)}x ${sign} ${Math.abs(c).toFixed(2)}`;

    return {
      m,
      c,
      r,
      r2,
      equation,
      correlationDesc,
      interpretasiFisis,
    };
  }, [tableRows]);

  // Deteksi jenis materi eksperimen/simulasi yang tersinkronisasi
  const isMathRegression = useMemo(() => {
    return tableRows.some(
      (r) =>
        r.materi === 'regresi_linear' ||
        (r.sourceSubject && r.sourceSubject.toLowerCase().includes('regresi')) ||
        (r.catatan && r.catatan.toLowerCase().includes('regresi'))
    );
  }, [tableRows]);

  const isThermalSimulation = useMemo(() => {
    return tableRows.some(
      (r) =>
        r.materi === 'suhu_kalor' ||
        (r.sourceSubject && r.sourceSubject.toLowerCase().includes('kalor')) ||
        (r.catatan && r.catatan.toLowerCase().includes('daya'))
    );
  }, [tableRows]);

  // Skala sumbu Y grafik adaptif terhadap rentang data observasi riil
  const { minGraphY, maxGraphY } = useMemo(() => {
    if (tableRows.length === 0) return { minGraphY: 20, maxGraphY: 50 };
    const yVals = tableRows.map((r) => r.suhuAkhir).filter((v) => typeof v === 'number' && !isNaN(v));
    if (yVals.length === 0) return { minGraphY: 20, maxGraphY: 50 };
    const minRaw = Math.min(...yVals);
    const maxRaw = Math.max(...yVals);
    const min = Math.max(0, Math.floor((minRaw - 5) / 10) * 10);
    const max = Math.max(min + 10, Math.ceil((maxRaw + 5) / 10) * 10);
    return { minGraphY: min, maxGraphY: max };
  }, [tableRows]);

  // Memuat data eksperimen dari Misi 3 (Kit TI SENANG / Virtual Lab)
  const loadExperimentData = () => {
    let rowsToUse: ExperimentRow[] | null = null;
    let sourceDesc = 'Virtual Lab / Kit TI SENANG';
    let timeStampToUse = Date.now();

    // 1. Coba ambil dari local cache terbaru yang tersimpan saat eksperimen/simulasi disimpan
    try {
      const stored = localStorage.getItem('tisenang_latest_experiment_rows');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rowsToUse = parsed;
          sourceDesc =
            parsed[0]?.sourceSubject ||
            (parsed[0]?.materi === 'regresi_linear'
              ? 'Matematika (Regresi Linear)'
              : 'Eksperimen / Simulasi Misi 3');
        }
      }
    } catch {
      // ignore
    }

    // 2. Jika belum ada dari cache, coba ambil dari storage sesi eksperimen
    if (!rowsToUse || rowsToUse.length === 0) {
      const session =
        storage.getStudentExperimentSession(studentId, missionId) ||
        storage.getStudentExperimentSession(studentId, 'msn-cls-xii-1-3') ||
        storage.getStudentExperimentSession(studentId, `msn-${classId}-3`) ||
        storage.getStudentExperimentSession(studentId, `msn-${classId}-2`) ||
        storage.getStudentExperimentSession(studentId);

      if (session && session.rows && session.rows.length > 0) {
        rowsToUse = session.rows;
        sourceDesc =
          session.source === 'SPREADSHEET'
            ? 'Kit TI SENANG (IoT)'
            : session.rows[0]?.sourceSubject || 'Virtual Lab';
        timeStampToUse = new Date(session.completedAt || session.recordedAt || Date.now()).getTime();
      }
    }

    if (rowsToUse && rowsToUse.length > 0) {
      setTableRows(rowsToUse);
      setHasSensorData(true);
      setInputMode('SIMULATION');
      setSensorSessionInfo(
        `${rowsToUse.length} titik data ${sourceDesc} (${new Date(timeStampToUse).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })})`
      );
      return true;
    } else {
      setHasSensorData(false);
      return false;
    }
  };

  // Sesuai permintaan: hapus data otomatis yang terisi di Misi 2 Tahap 3
  // Tabel dimulai dalam kondisi kosong bersih; siswa dapat menekan tombol sinkron jika ingin mengambil data
  useEffect(() => {
    setTableRows([]);
    setHasSensorData(false);
    setSensorSessionInfo('');
  }, [studentId, missionId, classId]);

  // Handler untuk menghapus / mengosongkan data tabel secara manual
  const handleClearTable = () => {
    setTableRows([]);
    setHasSensorData(false);
    setSensorSessionInfo('');
    try {
      localStorage.removeItem('tisenang_latest_experiment_rows');
    } catch {
      // ignore
    }
  };

  // Listener event real-time ketika data disimpan dari Misi 3
  useEffect(() => {
    const handleExpSaved = (e: any) => {
      const detail = e?.detail;
      if (detail?.rows && Array.isArray(detail.rows) && detail.rows.length > 0) {
        setTableRows(detail.rows);
        setHasSensorData(true);
        setInputMode('SIMULATION');
        const src = detail.rows[0]?.sourceSubject || 'Misi 3';
        setSensorSessionInfo(`${detail.rows.length} titik data eksperimen tersinkron otomatis dari ${src}`);
        if (detail.step) {
          setActiveStep(detail.step);
        } else {
          setActiveStep('COLLECT');
        }
      } else {
        loadExperimentData();
        setActiveStep('COLLECT');
      }
    };

    window.addEventListener('tisenang_experiment_saved', handleExpSaved);
    return () => {
      window.removeEventListener('tisenang_experiment_saved', handleExpSaved);
    };
  }, []);

  // Handler to refresh / switch to simulation or sensor data
  const handleFetchSensorData = () => {
    const success = loadExperimentData();
    if (!success) {
      setHasSensorData(false);
      setInputMode('SIMULATION');
    }
  };

  const handleManualRowChange = (index: number, field: keyof ExperimentRow, value: number) => {
    if (inputMode === 'SIMULATION') return; // Read-only in simulation mode
    setTableRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddNewRow = () => {
    setTableRows((prev) => {
      const last = prev[prev.length - 1];
      const nextWaktu = last ? last.waktu + 5 : 0;
      const suhuAwal = last ? last.suhuAwal : 25.0;
      const intensitasCahaya = last ? last.intensitasCahaya : 500;
      const suhuAkhir = last ? last.suhuAkhir + 3.0 : 25.0;
      return [...prev, { waktu: nextWaktu, suhuAwal, intensitasCahaya, suhuAkhir }];
    });
  };

  const handleExportExcel = () => {
    if (tableRows.length === 0) {
      alert('Tabel data eksperimen masih kosong.');
      return;
    }
    try {
      const dataForExport = tableRows.map((r, i) => {
        if (isMathRegression) {
          return {
            No: i + 1,
            'Variabel Bebas (X)': r.waktu,
            'Variabel Terikat (Y)': r.suhuAkhir,
            'Prediksi Garis (ŷ)': r.param3 || (regressionStats.m ? Number((regressionStats.m * r.waktu + regressionStats.c).toFixed(2)) : '-'),
            'Residual & Keterangan': r.catatan || `Residual e = ${(r.suhuAkhir - (regressionStats.m * r.waktu + regressionStats.c)).toFixed(2)}`,
          };
        }
        if (isThermalSimulation) {
          return {
            No: i + 1,
            'Waktu / Durasi (detik)': r.param1 || `${r.waktu} dtk`,
            'Suhu Awal (°C)': Number(r.suhuAwal.toFixed(2)),
            'Penguapan / Kalor': r.param3 || `${r.kalorTerukur} Joule`,
            'Suhu Akhir (°C)': Number(r.suhuAkhir.toFixed(2)),
            Kondisi: r.catatan || '-',
          };
        }
        return {
          No: i + 1,
          'Waktu (detik/menit)': r.waktu,
          'Suhu Awal (°C)': Number(r.suhuAwal.toFixed(2)),
          'Intensitas Cahaya (Lux)': r.intensitasCahaya,
          'Suhu Akhir (°C)': Number(r.suhuAkhir.toFixed(2)),
          Catatan: r.catatan || '-',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataForExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil_Eksperimen_Misi2');

      const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Eksperimen_Misi2_${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Gagal mengekspor data ke Excel:', err);
      alert('Gagal mendownload file Excel.');
    }
  };

  // Download Dokumen Laporan Misi 2 ke PDF
  const handleDownloadPdfReport = () => {
    try {
      const finalReport = laporanCatatan.trim() || reflection.trim() || 'Laporan hasil eksperimen penyelidikan kalor dan suhu air.';
      const finalTpTitle = isCustomTp ? (customTp.trim() || 'Tujuan Pembelajaran Mandiri') : selectedTpTitle;
      exportMisi2ExperimentToPdf({
        studentName: (studentName || 'Murid').replace(/\s*\([^)]*\)/g, '').trim(),
        className: className || 'XII-1',
        subjectName: selectedSubjectName,
        missionTitle: currentMission?.title || 'Misi 2 • Selesaikan Masalah',
        portfolioTitle: portfolioTitle.trim() || 'Laporan Hasil Penyelidikan & Eksperimen MIPA',
        tpCode: selectedTpCode,
        tpTitle: finalTpTitle,
        contextualProblem,
        tableRows,
        regressionStats,
        analysisAnswers: analysis,
        laporanCatatan: finalReport,
        conclusion: conclusion.trim() || 'Laju perubahan suhu sebanding dengan durasi pemanasan.',
        photoDataUrl: uploadedPhoto?.dataUrl,
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Gagal mencetak PDF:', err);
      alert('Gagal mendownload PDF laporan.');
    }
  };

  // Simpan data portofolio ke storage & Firebase tasks
  const executeSavePortfolio = () => {
    const unifiedExperimentData: ExperimentData = {
      experimentId: `exp-${studentId}-${Date.now()}`,
      studentId,
      missionId,
      inputMode,
      rows: tableRows,
      timestamp: new Date().toISOString(),
    };

    const finalReport = laporanCatatan.trim() || reflection.trim() || 'Laporan hasil eksperimen penyelidikan kalor dan suhu air.';
    const finalReflection = reflection.trim() || finalReport;
    const finalTpTitle = isCustomTp ? (customTp.trim() || 'Tujuan Pembelajaran Mandiri') : selectedTpTitle;

    let docMedia = uploadedPhoto?.dataUrl || undefined;
    if (!docMedia && laporanUrl.trim()) {
      const parsed = parseGoogleDriveUrl(laporanUrl.trim());
      docMedia = parsed.directImageUrl || parsed.previewUrl || laporanUrl.trim();
    }

    const driveFolderLink = activeMenu === 'offline' ? undefined : (laporanUrl.trim() || STUDENT_DRIVE_FOLDER_URL);

    const newPortfolioItem: PortfolioItem = {
      id: `pf-${Date.now()}`,
      studentId,
      studentName: (studentName || 'Murid').replace(/\s*\([^)]*\)/g, '').trim(),
      classId,
      className,
      title: portfolioTitle.trim(),
      subjectName: selectedSubjectName,
      subjectId: selectedSubjectId,
      missionId,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      category,
      xpEarned: 150,
      visibility: 'CLASS',
      reflectionSummary: `${finalTpTitle ? `[Tujuan: ${selectedTpCode} - ${finalTpTitle}] ` : ''}${finalReport}${driveFolderLink ? ` [Tautan Google Drive: ${driveFolderLink}]` : ''}`,
      content: finalReport,
      conclusion: conclusion.trim(),
      documentation: docMedia,
      laporanUrl: driveFolderLink,
      dokumentasiUrl: docMedia,
      driveLink: driveFolderLink,
      analysisAnswers: analysis,
      experimentData: unifiedExperimentData,
      portfolioEvidence: {
        completed: true,
        category: 'experiment',
        hasData: tableRows.length > 0,
        hasGraph: true,
        hasConclusion: !!conclusion.trim(),
        hasReflection: !!finalReflection.trim(),
      },
      likesCount: 0,
      likedBy: {},
      comments: [],
      createdAt: new Date().toISOString(),
      isFeatured: false,
    };

    // 1. Simpan ke portfolio di storage & Firebase
    storage.savePortfolio(newPortfolioItem);

    // 2. Simpan juga ke Firebase Realtime Database node /tugas_siswa
    storage.submitStudentTask({
      id: `task-${Date.now()}`,
      missionId,
      studentId: studentId || 'std-current',
      studentName: (studentName || 'Murid').replace(/\s*\([^)]*\)/g, '').trim(),
      classId: classId || 'cls-xii-1',
      className: className || 'XII-1',
      submittedAt: new Date().toISOString(),
      content: `${portfolioTitle.trim()}\n${finalReport}\nKesimpulan: ${conclusion.trim()}`,
      driveLink: driveFolderLink,
      fileAttachment: docMedia,
      status: 'SUBMITTED',
      tpId: selectedTpCode,
    });
  };

  // Selesaikan Misi 2 dan Otomatis Buka Misi 4
  const handleFinishMisi2 = () => {
    const deliveryMethod = activeMenu === 'offline' ? 'pdf' : selectedDeliveryMethod;
    if (!deliveryMethod) {
      alert('Silakan pilih salah satu menu pengiriman terlebih dahulu: Simpan PDF atau Kirim Portofolio.');
      return;
    }

    if (!portfolioTitle.trim()) {
      alert('Mohon masukkan Judul Portofolio.');
      return;
    }

    if (!conclusion.trim()) {
      alert('Mohon tuliskan Kesimpulan dari eksperimen atau penyelidikan ini.');
      return;
    }

    // 1. Jika memilih Simpan PDF, unduh berkas PDF
    if (deliveryMethod === 'pdf') {
      handleDownloadPdfReport();
    }

    // 2. Simpan portofolio ke storage & database guru
    executeSavePortfolio();

    // 3. Selesaikan Misi 2 (dan Misi 3) di database
    storage.completeMission(studentId, missionId, 100, 150);
    const m3Id = `msn-${classId}-3`;
    storage.completeMission(studentId, m3Id, 100, 150);

    // 4. Trigger events agar data muncul seketika di Beranda Guru, Beranda Teman Lain, dan Profil Siswa
    window.dispatchEvent(new CustomEvent('tisenang_portfolios_updated'));
    window.dispatchEvent(new CustomEvent('tisenang_missions_updated'));

    // 5. Evaluasi jawaban analisis untuk kemungkinan sisipan rekomendasi ALME
    const answersLength = Object.values(analysis).join(' ').length;
    if (answersLength < 60) {
      storage.addAlmeRecommendation({
        studentId,
        type: 'Reasoning',
        title: 'Penguatan Analisis Kausalitas & Regresi Data',
        message: 'Hasil analisis eksperimen Anda perlu diperdalam keterkaitannya dengan persamaan regresi linear.',
        actionText: 'Pelajari Modul Analisis',
        xpReward: 50,
      } as any);
    }

    setIsSavedToPortfolio(true);

    if (onCompleted) {
      onCompleted();
    }

    // "setelah itu jika sudah memilih salah satu klik selesaikan misi maka otomatis misi 4 akan terbuka"
    if (onNextMission) {
      onNextMission(4);
    } else if (onClose) {
      onClose();
    }
  };

  const handleSaveToPortfolio = handleFinishMisi2;

  const stepsList: { key: StepType; label: string; num: string }[] = [
    { key: 'OBSERVE', label: 'Masalah', num: '1' },
    { key: 'EXPERIMENT', label: 'Eksperimen', num: '2' },
    { key: 'COLLECT', label: 'Kumpul Data', num: '3' },
    { key: 'ANALYZE', label: 'Analisis', num: '4' },
    { key: 'CONCLUDE', label: 'Simpulkan', num: '5' },
    { key: 'REFLECT', label: 'Upload Portofolio', num: '6' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full min-w-0 pb-12 sm:pb-8">
      {/* Header Banner - Selaras dengan Tampilan Misi & Responsif */}
      <div
        style={{
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.65)), url(${headerMisiBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden border border-blue-400/30 pr-10 sm:pr-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            {/* 1. Tulisan: Misi 2 . Selesaikan Masalah */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />
              <span>Misi 2 . Selesaikan Masalah</span>
            </div>

            {/* 2. Menu Online dan Offline dibawah tulisan Misi 2.selesaikan masalah */}
            <div className="flex items-center p-1 bg-black/30 backdrop-blur-md rounded-xl border border-white/25 w-fit gap-1 my-2 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveMenu('online')}
                className={`px-4 sm:px-5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
                  activeMenu === 'online'
                    ? 'bg-white text-blue-900 shadow-md font-extrabold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => setActiveMenu('offline')}
                className={`px-4 sm:px-5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
                  activeMenu === 'offline'
                    ? 'bg-white text-blue-900 shadow-md font-extrabold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Offline
              </button>
            </div>

            {/* 3. Deskripsi Singkat */}
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Selesaikan tantangan masalah kontekstual MIPA melalui penyelidikan saintifik, kumpulkan data eksperimen, dan unggah laporan portofolio.
            </p>
          </div>

          {/* 4. XP Reward */}
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur border border-white/30 text-white self-start sm:self-auto shrink-0 shadow-xs">
            +{currentMission?.xpReward || 150} XP Reward
          </span>
        </div>
      </div>

      {/* Konten Menu Online dan Offline */}
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Judul Misi di luar header (Hanya di online, di offline tidak ada header judul masalah) */}
        {activeMenu === 'online' && (
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-700/80 shadow-md">
            <h1 className="text-lg sm:text-2xl font-display font-extrabold text-white tracking-tight break-words">
              {currentMission?.title || 'Eksperimen Suhu & Kalor Virtual Lab'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Mata Pelajaran: {currentMission?.subjectName || selectedSubjectName || 'Fisika'} • {className ? `Kelas ${className}` : 'Fase F (Kelas XII)'}
            </p>
          </div>
        )}

        {/* 6 Flow Steps Indicator: Langsung muncul di offline */}
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-700/80 shadow-md">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {stepsList.map((step) => {
              const isActive = activeStep === step.key;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setActiveStep(step.key)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-102 font-extrabold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <span className="text-[10px] opacity-75">Tahap {step.num}</span>
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      {/* STEP 1: OBSERVE */}
      {activeStep === 'OBSERVE' && (
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-4 sm:space-y-5 text-white">
          <div className="flex items-center gap-3 text-cyan-400">
            <Eye className="w-6 h-6 shrink-0" />
            <h2 className="font-display font-bold text-white text-base sm:text-lg">
              {activeMenu === 'offline' ? 'Tahap 1: Masalah Kontekstual' : 'Bacalah Masalah Kontekstual berikut !'}
            </h2>
          </div>

          <div className="p-4 sm:p-5 bg-slate-800/80 rounded-2xl border border-slate-700/70 text-xs sm:text-sm text-slate-200 leading-relaxed">
            {activeMenu === 'offline' ? (
              <p className="font-semibold text-white text-sm sm:text-base">
                Bacalah Masalah Kontekstual yang diberikan gurumu!
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="font-bold text-white text-sm sm:text-base">
                    {currentMission?.title || 'Masalah Kontekstual:'}
                  </p>
                  <p className="whitespace-pre-line text-slate-300 leading-relaxed">
                    {contextualProblem}
                  </p>
                </div>

                {currentMission?.triggerQuestions && (
                  <div className="pt-2.5 border-t border-slate-700 text-xs space-y-0.5">
                    <p className="font-bold text-cyan-300">Pertanyaan Pemantik:</p>
                    <p className="italic text-slate-300 leading-relaxed">{currentMission.triggerQuestions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              id="btn-lanjut-ke-misi3-dari-tahap1"
              type="button"
              onClick={() => {
                if (onNavigateToLab) {
                  onNavigateToLab();
                } else {
                  setActiveStep('EXPERIMENT');
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Lanjut ke Tahap 2: Eksperimen (Masuk ke Misi 3)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: EXPERIMENT (Mengarahkan ke Misi 3) */}
      {activeStep === 'EXPERIMENT' && (
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-4 sm:space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <Activity className="w-6 h-6 shrink-0" />
              <div>
                <h2 className="font-display font-bold text-white text-base sm:text-lg">
                  Tahap 2: Pelaksanaan Eksperimen di Laboratorium (Misi 3)
                </h2>
                <p className="text-xs text-slate-400">
                  Eksperimen dilakukan di ruang laboratorium sensor Kit TI SENANG atau Simulasi Virtual Lab Misi 3.
                </p>
              </div>
            </div>

            {onNavigateToLab && (
              <button
                id="btn-masuk-misi3-header"
                type="button"
                onClick={onNavigateToLab}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Masuk ke Misi 3</span>
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 space-y-4 text-white">
            <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Petunjuk Alur Eksperimen & Pengumpulan Data:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/70 shadow-xs space-y-1.5">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-900/50 text-cyan-200 text-[11px] font-black flex items-center justify-center">1</span>
                  Masuk ke Misi 3
                </span>
                <p className="text-slate-300">
                  Lakukan eksperimen sensor di Misi 3 (Kit Sensor IoT TI SENANG atau Simulasi Virtual Lab) untuk merekam data.
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/70 shadow-xs space-y-1.5">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-900/50 text-emerald-200 text-[11px] font-black flex items-center justify-center">2</span>
                  Download Excel (.xlsx)
                </span>
                <p className="text-slate-300">
                  Setelah semua data eksperimen muncul, Anda dapat mendownload data dalam bentuk file <strong>Microsoft Excel (.xlsx)</strong> (bukan CSV).
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/70 shadow-xs space-y-1.5">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-900/50 text-indigo-200 text-[11px] font-black flex items-center justify-center">3</span>
                  Simpan ke Database Misi
                </span>
                <p className="text-slate-300">
                  Klik tombol <strong>"Simpan ke Database Misi Murid"</strong> di Misi 3. Sistem akan otomatis kembali ke <strong>Misi 2 Tahap 3 (Kumpul Data)</strong> dan tabel terisi otomatis!
                </p>
              </div>
            </div>

            {hasSensorData ? (
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-500/40 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Data eksperimen telah tersimpan! ({sensorSessionInfo})</span>
              </div>
            ) : null}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {onNavigateToLab && (
                <button
                  id="btn-masuk-misi3-banner"
                  type="button"
                  onClick={onNavigateToLab}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Buka Eksperimen (Masuk ke Misi 3)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                id="btn-ke-tahap3"
                type="button"
                onClick={() => setActiveStep('COLLECT')}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Lihat Tahap 3: Kumpul Data →</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep('OBSERVE')}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              ← Kembali ke Tahap 1: Amati
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COLLECT DATA */}
      {activeStep === 'COLLECT' && (
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-5 sm:space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Tahap 3: Pengumpulan Data & Visualisasi (Collect Data)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tabel hasil eksperimen dari Misi 3 terisi secara otomatis setelah Anda menyimpan eksperimen.
              </p>
            </div>

            {/* Actions: Mode & Sync */}
            <div className="flex flex-wrap items-center gap-2">
              {tableRows.length > 0 && (
                <>
                  <button
                    id="btn-download-excel-misi2"
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Download data tabel dalam format Microsoft Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Excel (.xlsx)</span>
                  </button>

                  <button
                    id="btn-hapus-tabel-misi2"
                    type="button"
                    onClick={handleClearTable}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Hapus / Kosongkan semua data tabel pengamatan ini"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Kosongkan Tabel</span>
                  </button>
                </>
              )}

              <button
                id="btn-sinkron-misi3"
                type="button"
                onClick={handleFetchSensorData}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Sinkronkan ulang data dari Misi 3"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Sinkronkan Data Misi 3</span>
              </button>

              <div className="flex items-center gap-1 p-1 bg-slate-800/90 rounded-xl border border-slate-700/80">
                <button
                  id="btn-mode-simulation"
                  type="button"
                  onClick={() => {
                    handleFetchSensorData();
                    setInputMode('SIMULATION');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    inputMode === 'SIMULATION'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📡 OTOMATIS (MISI 3)
                </button>
                <button
                  id="btn-mode-manual"
                  type="button"
                  onClick={() => setInputMode('MANUAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    inputMode === 'MANUAL'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✍️ MANUAL
                </button>
              </div>
            </div>
          </div>

          {/* Info Status Sinkronisasi */}
          {hasSensorData && (
            <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-500/30 flex items-center justify-between text-xs text-blue-200 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Data eksperimen berhasil tersinkronisasi otomatis: {sensorSessionInfo}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/30 font-mono font-bold text-[11px]">
                {tableRows.length} Baris Data
              </span>
            </div>
          )}

          {/* Table Container */}
          <div className="space-y-3">
            {tableRows.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/60 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-700 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto shadow-xs">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h4 className="font-bold text-white text-sm">
                    Tabel Data Eksperimen Masih Kosong
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Data dummy pada Misi 2 telah dihapus. Silakan lakukan eksperimen di <strong>Misi 3</strong> (Virtual Lab atau Kit TI SENANG) dan klik tombol <strong>"Simpan ke Database Misi Murid"</strong> agar tabel terisi otomatis di sini.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  {onNavigateToLab && (
                    <button
                      id="btn-kosong-ke-misi3"
                      type="button"
                      onClick={onNavigateToLab}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span>Masuk ke Misi 3 (Lakukan Eksperimen)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFetchSensorData}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cek Data Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('MANUAL');
                      handleAddNewRow();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Input Baris Manual</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Mode aktif: <strong className="text-slate-200">{inputMode === 'SIMULATION' ? 'Tersinkron Otomatis (Misi 3)' : 'Manual (Dapat diedit)'}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {inputMode === 'MANUAL' && (
                      <button
                        type="button"
                        onClick={handleAddNewRow}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Baris</span>
                      </button>
                    )}
                    <span className="text-slate-400 font-mono">{tableRows.length} Titik Pengamatan</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-700/80 shadow-md">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">
                          {isMathRegression ? 'Variabel Bebas (X)' : 'Waktu / Durasi'}
                        </th>
                        <th className="py-2.5 px-3">
                          {isMathRegression ? 'Variabel Terikat (Y)' : 'Suhu Awal (°C)'}
                        </th>
                        <th className="py-2.5 px-3">
                          {isMathRegression
                            ? 'Prediksi Garis (ŷ)'
                            : isThermalSimulation
                            ? 'Penguapan / Kalor'
                            : 'Intensitas Cahaya (Lux)'}
                        </th>
                        <th className="py-2.5 px-3 text-emerald-400 font-bold">
                          {isMathRegression
                            ? 'Residual & Keterangan'
                            : 'Suhu Akhir Terukur (°C)'}
                        </th>
                        {inputMode === 'MANUAL' && <th className="py-2.5 px-3 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {tableRows.map((row, idx) => {
                        const yPred = isMathRegression
                          ? (row.param3 && row.param3 !== '-'
                              ? row.param3
                              : regressionStats.m !== 0 || regressionStats.c !== 0
                              ? `ŷ = ${(regressionStats.m * row.waktu + regressionStats.c).toFixed(2)}`
                              : '-')
                          : null;
                        const residualNote = isMathRegression
                          ? (row.catatan || `Residual e = ${(row.suhuAkhir - (regressionStats.m * row.waktu + regressionStats.c)).toFixed(2)}`)
                          : null;

                        return (
                          <tr key={idx} className="hover:bg-slate-800/60 transition-colors">
                            <td className="py-2 px-3 text-slate-500 font-sans font-medium">{idx + 1}</td>
                            
                            {/* Kolom 1: Waktu atau Variabel Bebas X */}
                            <td className="py-2 px-3 font-bold text-slate-200">
                              {inputMode === 'SIMULATION' ? (
                                isMathRegression ? (
                                  <span className="font-mono text-indigo-400 font-bold">{row.waktu}</span>
                                ) : (
                                  row.param1 || `${row.waktu} dtk`
                                )
                              ) : (
                                <input
                                  type="number"
                                  value={row.waktu}
                                  onChange={(e) =>
                                    handleManualRowChange(idx, 'waktu', Number(e.target.value))
                                  }
                                  className="w-16 h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </td>

                            {/* Kolom 2: Suhu Awal atau Variabel Terikat Y */}
                            <td className="py-2 px-3 text-slate-300 font-bold">
                              {inputMode === 'SIMULATION' ? (
                                isMathRegression ? (
                                  <span className="font-mono text-blue-400 font-bold">{row.suhuAkhir}</span>
                                ) : (
                                  `${row.suhuAwal.toFixed(1)} °C`
                                )
                              ) : (
                                <input
                                  type="number"
                                  step="0.5"
                                  value={row.suhuAwal}
                                  onChange={(e) =>
                                    handleManualRowChange(idx, 'suhuAwal', Number(e.target.value))
                                  }
                                  className="w-20 h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </td>

                            {/* Kolom 3: Intensitas Cahaya / Penguapan / Prediksi ŷ */}
                            <td className="py-2 px-3 text-slate-300">
                              {inputMode === 'SIMULATION' ? (
                                isMathRegression ? (
                                  <span className="font-mono text-cyan-400 font-bold">{yPred}</span>
                                ) : isThermalSimulation ? (
                                  <span className="text-amber-300 font-mono">{row.param3 || `${row.kalorTerukur} Joule`}</span>
                                ) : (
                                  `${row.intensitasCahaya} Lux`
                                )
                              ) : (
                                <input
                                  type="number"
                                  step="50"
                                  value={row.intensitasCahaya}
                                  onChange={(e) =>
                                    handleManualRowChange(
                                      idx,
                                      'intensitasCahaya',
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-24 h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </td>

                            {/* Kolom 4: Suhu Akhir Terukur (°C) atau Residual & Keterangan */}
                            <td className="py-2 px-3 font-bold text-emerald-400">
                              {inputMode === 'SIMULATION' ? (
                                isMathRegression ? (
                                  <span className="text-xs text-slate-300 font-sans">{residualNote}</span>
                                ) : (
                                  `${row.suhuAkhir.toFixed(1)} °C`
                                )
                              ) : (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={row.suhuAkhir}
                                  onChange={(e) =>
                                    handleManualRowChange(idx, 'suhuAkhir', Number(e.target.value))
                                  }
                                  className="w-24 h-8 px-2 rounded-lg bg-slate-800 border border-emerald-500/50 font-mono font-bold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              )}
                            </td>

                            {inputMode === 'MANUAL' && (
                              <td className="py-2 px-3 text-center font-sans">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTableRows((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1 rounded text-rose-400 hover:bg-rose-950/50 text-xs font-bold transition-colors cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  ✕
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic SVG Graph with Graph Type Selection & Linear Regression */}
          <div className="p-4 sm:p-5 bg-slate-800/80 rounded-2xl sm:rounded-3xl border border-slate-700/70 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300 border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <LineChart className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-bold text-white text-sm block">
                    Visualisasi Data Eksperimen Sains
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Pilih tipe grafik untuk menganalisis tren data
                  </span>
                </div>
              </div>

              {/* Graph Type Switcher */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setGraphType('BAR')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    graphType === 'BAR'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Diagram Batang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGraphType('LINE')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    graphType === 'LINE'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Diagram Garis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGraphType('SCATTER')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    graphType === 'SCATTER'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ScatterChart className="w-3.5 h-3.5" />
                  <span>Diagram Pencar</span>
                </button>
              </div>
            </div>

            {/* If SCATTER is chosen, provide button "Buat Garis Regresi" */}
            {graphType === 'SCATTER' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/80 border border-blue-500/30">
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-blue-300 block">
                    Mode Diagram Pencar (Scatter Plot) Aktif
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Gunakan garis regresi linier terbaik (Line of Best Fit) untuk memodelkan hubungan matematis.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRegression(!showRegression)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer ${
                    showRegression
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{showRegression ? '✓ Sembunyikan Garis Regresi' : '📐 Buat Garis Regresi'}</span>
                </button>
              </div>
            )}

            {/* SVG Canvas */}
            <div className="h-56 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Y-axis grid lines */}
                {[30, 70, 110, 150].map((y) => (
                  <line
                    key={y}
                    x1="45"
                    y1={y}
                    x2="480"
                    y2={y}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Axes */}
                <line x1="45" y1="150" x2="480" y2="150" stroke="#94a3b8" strokeWidth="2" />
                <line x1="45" y1="20" x2="45" y2="150" stroke="#94a3b8" strokeWidth="2" />

                {/* Y-axis labels */}
                <text x="38" y="35" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  {maxGraphY}{isMathRegression ? '' : '°C'}
                </text>
                <text x="38" y="90" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  {Math.round((maxGraphY + minGraphY) / 2)}{isMathRegression ? '' : '°C'}
                </text>
                <text x="38" y="150" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  {minGraphY}{isMathRegression ? '' : '°C'}
                </text>

                {/* Empty State in Graph */}
                {tableRows.length === 0 && (
                  <text
                    x="260"
                    y="90"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="sans-serif"
                  >
                    Belum ada data eksperimen untuk digambarkan pada grafik
                  </text>
                )}

                {/* DIAGRAM BATANG (BAR CHART) */}
                {graphType === 'BAR' &&
                  tableRows.map((r, i) => {
                    const x = 60 + (i / Math.max(1, tableRows.length - 1)) * 390;
                    const yRange = Math.max(1, maxGraphY - minGraphY);
                    const barHeight = Math.max(4, Math.min(130, ((r.suhuAkhir - minGraphY) / yRange) * 120));
                    const y = 150 - barHeight;
                    const barWidth = Math.min(36, 360 / tableRows.length);
                    return (
                      <g key={i}>
                        <rect
                          x={x - barWidth / 2}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          fill="url(#barGradient)"
                          stroke="#10b981"
                          strokeWidth="1.5"
                        />
                        <text
                          x={x}
                          y={y - 6}
                          textAnchor="middle"
                          fill="#6ee7b7"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {isMathRegression ? r.suhuAkhir : `${r.suhuAkhir}°C`}
                        </text>
                        <text
                          x={x}
                          y="166"
                          textAnchor="middle"
                          fill="#cbd5e1"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {isMathRegression ? r.waktu : `${r.waktu}s`}
                        </text>
                      </g>
                    );
                  })}

                {/* DIAGRAM GARIS (LINE CHART) */}
                {graphType === 'LINE' && (
                  <>
                    {tableRows.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        points={tableRows
                          .map((r, i) => {
                            const x = 60 + (i / Math.max(1, tableRows.length - 1)) * 390;
                            const yRange = Math.max(1, maxGraphY - minGraphY);
                            const y = 150 - Math.min(130, Math.max(0, ((r.suhuAkhir - minGraphY) / yRange) * 120));
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}
                    {tableRows.map((r, i) => {
                      const x = 60 + (i / Math.max(1, tableRows.length - 1)) * 390;
                      const yRange = Math.max(1, maxGraphY - minGraphY);
                      const y = 150 - Math.min(130, Math.max(0, ((r.suhuAkhir - minGraphY) / yRange) * 120));
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="5" fill="#34d399" stroke="#ffffff" strokeWidth="2" />
                          <text
                            x={x}
                            y={y - 8}
                            textAnchor="middle"
                            fill="#6ee7b7"
                            fontSize="9.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {isMathRegression ? r.suhuAkhir : `${r.suhuAkhir}°C`}
                          </text>
                          <text
                            x={x}
                            y="166"
                            textAnchor="middle"
                            fill="#cbd5e1"
                            fontSize="9.5"
                            fontFamily="monospace"
                          >
                            {isMathRegression ? r.waktu : `${r.waktu}s`}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}

                {/* DIAGRAM PENCAR (SCATTER PLOT) */}
                {graphType === 'SCATTER' && (
                  <>
                    {/* Linear Regression Line if toggled */}
                    {showRegression && tableRows.length > 1 && (
                      <>
                        {(() => {
                          const x1 = 60;
                          const x2 = 450;
                          const rFirst = tableRows[0];
                          const rLast = tableRows[tableRows.length - 1];
                          const yVal1 = regressionStats.m * rFirst.waktu + regressionStats.c;
                          const yVal2 = regressionStats.m * rLast.waktu + regressionStats.c;
                          const yRange = Math.max(1, maxGraphY - minGraphY);

                          const svgY1 = 150 - Math.min(130, Math.max(0, ((yVal1 - minGraphY) / yRange) * 120));
                          const svgY2 = 150 - Math.min(130, Math.max(0, ((yVal2 - minGraphY) / yRange) * 120));

                          return (
                            <line
                              x1={x1}
                              y1={svgY1}
                              x2={x2}
                              y2={svgY2}
                              stroke="#f59e0b"
                              strokeWidth="3"
                              strokeDasharray="6 3"
                            />
                          );
                        })()}
                      </>
                    )}

                    {/* Scatter Dots */}
                    {tableRows.map((r, i) => {
                      const x = 60 + (i / Math.max(1, tableRows.length - 1)) * 390;
                      const yRange = Math.max(1, maxGraphY - minGraphY);
                      const y = 150 - Math.min(130, Math.max(0, ((r.suhuAkhir - minGraphY) / yRange) * 120));
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            fill="#7dd3fc"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {isMathRegression ? `(${r.waktu}, ${r.suhuAkhir})` : `(${r.waktu}s, ${r.suhuAkhir}°C)`}
                          </text>
                          <text
                            x={x}
                            y="166"
                            textAnchor="middle"
                            fill="#cbd5e1"
                            fontSize="9.5"
                            fontFamily="monospace"
                          >
                            {isMathRegression ? r.waktu : `${r.waktu}s`}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}

                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* HASIL ANALISIS REGRESI LINEAR (Jika Tombol Buat Garis Regresi Aktif) */}
            {graphType === 'SCATTER' && showRegression && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Sparkles className="w-4 h-4" />
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                      Hasil Analisis Matematis Regresi Linier & Korelasi Data
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/40">
                    Line of Best Fit: ŷ = mx + c
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Persamaan Model
                    </span>
                    <span className="font-mono text-xs font-black text-amber-400">
                      {regressionStats.equation}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Gradien Laju Kalor (m)
                    </span>
                    <span className="font-mono text-xs font-black text-emerald-400">
                      m = {regressionStats.m.toFixed(3)} °C/menit
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Korelasi Pearson (r)
                    </span>
                    <span className="font-mono text-xs font-black text-cyan-400">
                      r = {regressionStats.r.toFixed(3)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Determinasi (R²)
                    </span>
                    <span className="font-mono text-xs font-black text-purple-400">
                      R² = {(regressionStats.r2 * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/60 text-xs space-y-1">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>💡 Kesimpulan Analisis Korelasi:</span>
                    <span className="text-emerald-400">{regressionStats.correlationDesc}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {regressionStats.interpretasiFisis} Dengan nilai R² sebesar{' '}
                    <strong className="text-white">{(regressionStats.r2 * 100).toFixed(1)}%</strong>, variasi kenaikan suhu terbukti sangat kuat dipengaruhi secara linear oleh lama waktu radiasi kalor.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            <button
              onClick={() => setActiveStep('EXPERIMENT')}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={() => setActiveStep('ANALYZE')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Analisis Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ANALYZE (2 Mandatory Student Questions) */}
      {activeStep === 'ANALYZE' && (
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-5 sm:space-y-6 text-white">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Tahap 4: Analisis Data Kuantitatif (Analyze)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Jawablah 2 pertanyaan saintifik berikut berdasarkan tabel dan grafik data eksperimen/simulasi Anda.
            </p>
          </div>

          <div className="space-y-5">
            {/* Question 1 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                1. Apa yang kamu amati dari data eksperimen di atas?
              </label>
              <textarea
                rows={3}
                value={analysis.q1_amat}
                onChange={(e) => setAnalysis({ ...analysis, q1_amat: e.target.value })}
                placeholder="Tuliskan apa yang kamu amati dari tabel atau grafik data eksperimen di atas..."
                className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* Question 2 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                2. Tuliskan hasil analisis berdasarkan eksperimen/simulasi yang sudah kamu lakukan
              </label>
              <textarea
                rows={3}
                value={analysis.q2_analisis || analysis.q2_pola || ''}
                onChange={(e) =>
                  setAnalysis({ ...analysis, q2_analisis: e.target.value, q2_pola: e.target.value })
                }
                placeholder="Tuliskan analisis mendalam berdasarkan eksperimen atau simulasi yang sudah kamu lakukan..."
                className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            <button
              onClick={() => setActiveStep('COLLECT')}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={() => setActiveStep('CONCLUDE')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Kesimpulan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CONCLUDE */}
      {activeStep === 'CONCLUDE' && (
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-4 sm:space-y-5 text-white">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-400" />
              Tahap 5: Perumusan Kesimpulan Saintifik (Conclude)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rumuskan kesimpulan utama yang menjawab rumusan masalah secara lugas dan berbasis bukti data.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Kesimpulan Akhir Eksperimen:
            </label>
            <textarea
              rows={4}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="Contoh: Dari percobaan termodinamika ini, dapat disimpulkan bahwa intensitas radiasi cahaya berbanding lurus dengan laju penyerapan kalor, menghasilkan kenaikan suhu air yang stabil secara linear per satuan waktu..."
              className="w-full p-4 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            <button
              onClick={() => setActiveStep('ANALYZE')}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={() => setActiveStep('REFLECT')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Upload Portofolio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: UPLOAD PORTOFOLIO */}
      {activeStep === 'REFLECT' && (
        <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-5 sm:space-y-6 text-white">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Tahap 6: Upload Portofolio
              </h2>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1 shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                +150 XP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Unggah foto dokumentasi eksperimen, berkas laporan, atau tautan Google Drive dan simpan karya Anda ke Portofolio Murid.
            </p>
          </div>

          {/* Kotak Unggah Portofolio (Sama dengan Halaman Upload Portofolio di Profil) */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-800/80 border border-slate-700/70 space-y-4 shadow-md text-white">
            <div className="border-b border-slate-700/80 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>Unggah Portofolio Murid • Kelas {className}</span>
                </div>
                <h3 className="font-display font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Unggah Karya & Dokumentasi Portofolio</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Foto dokumentasi yang kamu upload akan ditampilkan langsung di Galeri Portofolio Beranda & Kelas.
                </p>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono">
                Terbuka untuk Kelas & Guru
              </span>
            </div>

            <div className="space-y-4">
              {/* 1. Pilih Mata Pelajaran */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Pilih Mata Pelajaran</span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  id="select-misi2-subject"
                  value={selectedSubjectId}
                  onChange={handleSubjectChange}
                  className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs cursor-pointer"
                >
                  {subjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Pilih Tujuan Pembelajaran */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>2. Pilih Tujuan Pembelajaran</span>
                    <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Sesuai Kurikulum</span>
                </label>
                <select
                  id="select-misi2-tp"
                  value={isCustomTp ? 'CUSTOM' : selectedTpCode}
                  onChange={handleTpChange}
                  className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs cursor-pointer"
                >
                  {availableTps.map((tp) => (
                    <option key={tp.code} value={tp.code}>
                      {tp.code}: {tp.title}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Tulis Tujuan Pembelajaran Mandiri / Kustom</option>
                </select>

                {/* Input custom TP bila dipilih */}
                {isCustomTp && (
                  <input
                    type="text"
                    value={customTp}
                    onChange={(e) => setCustomTp(e.target.value)}
                    placeholder="Tuliskan tujuan pembelajaran spesifik yang kamu tuju..."
                    className="mt-1.5 w-full h-9 px-3 rounded-xl border border-blue-500/50 bg-slate-900 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                )}
              </div>

              {/* Judul Portofolio */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Judul Portofolio / Eksperimen</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-misi2-portfolio-title"
                  type="text"
                  required
                  value={portfolioTitle}
                  onChange={(e) => setPortfolioTitle(e.target.value)}
                  placeholder="Contoh: Laporan Eksperimen: Kalor dan Kenaikan Suhu Air"
                  className="w-full h-9 px-3 rounded-xl border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-500 shadow-xs bg-slate-900"
                />
              </div>

              {/* 3. Upload Foto Dokumentasi & Laporan */}
              <div className="space-y-2.5 pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>3. Upload Foto Dokumentasi & Laporan</span>
                  </label>

                  {/* Mode Toggle */}
                  <div className="inline-flex rounded-lg bg-slate-900/80 border border-slate-700/80 p-0.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setReportMode('both')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        reportMode === 'both' ? 'bg-blue-600 text-white shadow-2xs font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Keduanya
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        reportMode === 'upload' ? 'bg-blue-600 text-white shadow-2xs font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Foto Saja
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportMode('write')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        reportMode === 'write' ? 'bg-blue-600 text-white shadow-2xs font-extrabold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tulis Laporan
                    </button>
                  </div>
                </div>

                {/* Area Upload Foto Dokumentasi (Muncul jika 'upload' atau 'both') */}
                {(reportMode === 'upload' || reportMode === 'both') && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={photoFileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoFile(file);
                      }}
                      className="hidden"
                    />

                    {isCompressingPhoto ? (
                      <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/20 p-6 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        <p className="text-xs font-bold text-emerald-800">
                          Mengompres foto eksperimen untuk Firebase...
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          Mengoptimalkan resolusi dan ukuran byte berkas.
                        </p>
                      </div>
                    ) : uploadedPhoto ? (
                      /* Visual Preview Foto yang Berhasil Diupload */
                      <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/50 bg-slate-900 group shadow-md max-h-48">
                        <div className="aspect-[21/9] w-full overflow-hidden">
                          <img
                            src={uploadedPhoto.dataUrl}
                            alt="Preview Foto Dokumentasi"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              {photoCompressionInfo ? `Terkompresi (${photoCompressionInfo.savingsPercent}% Lebih Hemat)` : 'Foto Terpasang'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedPhoto(null);
                                setPhotoCompressionInfo(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              Ganti Foto
                            </button>
                          </div>

                          <div className="text-white text-[11px] font-mono">
                            <p className="font-bold truncate">{uploadedPhoto.name}</p>
                            <p className="text-[9px] text-emerald-300 font-semibold">
                              {photoCompressionInfo
                                ? `${formatBytes(photoCompressionInfo.originalSize)} ➔ ${formatBytes(photoCompressionInfo.compressedSize)} (Hemat ${photoCompressionInfo.savingsPercent}%) • Siap ke Firebase`
                                : `${(uploadedPhoto.size / 1024).toFixed(1)} KB • Siap tampil di Galeri Portofolio Beranda`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Box Drag & Drop File Picker */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handlePhotoFile(file);
                        }}
                        onClick={() => photoFileInputRef.current?.click()}
                        className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isDraggingPhoto
                            ? 'border-blue-500 bg-blue-950/40 scale-[1.01]'
                            : 'border-slate-700 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900/90'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center shadow-inner">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Klik atau Tarik Foto Dokumentasi ke Sini
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Format JPG, PNG, atau WebP (Maksimal 2MB • Masuk ke Google Drive, bukan ke Firebase)
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                          📸 Foto ini menjadi cover portofoliomu di Beranda
                        </span>
                      </div>
                    )}

                    {/* Opsi Tautan Google Drive Dokumen / Foto (Hanya muncul di online) */}
                    {activeMenu === 'online' && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Link className="w-3 h-3 text-blue-400" />
                            <span>Tautan Berkas / Dokumen Tambahan (Opsional):</span>
                          </label>
                        </div>
                        <input
                          type="url"
                          value={laporanUrl}
                          onChange={(e) => setLaporanUrl(e.target.value)}
                          placeholder="https://... (tautan dokumen pendukung jika ada)"
                          className="w-full h-8 px-2.5 rounded-xl border border-slate-700 text-xs bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Area Isi Laporan / Catatan Pelaksanaan (Muncul jika 'write' atau 'both') */}
                {(reportMode === 'write' || reportMode === 'both') && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Isi Laporan / Catatan Pelaksanaan</span>
                    </label>
                    <textarea
                      id="textarea-misi2-laporan"
                      rows={3}
                      value={laporanCatatan}
                      onChange={(e) => {
                        setLaporanCatatan(e.target.value);
                        if (!reflection.trim()) setReflection(e.target.value);
                      }}
                      placeholder="Tuliskan prosedur pengamatan, data observasi, atau temuan sensor yang diperoleh selama penyelidikan..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-500 bg-slate-900 leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* 4. Tulis Kesimpulan */}
              <div className="space-y-1.5 pt-2 border-t border-slate-700/80">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>4. Tulis Kesimpulan Saintifik</span>
                    <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold font-mono">+150 XP</span>
                </label>
                <textarea
                  id="textarea-misi2-conclusion"
                  required
                  rows={3}
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Contoh: Berdasarkan data eksperimen kalorimeter, laju kenaikan suhu air berbanding lurus dengan durasi pemanasan dan kalor yang diserap (Q = m·c·ΔT)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500 shadow-xs bg-slate-900 leading-relaxed"
                />
              </div>

              {/* Menu Pengiriman Laporan: Di offline hanya ada pilihan Simpan File PDF, tidak ada menu Kirim Portofolio */}
              <div className="space-y-3 pt-3 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    <span>{activeMenu === 'offline' ? 'Pilihan Simpan File PDF' : 'Pilih Menu Pengiriman Laporan'}</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {activeMenu === 'offline' ? 'Dokumen PDF Laporan' : 'Pilih salah satu metode'}
                  </span>
                </div>

                {activeMenu === 'offline' ? (
                  /* Offline: Hanya ada pilihan Simpan File PDF, tidak ada menu Kirim Portofolio */
                  <div
                    onClick={() => setSelectedDeliveryMethod('pdf')}
                    className="p-3.5 rounded-2xl border-2 border-blue-500 bg-blue-950/60 shadow-md ring-2 ring-blue-500/30 text-white flex flex-col justify-between gap-2.5 cursor-pointer max-w-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 text-white">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-white">Simpan File PDF</h4>
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                            Dipilih
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Unduh dokumen PDF laporan resmi lengkap dengan data tabel, regresi, dan kesimpulan untuk disimpan secara offline ke komputer atau hp.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDeliveryMethod('pdf');
                        handleDownloadPdfReport();
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Berkas PDF</span>
                    </button>
                  </div>
                ) : (
                  /* Online: 2 Pilihan (1. Simpan PDF & 2. Kirim Portofolio) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Pilihan 1: Simpan PDF */}
                    <div
                      onClick={() => setSelectedDeliveryMethod('pdf')}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        selectedDeliveryMethod === 'pdf'
                          ? 'border-blue-500 bg-blue-950/60 shadow-md ring-2 ring-blue-500/30 text-white'
                          : 'border-slate-700 bg-slate-800/80 hover:border-slate-600 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedDeliveryMethod === 'pdf' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-white">1. Simpan PDF</h4>
                            {selectedDeliveryMethod === 'pdf' && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                Dipilih
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Unduh dokumen PDF laporan resmi lengkap dengan data tabel, regresi, dan kesimpulan.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDeliveryMethod('pdf');
                          handleDownloadPdfReport();
                        }}
                        className="w-full py-1.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Berkas PDF</span>
                      </button>
                    </div>

                    {/* Pilihan 2: Kirim Portofolio */}
                    <div
                      onClick={() => setSelectedDeliveryMethod('portfolio')}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        selectedDeliveryMethod === 'portfolio'
                          ? 'border-blue-500 bg-blue-950/60 shadow-md ring-2 ring-blue-500/30 text-white'
                          : 'border-slate-700 bg-slate-800/80 hover:border-slate-600 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedDeliveryMethod === 'portfolio' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-white">2. Kirim Portofolio</h4>
                            {selectedDeliveryMethod === 'portfolio' && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                Dipilih
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Kirim portofolio ke galeri kelas & database tugas guru untuk dinilai dan ditampilkan.
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] text-blue-300 bg-blue-950/40 py-1.5 px-2.5 rounded-xl border border-blue-500/30 text-center font-medium">
                        ✓ Sinkron ke Galeri & Penilaian Guru
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success Feedback or Save Action */}
          {isSavedToPortfolio ? (
            <div className="p-6 bg-slate-800/90 rounded-2xl border border-emerald-500/50 text-center space-y-3 text-white">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-display font-bold text-white text-base">
                Laporan & Dokumentasi Berhasil Disimpan ke Portofolio!
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                <strong>Misi 2 (Selesaikan Masalah)</strong> dan <strong>Misi 3 (Eksperimen)</strong> telah otomatis terselesaikan.
                Misi 4 (Game Pembelajaran) kini telah terbuka!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {onNextMission && (
                  <>
                    <button
                      id="btn-buka-misi-3"
                      type="button"
                      onClick={() => {
                        onNextMission(3);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Selesai Belajar dan Buka Misi 3</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      id="btn-buka-misi-4"
                      type="button"
                      onClick={() => {
                        onNextMission(4);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Lanjut ke Misi 4 (Game)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Tutup & Kembali ke Peta Misi
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-4 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveStep('CONCLUDE')}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                id="btn-selesaikan-misi-2"
                onClick={handleFinishMisi2}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesaikan Misi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};
