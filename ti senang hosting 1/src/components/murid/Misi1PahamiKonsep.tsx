import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  Video,
  ExternalLink,
  PenTool,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Mission } from '../../types';
import { storage } from '../../services/storage';
import { soundEffects } from '../../services/audio/soundEffects';
import { MateriRegresiLinear } from './materi/MateriRegresiLinear';
import { MateriMatematikaTransformasiFungsi } from './materi/MateriMatematikaTransformasiFungsi';
import { MateriFisikaKalor } from './materi/MateriFisikaKalor';
import { MateriKimiaStrukturAtom } from './materi/MateriKimiaStrukturAtom';
import { MateriBiologiPewarisanSifat } from './materi/MateriBiologiPewarisanSifat';
import headerMisiBg from '../../assets/images/header_misi_bg.jpg';

interface Misi1PahamiKonsepProps {
  studentId: string;
  missionId: string;
  mission?: Mission;
  onCompleted?: () => void;
  onNextMission?: (nextMissionNumber: number) => void;
  onClose?: () => void;
}

interface SingleQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export const Misi1PahamiKonsep: React.FC<Misi1PahamiKonsepProps> = ({
  studentId,
  missionId,
  mission,
  onCompleted,
  onNextMission,
  onClose,
}) => {
  // Tab Mode: Online / Offline
  const [activeMenu, setActiveMenu] = useState<'online' | 'offline'>('online');

  // Catatan informasi penting siswa dari bahan ajar
  const [catatanPenting, setCatatanPenting] = useState<string>(() => storage.getMisi1Notes(studentId) || '');

  // 1 Soal Mini Kuis Singkat AI yang dipastikan 100% selaras dengan Mata Pelajaran & TP aktif (tanpa mencampuradukkan materi)
  const defaultMiniQuiz: SingleQuizQuestion = useMemo(() => {
    const subId = (mission?.subjectId || '').toLowerCase();
    const subName = (mission?.subjectName || '').toLowerCase();

    if (subId.includes('kimia') || subName.includes('kimia')) {
      return {
        question:
          'Berdasarkan materi termokimia dan laju reaksi kimia: Apabila suatu sistem reaksi kimia melepaskan kalor ke lingkungan disertai kenaikan suhu lingkungan terukur (entalpi reaksi ΔH < 0), proses tersebut diklasifikasikan sebagai...',
        options: [
          'Reaksi eksoterm yang membebaskan kalor ke lingkungan',
          'Reaksi endoterm yang menyerap energi panas dari lingkungan',
          'Reaksi netral tanpa melibatkan perubahan energi ikat kimia',
          'Reaksi pengendapan spontan pada tekanan vakum mutlak',
        ],
        correctIndex: 0,
        hint: 'Perhatikan tanda entalpi (ΔH < 0) serta kenaikan suhu pada lingkungan.',
        explanation:
          'Tepat sekali! Pada reaksi eksoterm, sistem kimia melepaskan energi kalor ke lingkungan sehingga entalpi berkurang (ΔH < 0) dan suhu lingkungan meningkat.',
      };
    }

    if (subId.includes('biologi') || subName.includes('biologi')) {
      return {
        question:
          'Berdasarkan bahan ajar fisiologi tumbuhan: Mekanisme penguapan air melalui stomata daun yang menghasilkan daya hisap daun untuk mengalirkan air dan hara mineral dari akar ke seluruh jaringan adalah...',
        options: [
          'Transpirasi tumbuhan',
          'Gutasi melalui hidatoda',
          'Respirasi anaerob sel',
          'Siklus Calvin fotosintesis',
        ],
        correctIndex: 0,
        hint: 'Proses ini berlangsung secara dominan di permukaan stomata daun pada siang hari.',
        explanation:
          'Benar! Transpirasi adalah pelepasan uap air melalui stomata yang menciptakan tarikan kapilaritas xilem dari akar menuju daun.',
      };
    }

    if (subId.includes('informatika') || subName.includes('informatika')) {
      return {
        question:
          'Berdasarkan bahan ajar sistem tersemat dan IoT TI SENANG: Komponen fisis yang berfungsi mendeteksi besaran fisis (seperti suhu atau cahaya) lalu mengonversinya menjadi sinyal elektrik digital yang dapat diproses mikroprosesor adalah...',
        options: [
          'Sensor (Transduser Analog/Digital)',
          'Aktuator mekanik motor servo',
          'Kabel transmisi jaringan fiber optik',
          'Algoritma enkripsi asimetris',
        ],
        correctIndex: 0,
        hint: 'Perangkat ini menerima input dari lingkungan fisik di port input IoT.',
        explanation:
          'Tepat sekali! Sensor bertindak sebagai transduser yang menangkap fenomena fisis dan mengonversinya menjadi besaran elektrik yang terukur.',
      };
    }

    if (subId.includes('mat') || subName.includes('matematika')) {
      return {
        question:
          'Berdasarkan materi pemodelan regresi linear data bivariat ŷ = ax + b: Bagaimanakah interpretasi matematis yang paling presisi untuk koefisien kemiringan (gradien) "a"?',
        options: [
          'Taksiran perubahan nilai variabel terikat (ŷ) untuk setiap peningkatan 1 satuan pada variabel bebas (x)',
          'Nilai variabel terikat pada saat nilai variabel bebas x bernilai nol (titik potong)',
          'Total kuadrat galat acak dari seluruh titik data pada diagram pencar',
          'Jumlah observasi sampel yang diikutsertakan dalam estimasi garis',
        ],
        correctIndex: 0,
        hint: 'Kemiringan (slope) menyatakan laju perbandingan perubahan vertikal Δy terhadap perubahan horizontal Δx.',
        explanation:
          'Sangat tepat! Gradien kemiringan regresi mengukur rata-rata perubahan variabel respons ŷ saat variabel prediktor x bertambah sebesar satu satuan.',
      };
    }

    // Default: Fisika Eksperimental & Terapan (Azas Black & Kalor)
    return {
      question:
        'Berdasarkan bahan ajar konsep kalor dan azas Black: Pada sistem kalorimeter terisolasi ideal yang mencegah kebocoran energi termal ke lingkungan, bagaimanakah prinsip kekekalan energi kalor saat dua zat berbeda suhu dicampurkan?',
      options: [
        'Jumlah kalor yang dilepas oleh zat bersuhu lebih tinggi sama dengan jumlah kalor yang diserap zat bersuhu lebih rendah (Q_lepas = Q_terima)',
        'Suhu akhir campuran selalu sama dengan suhu zat yang memiliki massa lebih besar',
        'Kalor jenis kedua zat tersebut otomatis berubah menjadi identik',
        'Sebagian energi kalor akan hilang musnah menjadi gelombang suara',
      ],
      correctIndex: 0,
      hint: 'Gunakan prinsip kekekalan energi Azas Black: Q_lepas = Q_terima.',
      explanation:
        'Tepat sekali! Berdasarkan Azas Black, kalor yang dilepaskan oleh benda bersuhu tinggi secara matematis setara dengan kalor yang diserap oleh benda bersuhu lebih rendah tanpa adanya kehilangan energi ke lingkungan ideal.',
    };
  }, [mission?.subjectId, mission?.subjectName]);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [showSuccessCard, setShowSuccessCard] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const activeQuestion = defaultMiniQuiz;

  // Pilihan Mata Pelajaran Khusus Menu Offline: Semua, Matematika, Fisika, Kimia, Biologi
  type OfflineSubject = 'semua' | 'matematika' | 'fisika' | 'kimia' | 'biologi';
  type MathTopic = 'regresi' | 'transformasi';
  type OfflineBookId =
    | 'matematika-regresi'
    | 'matematika-transformasi'
    | 'fisika-kalor'
    | 'kimia-atom'
    | 'biologi-sifat';

  const initialOfflineSubject = useMemo<OfflineSubject>(() => {
    const subId = (
      mission?.subjectId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_subject_id') : null) ||
      'sbj-matematika'
    ).toLowerCase();
    const subName = (
      mission?.subjectName ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('tisenang_active_subject_name') : null) ||
      ''
    ).toLowerCase();

    if (subId.includes('mat') || subName.includes('matematika')) return 'matematika';
    if (subId.includes('kimia') || subName.includes('kimia')) return 'kimia';
    if (subId.includes('biologi') || subName.includes('biologi')) return 'biologi';
    return 'fisika';
  }, [mission?.subjectId, mission?.subjectName]);

  const [offlineSubject, setOfflineSubject] = useState<OfflineSubject>(initialOfflineSubject);
  const [selectedMathTopic, setSelectedMathTopic] = useState<MathTopic>('regresi');
  const [openedMaterial, setOpenedMaterial] = useState<OfflineBookId | null>(null);
  const [isSelectSubjectOpen, setIsSelectSubjectOpen] = useState<boolean>(false);

  const OFFLINE_SUBJECTS = [
    {
      id: 'semua' as const,
      name: 'Semua',
      topic: 'Perpustakaan Digital Seluruh Materi',
      icon: '📚',
    },
    {
      id: 'matematika' as const,
      name: 'Matematika',
      topic: 'Regresi Linear & Transformasi Fungsi',
      icon: '📐',
    },
    {
      id: 'fisika' as const,
      name: 'Fisika',
      topic: 'Suhu dan Kalor',
      icon: '🔬',
    },
    {
      id: 'kimia' as const,
      name: 'Kimia',
      topic: 'Struktur Atom & Ikatan Kimia',
      icon: '🧪',
    },
    {
      id: 'biologi' as const,
      name: 'Biologi',
      topic: 'Pewarisan Sifat',
      icon: '🧬',
    },
  ];

  const currentSubjectObj =
    OFFLINE_SUBJECTS.find((s) => s.id === offlineSubject) || OFFLINE_SUBJECTS[0];

  // Daftar Buku Bahan Ajar untuk Tampilan Perpustakaan Digital
  const OFFLINE_BOOKS = [
    {
      id: 'matematika-regresi' as const,
      subjectId: 'matematika' as const,
      subjectName: 'Matematika',
      badgeText: 'Matematika',
      title: 'REGRESI LINEAR',
      subtitle: 'Scatter Plot & Tren Data',
      icon: '📐',
      cardGradient: 'from-purple-950 via-indigo-950 to-slate-950',
      borderClass: 'border-purple-500/50 hover:border-purple-300',
      spineColor: 'border-l-purple-500',
      badgeClass: 'bg-purple-500/30 text-purple-200 border border-purple-400/30',
      titleColor: 'text-white group-hover:text-purple-200',
      subtitleColor: 'text-purple-300',
      btnClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    },
    {
      id: 'matematika-transformasi' as const,
      subjectId: 'matematika' as const,
      subjectName: 'Matematika',
      badgeText: 'Matematika',
      title: 'TRANSFORMASI FUNGSI',
      subtitle: 'Translasi & Skala Kurva',
      icon: '📈',
      tag: 'Baru',
      cardGradient: 'from-amber-500 via-yellow-400 to-amber-600',
      borderClass: 'border-yellow-300 hover:border-yellow-100',
      spineColor: 'border-l-amber-700',
      badgeClass: 'bg-slate-950 text-yellow-300',
      titleColor: 'text-slate-950',
      subtitleColor: 'text-slate-900 font-bold',
      btnClass: 'bg-slate-950 text-yellow-300 border border-yellow-400',
    },
    {
      id: 'fisika-kalor' as const,
      subjectId: 'fisika' as const,
      subjectName: 'Fisika',
      badgeText: 'Fisika',
      title: 'SUHU & KALOR',
      subtitle: 'Kalor & Perubahan Wujud',
      icon: '🔥',
      cardGradient: 'from-red-950 via-rose-950 to-amber-950',
      borderClass: 'border-amber-500/50 hover:border-amber-300',
      spineColor: 'border-l-red-500',
      badgeClass: 'bg-amber-400 text-red-950 font-black',
      titleColor: 'text-white group-hover:text-amber-200',
      subtitleColor: 'text-amber-300',
      btnClass: 'bg-gradient-to-r from-red-600 to-amber-600 text-white',
    },
    {
      id: 'kimia-atom' as const,
      subjectId: 'kimia' as const,
      subjectName: 'Kimia',
      badgeText: 'Kimia',
      title: 'STRUKTUR ATOM',
      subtitle: 'Geometri & Sifat Fisik',
      icon: '⚛️',
      cardGradient: 'from-blue-950 via-slate-900 to-red-950',
      borderClass: 'border-red-500/50 hover:border-blue-300',
      spineColor: 'border-l-blue-500',
      badgeClass: 'bg-blue-500/30 text-blue-200 border border-blue-400/30',
      titleColor: 'text-white group-hover:text-blue-200',
      subtitleColor: 'text-rose-300',
      btnClass: 'bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 text-white',
    },
    {
      id: 'biologi-sifat' as const,
      subjectId: 'biologi' as const,
      subjectName: 'Biologi',
      badgeText: 'Biologi',
      title: 'PEWARISAN SIFAT',
      subtitle: 'Hukum Mendel & DNA',
      icon: '🧬',
      cardGradient: 'from-emerald-950 via-teal-950 to-slate-950',
      borderClass: 'border-emerald-500/50 hover:border-emerald-300',
      spineColor: 'border-l-emerald-500',
      badgeClass: 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30',
      titleColor: 'text-white group-hover:text-emerald-200',
      subtitleColor: 'text-emerald-300',
      btnClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
    },
  ];

  const displayedBooks = useMemo(() => {
    if (offlineSubject === 'semua') return OFFLINE_BOOKS;
    return OFFLINE_BOOKS.filter((b) => b.subjectId === offlineSubject);
  }, [offlineSubject]);

  const activeOpenedBook = useMemo(() => {
    return OFFLINE_BOOKS.find((b) => b.id === openedMaterial) || null;
  }, [openedMaterial]);

  const getOfflinePlaceholder = () => {
    const target = openedMaterial;
    if (target === 'matematika-transformasi') {
      return 'Contoh: Dari bahan ajar transformasi fungsi saya menemukan bahwa bentuk umum y = a·f(b(x-h)) + k menggeser posisi puncak parabola ke (h,k) dan memindahkan garis asimtot eksponen ke y = k... Catat poin penting sebelum menyelesaikan misi.';
    }
    if (target === 'matematika-regresi') {
      return 'Contoh: Dari bahan ajar regresi linear saya menemukan bahwa pemodelan linear y = a + bx digunakan untuk memprediksi perubahan nilai variabel terikat y berdasarkan variabel bebas x, dengan koefisien kemiringan (gradien) menyatakan laju perubahan... Catat poin penting sebelum menyelesaikan misi.';
    }
    if (target === 'fisika-kalor') {
      return 'Contoh: Dari bahan ajar suhu dan kalor saya menemukan bahwa Azas Black menyatakan Q_lepas = Q_terima saat dua zat berbeda suhu dicampurkan... Catat poin penting sebelum menyelesaikan misi.';
    }
    if (target === 'kimia-atom') {
      return 'Contoh: Dari bahan ajar struktur atom dan ikatan kimia saya mencatat bahwa geometri molekul ditentukan oleh tolakan pasangan elektron (VSEPR) dan gaya antarmolekul memengaruhi titik didih serta sifat fisik zat... Catat poin penting sebelum menyelesaikan misi.';
    }
    if (target === 'biologi-sifat') {
      return 'Contoh: Dari bahan ajar pewarisan sifat saya mencatat bahwa persilangan monohibrid menghasilkan rasio fenotipe 3:1 dan genotipe 1:2:1 sesuai Hukum Mendel I... Catat poin penting sebelum menyelesaikan misi.';
    }
    return 'Pilih cover buku di perpustakaan digital untuk membaca materi, lalu tuliskan kembali informasi penting yang Anda pelajari di sini sebelum menyelesaikan misi.';
  };

  // Lanjut ke Misi Berikutnya (Manual saat murid menekan tombol)
  const handleProceedNext = () => {
    if (onNextMission) {
      onNextMission(2);
    } else if (onClose) {
      onClose();
    }
  };

  // Selesai Belajar di Menu Offline: Simpan catatan & langsung pindah ke Misi 2 (tanpa mini kuis)
  const handleSelesaiOffline = () => {
    const note = catatanPenting.trim();
    if (!note) {
      setQuizError('Silakan tuliskan kembali informasi penting dari bahan ajar sebelum melanjutkan ke Misi 2!');
      return;
    }
    setQuizError(null);

    // 1. Simpan catatan pembelajaran Misi 1
    storage.saveMisi1Notes(studentId, note, missionId);
    storage.completeMission(studentId, missionId, 100, mission?.xpReward || 100);

    // 2. Play sound effect
    soundEffects.playCorrect();

    // 3. Dispatch event agar dashboard tersinkronisasi
    window.dispatchEvent(new CustomEvent('tisenang_missions_updated'));

    if (onCompleted) {
      onCompleted();
    }

    // 4. Langsung pindah ke Misi 2 sesuai instruksi: "ketika murid sudah selesai mengisi dapat langsung pindah ke misi 2"
    if (onNextMission) {
      onNextMission(2);
    } else if (onClose) {
      onClose();
    }
  };

  // Tombol Periksa Jawaban Benar / Salah dengan Audio Feedback
  const handlePeriksaJawaban = () => {
    if (selectedOption === null) {
      setQuizError('Silakan pilih salah satu opsi jawaban (A, B, C, atau D) terlebih dahulu!');
      return;
    }
    setQuizError(null);

    let note = catatanPenting.trim();
    if (!note) {
      note = 'Catatan pembelajaran: Konsep Azas Black, kapasitas kalor, dan interpretasi grafik regresi linear telah dipelajari dengan baik.';
      setCatatanPenting(note);
    }

    const isCorrect = selectedOption === activeQuestion.correctIndex;
    const finalScore = isCorrect ? 100 : 75;
    setQuizScore(finalScore);
    setIsAnswerChecked(true);
    setIsFinished(true);

    // Mainkan sound effect sesuai benar atau salah
    if (isCorrect) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
    }

    // 1. Simpan penyelesaian Misi 1
    storage.saveMisi1Notes(studentId, note, missionId);
    storage.completeMission(studentId, missionId, finalScore, mission?.xpReward || 100);

    // 2. Dispatch custom event agar progress di dashboard segera sinkron
    window.dispatchEvent(new CustomEvent('tisenang_missions_updated'));

    // 3. Evaluasi ALME jika kuis kurang tepat
    if (!isCorrect) {
      storage.saveAlmeRecommendation({
        id: `rec-alme-m1-${Date.now()}`,
        studentId: studentId,
        classId: mission?.classId || 'cls-xii-1',
        className: mission?.className || 'XII-1',
        missionId: missionId,
        type: 'Strengthening',
        title: 'Penguatan Konsep Regresi & Permodelan Kalor',
        message:
          'Hasil mini kuis Misi 1 menunjukkan Anda memerlukan penguatan pada interpretasi matematis gradien garis regresi sebelum melanjutkan ke Misi 2 (Selesaikan Masalah).',
        whyExplanation:
          'Sistem ALME mendeteksi perlunya penguatan pada pemahaman fisis kemiringan regresi linear.',
        recommendedCategory: 'pahami_konsep',
        status: 'PENDING',
        xpReward: 80,
        reason: 'Mini kuis Misi 1 terjawab kurang tepat. Rekomendasi modul remedial aktif.',
        createdAt: new Date().toISOString(),
      });
    }

    setShowSuccessCard(true);

    if (onCompleted) {
      onCompleted();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full min-w-0 pb-12 sm:pb-8">
      {/* Header Banner - Selaras dengan Tema Halaman Misi & Responsif HP */}
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
            {/* 1. Tulisan: Misi 1 . Pahami Konsep */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Misi 1 . Pahami Konsep</span>
            </div>

            {/* 2. Menu Online dan Offline: Pilihan Mapel HANYA ada di menu offline */}
            <div className="flex flex-wrap items-center gap-2 my-2.5">
              {/* Toggle Online / Offline */}
              <div className="flex items-center p-1 bg-black/30 backdrop-blur-md rounded-xl border border-white/25 shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveMenu('online')}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
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
                  className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${
                    activeMenu === 'offline'
                      ? 'bg-white text-blue-900 shadow-md font-extrabold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Offline
                </button>
              </div>

              {/* Di menu online: Info Mata Pelajaran sesuai halaman misi yang dikirim guru berdasarkan Tujuan Pembelajaran */}
              {activeMenu === 'online' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/25 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>
                    Mata Pelajaran:{' '}
                    <strong className="text-amber-300">
                      {mission?.subjectName || 'Sains MIPA'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* 3. Tulisan petunjuk adaptif online / offline */}
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              {activeMenu === 'offline'
                ? 'Tuliskan kembali informasi penting dari bahan ajar, lalu langsung lanjutkan ke Misi 2.'
                : 'Pelajari bahan ajar ataupun video, catat informasi penting, dan jawab 1 mini kuis untuk membuka Misi 2.'}
            </p>
          </div>

          {/* 4. XP */}
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur border border-white/30 text-white self-start sm:self-auto shrink-0 shadow-xs">
            +{mission?.xpReward || 100} XP
          </span>
        </div>
      </div>

      {/* Konten Menu Offline: Kotak Mata Pelajaran untuk Dipilih (Matematika, Fisika, Kimia, Biologi) */}
      {activeMenu === 'offline' && (
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* 1 Kotak Pilih Mata Pelajaran (Bahan Ajar Offline) - Berwarna biru muda, batas garis kuning, tulisan ringkas */}
          <div className="relative">
            <div className="w-full bg-sky-100 text-sky-950 rounded-2xl p-3 sm:p-4 border-2 border-yellow-400 shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-yellow-400/80 flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-xs">
                  {currentSubjectObj.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-extrabold text-sky-950 leading-snug">
                    Pilih Mata Pelajaran
                  </h4>
                  <p className="text-xs font-semibold text-sky-800">
                    Aktif: <span className="font-extrabold text-blue-900">{currentSubjectObj.name}</span>
                  </p>
                </div>
              </div>

              {/* Tombol Panah untuk membuka dropdown tulisan saja */}
              <div className="relative">
                <button
                  type="button"
                  id="btn-dropdown-pilih-mapel"
                  onClick={() => setIsSelectSubjectOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-yellow-100 border border-yellow-400 text-xs sm:text-sm font-bold text-sky-950 shadow-xs transition-colors cursor-pointer"
                >
                  <span>{currentSubjectObj.name}</span>
                  {isSelectSubjectOpen ? (
                    <ChevronUp className="w-4 h-4 text-sky-950 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-sky-950 shrink-0" />
                  )}
                </button>

                {/* Dropdown Menu TULISAN SAJA muncul dari arah panah yang diklik */}
                {isSelectSubjectOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 sm:w-56 bg-white border-2 border-yellow-400 rounded-xl shadow-2xl z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {OFFLINE_SUBJECTS.map((subj) => {
                      const isSelected = offlineSubject === subj.id;
                      return (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() => {
                            setOfflineSubject(subj.id);
                            setOpenedMaterial(null);
                            setIsSelectSubjectOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-yellow-200 text-sky-950 font-black'
                              : 'text-slate-800 hover:bg-sky-50 font-semibold'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{subj.icon}</span>
                            <span>{subj.name}</span>
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-sky-950 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1. TAMPILAN PERPUSTAKAAN DIGITAL (Saat Belum Ada Materi yang Terbuka) */}
          {!openedMaterial && (
            <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-700/80 shadow-xl space-y-4">
              {/* Header Perpustakaan Ringkas ("cukup inti-inti saja") */}
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md text-lg sm:text-xl shrink-0">
                    📚
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Perpustakaan Digital {offlineSubject === 'semua' ? 'Semua Mapel' : currentSubjectObj.name}
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                        {displayedBooks.length} Buku
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                      Klik cover buku di bawah untuk membuka materi:
                    </p>
                  </div>
                </div>
              </div>

              {/* Rak Buku Sejajar: Grid Compact Responsif (Laptop 5 kolom sejajar, Tab 3/4 kolom, HP 2 kolom) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {displayedBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      setOpenedMaterial(book.id);
                      if (book.subjectId === 'matematika') {
                        setSelectedMathTopic(book.id === 'matematika-transformasi' ? 'transformasi' : 'regresi');
                      }
                    }}
                    className={`group relative text-left overflow-hidden rounded-xl bg-gradient-to-br ${book.cardGradient} border-2 ${book.borderClass} border-l-[6px] ${book.spineColor} p-3 sm:p-3.5 shadow-md hover:shadow-2xl flex flex-col justify-between transition-all hover:-translate-y-1.5 active:scale-95 cursor-pointer min-h-[195px] sm:min-h-[215px]`}
                  >
                    {/* Top Bar: Badge Mapel & Tag */}
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${book.badgeClass}`}>
                        {book.badgeText}
                      </span>
                      {book.tag ? (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-yellow-400 text-slate-950 shadow-xs animate-pulse">
                          {book.tag}
                        </span>
                      ) : (
                        <span className="text-base group-hover:scale-110 transition-transform">{book.icon}</span>
                      )}
                    </div>

                    {/* Tengah: Ikon & Judul Inti ("cukup inti-inti saja") */}
                    <div className="my-2 space-y-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-xs flex items-center justify-center text-lg mb-1 shadow-inner">
                        {book.icon}
                      </div>
                      <h4 className={`text-xs sm:text-sm font-black leading-tight tracking-tight line-clamp-2 ${book.titleColor}`}>
                        {book.title}
                      </h4>
                      <p className={`text-[10px] sm:text-[11px] leading-tight line-clamp-1 ${book.subtitleColor}`}>
                        {book.subtitle}
                      </p>
                    </div>

                    {/* Bawah: Tombol Buka Buku */}
                    <div className="pt-2 border-t border-white/10 w-full mt-auto">
                      <div className={`w-full py-1.5 px-2 rounded-lg ${book.btnClass} font-black text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 shadow-xs group-hover:brightness-110 transition-all`}>
                        <BookOpen className="w-3 h-3 shrink-0" />
                        <span>Buka Buku</span>
                        <ArrowRight className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. TAMPILAN MATERI (Ketika Salah Satu Cover Buku Diklik) */}
          {openedMaterial && (
            <div className="space-y-4">
              {/* Bar Navigasi Atas: Tombol Kembali ke Perpustakaan Digital */}
              <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md">
                <button
                  type="button"
                  id="btn-kembali-ke-perpustakaan"
                  onClick={() => setOpenedMaterial(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Kembali ke Perpustakaan</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 min-w-0">
                  <span className="text-slate-400 hidden sm:inline">Sedang Dibaca:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-yellow-300 font-extrabold text-[11px] sm:text-xs truncate max-w-[200px] sm:max-w-none">
                    {activeOpenedBook?.title}
                  </span>
                </div>
              </div>

              {/* Komponen Materi Pembelajaran Sesuai Buku yang Dipilih */}
              {openedMaterial === 'matematika-regresi' && <MateriRegresiLinear />}
              {openedMaterial === 'matematika-transformasi' && <MateriMatematikaTransformasiFungsi />}
              {openedMaterial === 'fisika-kalor' && <MateriFisikaKalor />}
              {openedMaterial === 'kimia-atom' && <MateriKimiaStrukturAtom />}
              {openedMaterial === 'biologi-sifat' && <MateriBiologiPewarisanSifat />}

              {/* Tombol Kembali ke Perpustakaan Digital di Bagian Bawah Materi */}
              <div className="flex justify-start pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenedMaterial(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 font-extrabold text-xs border border-yellow-400/40 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Kembali ke Perpustakaan Digital</span>
                </button>
              </div>
            </div>
          )}

          {/* TULISKAN KEMBALI INFORMASI PENTING DARI BAHAN AJAR */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-white text-sm sm:text-base">
                  Tuliskan Kembali Informasi Penting dari Bahan Ajar
                </h2>
              </div>
            </div>

            <div>
              <textarea
                id="input-catatan-penting-offline"
                rows={6}
                value={catatanPenting}
                onChange={(e) => setCatatanPenting(e.target.value)}
                placeholder={getOfflinePlaceholder()}
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/80 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:border-purple-400 leading-relaxed bg-slate-800/70"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>
                  {catatanPenting.trim().length > 0 ? (
                    <span className="text-purple-300 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-purple-400 shrink-0" /> Informasi penting telah dicatat ({catatanPenting.trim().split(/\s+/).length} kata)
                    </span>
                  ) : (
                    'Catat minimal 1 poin inti sebelum menyelesaikan misi'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Validasi Error jika catatan kosong */}
          {quizError && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="break-words">{quizError}</span>
            </div>
          )}

          {/* TOMBOL LANGSUNG PINDAH KE MISI 2 (TIDAK ADA MINI KUIS SINGKAT DI MENU OFFLINE) */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-700/80 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full mb-2">
            <div className="text-xs text-slate-300 min-w-0">
              <p className="font-bold text-white">Selesai Membaca & Mencatat</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Tidak ada mini kuis singkat di menu offline. Setelah mengisi catatan informasi penting di atas, Anda dapat langsung melanjutkan ke Misi 2 (Selesaikan Masalah).
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                id="btn-selesai-offline-ke-misi-2"
                type="button"
                onClick={handleSelesaiOffline}
                className={`w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-center min-h-[44px] ${
                  catatanPenting.trim().length > 0
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                <span>Selesai Belajar & Lanjut ke Misi 2</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konten Menu Online: mata pelajaran sesuai yang dipilih dari halaman misi dan materi yang muncul sesuai yang dikirim guru sesuai Tujuan Pembelajaran */}
      {activeMenu === 'online' && (
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Judul Misi & TP dari Guru */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-700/80 shadow-md">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {mission?.subjectName || 'Mata Pelajaran MIPA'}
              </span>
              {mission?.tpCode && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {mission.tpCode}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-display font-extrabold text-white tracking-tight break-words">
              {mission?.title || 'Pahami Konsep Sains & Permodelan Matematis'}
            </h1>
            {mission?.description && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {mission.description}
              </p>
            )}
          </div>
          {/* MODAL / CARD SUKSES: Misi 2 Terbuka */}
          {showSuccessCard && (
            <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border border-blue-400/40 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-200" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold">🎉 Selamat! Belajar Misi 1 Selesai!</h3>
                  <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
                    Skor Mini Kuis: <strong>{quizScore}/100</strong>. Misi 2 (Selesaikan Masalah) kini telah terbuka untuk Anda!
                  </p>
                </div>
              </div>
              <button
                id="btn-lanjut-misi-2-card"
                type="button"
                onClick={handleProceedNext}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl sm:rounded-2xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center"
              >
                <span>Lanjut ke Misi 2</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          {/* 1. BAHAN AJAR PDF / VIDEO PEMBELAJARAN DARI GURU */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-white text-sm sm:text-base">
                    1. Bahan Ajar & Video Pembelajaran dari Guru
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Baca dokumen bahan ajar PDF atau tonton video pembelajaran berikut secara seksama.
                  </p>
                </div>
              </div>
            </div>

            {/* Media Resources dari Guru */}
            {!(mission?.tpId || mission?.tpCode) ? (
              <div className="p-3.5 sm:p-4 bg-slate-800/40 rounded-xl sm:rounded-2xl border border-slate-700/50 text-center py-6">
                <p className="text-xs sm:text-sm text-slate-400">
                  Tidak ada materi yang muncul karena Tujuan Pembelajaran belum ditambahkan untuk mata pelajaran ini.
                </p>
              </div>
            ) : mission?.mediaResources && mission.mediaResources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                {mission.mediaResources.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 bg-slate-800/80 rounded-xl sm:rounded-2xl border border-slate-700/70 flex items-start justify-between gap-2.5 sm:gap-3 shadow-xs hover:border-blue-400/50 transition-all min-w-0"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {res.type === 'pdf' ? (
                          <FileText className="w-5 h-5" />
                        ) : res.type === 'video' ? (
                          <Video className="w-5 h-5" />
                        ) : (
                          <ExternalLink className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white leading-snug break-words">{res.title}</h4>
                        <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide block mt-0.5 truncate">
                          {res.type === 'pdf'
                            ? '📄 Dokumen PDF Bahan Ajar'
                            : res.type === 'video'
                            ? '🎬 Video Pembelajaran'
                            : '🌐 Tautan Pembelajaran'}
                        </span>
                        {res.description &&
                          !res.description.toLowerCase().includes('terhubung') &&
                          !res.description.toLowerCase().includes('google') && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 break-words">{res.description}</p>
                          )}
                      </div>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs active:scale-95 transition-all self-center sm:self-start"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 bg-slate-800/80 rounded-xl sm:rounded-2xl border border-slate-700/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white break-words">
                      Modul Bahan Ajar PDF: Konsep Kalor & Regresi Linear Sains Fase F
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Membahas perpindahan kalor, pembacaan sensor digital, dan permodelan regresi linear.
                    </p>
                  </div>
                </div>
                <a
                  href="https://drive.google.com/drive/folders/1Xc-5Y2HWvLQie3zuQZmgh9GAtX62D34h?hl=ID"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 shadow-xs transition-all text-center"
                >
                  <span>Lihat Dokumen</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}

            {/* Teks Modul Bacaan dari Guru jika tersedia dan TP sudah ada */}
            {Boolean(mission?.tpId || mission?.tpCode) && mission?.readingModuleText && (
              <div className="p-3.5 sm:p-4 bg-slate-800/60 rounded-xl sm:rounded-2xl border border-slate-700/60 text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed break-words">
                {mission.readingModuleText}
              </div>
            )}
          </div>

          {/* 2. MENULISKAN KEMBALI INFORMASI PENTING YANG DITEMUKAN */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/80 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-white text-sm sm:text-base">
                  2. Tuliskan Kembali Informasi Penting dari Bahan Ajar
                </h2>
              </div>
            </div>

            <div>
              <textarea
                id="input-catatan-penting"
                rows={4}
                value={catatanPenting}
                onChange={(e) => setCatatanPenting(e.target.value)}
                placeholder="Contoh: Dari bahan ajar saya menemukan bahwa konsep materi ini menjelaskan hubungan fisis antar variabel... Catat poin penting sebelum menyelesaikan misi."
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/80 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:border-purple-400 leading-relaxed bg-slate-800/70"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>
                  {catatanPenting.trim().length > 0 ? (
                    <span className="text-purple-300 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-purple-400 shrink-0" /> Informasi penting telah dicatat ({catatanPenting.trim().split(/\s+/).length} kata)
                    </span>
                  ) : (
                    'Catat minimal 1 poin inti sebelum mengklik Selesai Belajar'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 3. MINI KUIS SINGKAT 1 NOMOR DIBUAT OLEH AI (SESUAI MATA PELAJARAN & TP) */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-indigo-500/30 shadow-md space-y-3 sm:space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display font-bold text-white text-sm sm:text-base">
                      3. Mini Kuis Singkat AI (1 Nomor)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-400/30">
                      1 Soal Wajib • {mission?.subjectName || 'Mata Pelajaran'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Soal Mini Kuis AI */}
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed break-words">
                {activeQuestion.question}
              </p>

              <div className="space-y-2">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  let btnStyle = 'border-slate-700 bg-slate-850 hover:border-indigo-400/50 hover:bg-slate-800 text-slate-200';

                  if (isSelected) {
                    if (isFinished) {
                      btnStyle =
                        idx === activeQuestion.correctIndex
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 font-bold ring-2 ring-cyan-400/40'
                          : 'border-rose-500 bg-rose-950/40 text-rose-200 font-bold ring-2 ring-rose-400/40';
                    } else {
                      btnStyle = 'border-indigo-500 bg-indigo-950/40 text-indigo-200 font-bold ring-2 ring-indigo-400/40';
                    }
                  } else if (isFinished && idx === activeQuestion.correctIndex) {
                    btnStyle = 'border-cyan-400 bg-cyan-950/30 text-cyan-200 font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!isFinished) setSelectedOption(idx);
                      }}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-start sm:items-center gap-2.5 sm:gap-3 cursor-pointer ${btnStyle}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-slate-300 mt-0.5 sm:mt-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 min-w-0 break-words leading-relaxed">{opt}</span>
                      {isFinished && idx === activeQuestion.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tombol Periksa Jawaban & Status Validasi */}
              {quizError && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="break-words">{quizError}</span>
                </div>
              )}

              {!isAnswerChecked ? (
                <div className="pt-2">
                  <button
                    id="btn-periksa-jawaban-kuis"
                    type="button"
                    onClick={handlePeriksaJawaban}
                    disabled={selectedOption === null}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 min-h-[44px] ${
                      selectedOption !== null
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/25'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                    }`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Periksa Jawaban Sekarang</span>
                  </button>
                  {selectedOption !== null && (
                    <p className="text-[11px] text-slate-400 text-center mt-1.5 leading-relaxed">
                      Klik tombol di atas untuk memeriksa apakah jawabanmu Benar atau Salah
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {selectedOption === activeQuestion.correctIndex ? (
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-950/40 border border-blue-400/50 text-blue-200 space-y-1.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-cyan-300 shrink-0" />
                        <span className="font-extrabold text-xs sm:text-sm text-cyan-200">
                          🎉 Jawaban Kamu BENAR! (Skor: 100/100)
                        </span>
                      </div>
                      <p className="text-xs text-blue-200 leading-relaxed">
                        Pemahaman konsepmu sangat tepat! Anda siap melanjutkan ke Misi 2 (Selesaikan Masalah).
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 space-y-1.5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span className="font-extrabold text-xs sm:text-sm text-rose-200">
                          ❌ Jawaban Belum Tepat (Skor: 75/100)
                        </span>
                      </div>
                      <p className="text-xs text-rose-200 leading-relaxed break-words">
                        Jawaban yang tepat adalah opsi <strong>{String.fromCharCode(65 + activeQuestion.correctIndex)}: {activeQuestion.options[activeQuestion.correctIndex]}</strong>. Pelajari pembahasan AI di bawah ini sebelum lanjut.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Hint & Explanation */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{showHint ? 'Sembunyikan Petunjuk' : 'Lihat Petunjuk AI'}</span>
                </button>
              </div>

              {showHint && (
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-400/30 text-xs text-amber-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="break-words leading-relaxed">{activeQuestion.hint}</span>
                </div>
              )}

              {isFinished && (
                <div className="p-3 sm:p-3.5 bg-indigo-950/40 rounded-xl border border-indigo-400/30 text-xs text-indigo-200 space-y-1 animate-in fade-in">
                  <span className="font-bold block flex items-center gap-1.5 text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    💡 Pembahasan Konsep Saintifik:
                  </span>
                  <p className="leading-relaxed text-slate-300 break-words">{activeQuestion.explanation}</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. TOMBOL SELESAI BELAJAR -> BUKA MISI 2 (Kotak Periksa Jawaban Kuis yang Fleksibel untuk HP) */}
          <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-700/80 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full mb-2">
            <div className="text-xs text-slate-300 min-w-0">
              {isAnswerChecked && (
                <>
                  <p className="font-bold text-white">Kuis Selesai Diperiksa!</p>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Jawaban telah tersimpan. Klik tombol di samping untuk melanjutkan ke Misi 2 (Selesaikan Masalah).
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {isAnswerChecked ? (
                <button
                  id="btn-lanjut-ke-misi-2"
                  type="button"
                  onClick={handleProceedNext}
                  className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-center min-h-[44px]"
                >
                  <span>Lanjut ke Misi 2</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  id="btn-periksa-dulu-sebelum-m2"
                  type="button"
                  onClick={handlePeriksaJawaban}
                  className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-center min-h-[44px]"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Periksa Jawaban Kuis</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
