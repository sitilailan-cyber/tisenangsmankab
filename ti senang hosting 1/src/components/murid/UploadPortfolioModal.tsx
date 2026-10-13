import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  Sparkles,
  BookOpen,
  Target,
  FlaskConical,
  Award,
  Zap,
  Link,
  ExternalLink,
} from 'lucide-react';
import { PortfolioItem, PortfolioCategory, TujuanPembelajaran, Subject } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { parseGoogleDriveUrl } from '../../utils/googleDrive';
import { STUDENT_DRIVE_FOLDER_URL } from '../../services/firebaseRealtime';
import { compressImageFile, formatBytes, validateFileSize } from '../../utils/fileCompressor';

interface UploadPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
}

// Fallback Tujuan Pembelajaran per mata pelajaran untuk menjamin selalu ada pilihan relevan
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

export const UploadPortfolioModal: React.FC<UploadPortfolioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  studentName,
  classId,
  className,
}) => {
  const { updateCurrentUser, currentUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sbj-fisika');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('Fisika Eksperimental & Terapan');
  const [availableTps, setAvailableTps] = useState<Array<{ code: string; title: string }>>([]);
  const [selectedTpCode, setSelectedTpCode] = useState<string>('');
  const [selectedTpTitle, setSelectedTpTitle] = useState<string>('');
  const [customTp, setCustomTp] = useState<string>('');
  const [isCustomTp, setIsCustomTp] = useState<boolean>(false);

  // Form inputs
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<PortfolioCategory>('Eksperimen');
  const [reportMode, setReportMode] = useState<'upload' | 'write' | 'both'>('both');
  const [reflectionSummary, setReflectionSummary] = useState<string>('');
  const [conclusion, setConclusion] = useState<string>('');

  // Uploaded photo state
  const [uploadedPhoto, setUploadedPhoto] = useState<{
    name: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const [driveLink, setDriveLink] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load subjects on mount
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
    setSelectedSubjectId(loadedSubjects[0].id);
    setSelectedSubjectName(loadedSubjects[0].name);
  }, []);

  // Update TPs when subject changes
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

  if (!isOpen) return null;

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

  const processFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar dokumentasi (.jpg, .png, .webp, .jpeg).');
      return;
    }

    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
      alert(sizeCheck.error);
      return;
    }

    setIsCompressing(true);
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

      setCompressionInfo({
        originalSize: res.originalSize,
        compressedSize: res.compressedSize,
        savingsPercent: res.savingsPercent,
      });
    } catch (err) {
      console.warn('Gagal mengompres gambar:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setUploadedPhoto({
            name: file.name,
            size: file.size,
            dataUrl,
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Mohon masukkan Judul Portofolio.');
      return;
    }

    const finalTpTitle = isCustomTp ? (customTp.trim() || 'Tujuan Pembelajaran Mandiri') : selectedTpTitle;
    const finalReport = reflectionSummary.trim() || (uploadedPhoto ? `Dokumentasi foto karya: ${title}` : 'Laporan praktikum mandiri murid.');

    if (!conclusion.trim()) {
      alert('Mohon tuliskan Kesimpulan dari eksperimen atau pembelajaran ini.');
      return;
    }

    setIsSubmitting(true);

    let docMedia = uploadedPhoto?.dataUrl || undefined;
    if (!docMedia && driveLink.trim()) {
      const parsed = parseGoogleDriveUrl(driveLink.trim());
      docMedia = parsed.directImageUrl || parsed.previewUrl || driveLink.trim();
    }

    // Pastikan foto masuk ke direktori Google Drive siswa (bukan ke Firebase)
    const effectiveDriveLink = driveLink.trim() || STUDENT_DRIVE_FOLDER_URL;

    const newPortfolio: PortfolioItem = {
      id: `pf-${Date.now()}`,
      studentId: studentId || 'std-current',
      studentName: studentName || 'Murid MIPA',
      classId: classId || 'cls-xii-1',
      className: className || 'XII-1',
      title: title.trim(),
      subjectName: selectedSubjectName,
      subjectId: selectedSubjectId,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      category,
      xpEarned: 50,
      visibility: 'CLASS',
      reflectionSummary: `${finalTpTitle ? `[Tujuan: ${selectedTpCode} - ${finalTpTitle}] ` : ''}${finalReport}${driveLink.trim() ? ` [Tautan Google Drive: ${driveLink.trim()}]` : ''}`,
      conclusion: conclusion.trim(),
      documentation: docMedia,
      driveLink: effectiveDriveLink,
      likesCount: 0,
      likedBy: {},
      comments: [],
      createdAt: new Date().toISOString(),
      isFeatured: false,
    };

    // 1. Simpan dan publikasikan portofolio (foto masuk ke Google Drive, bukan disimpan sebagai binary di Firebase)
    storage.savePortfolio(newPortfolio);

    // 2. Simpan juga ke penugasan siswa
    storage.submitStudentTask({
      id: `task-${Date.now()}`,
      missionId: `msn-manual-${selectedSubjectId}`,
      studentId: studentId || 'std-current',
      studentName: studentName || 'Murid MIPA',
      classId: classId || 'cls-xii-1',
      className: className || 'XII-1',
      submittedAt: new Date().toISOString(),
      content: `${title.trim()}\n${finalReport}\nKesimpulan: ${conclusion.trim()}`,
      driveLink: effectiveDriveLink,
      fileAttachment: docMedia,
      status: 'SUBMITTED',
      tpId: selectedTpCode,
    });

    setSuccessMessage('Portofolio berhasil diunggah! Foto dokumentasi masuk ke Google Drive (bukan ke Firebase) dan tampil di Beranda (+50 XP).');

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(null);
      if (onSuccess) onSuccess();
      onClose();

      // Reset form
      setTitle('');
      setReflectionSummary('');
      setConclusion('');
      setUploadedPhoto(null);
      setCustomTp('');
      setIsCustomTp(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 flex flex-col max-h-[85vh] overflow-hidden text-slate-800 animate-in fade-in zoom-in-95">
        {/* Header Modal - Fixed */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5 bg-slate-50/80 shrink-0">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider border border-blue-100">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Unggah Portofolio Murid • Kelas {className}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 leading-tight">
              Unggah Karya & Dokumentasi Portofolio
            </h2>
            <p className="text-[11px] text-slate-500">
              Foto dokumentasi portofolio masuk ke Google Drive (bukan ke Firebase) dan ditampilkan langsung di Galeri Portofolio Beranda.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
            {/* 1. Pilih Mata Pelajaran */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Pilih Mata Pelajaran</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-portfolio-subject"
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs cursor-pointer"
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
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  <span>2. Pilih Tujuan Pembelajaran</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Sesuai Kurikulum</span>
              </label>
              <select
                id="select-portfolio-tp"
                value={isCustomTp ? 'CUSTOM' : selectedTpCode}
                onChange={handleTpChange}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs cursor-pointer"
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
                  className="mt-1.5 w-full h-9 px-3 rounded-xl border border-blue-300 bg-blue-50/50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              )}
            </div>

            {/* Judul Portofolio */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Judul Portofolio / Eksperimen</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-portfolio-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Eksperimen Penyelidikan Kalor Radiasi Lampu Halogen Terhadap Suhu Air"
                className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* 3. Pilihan: Upload Dokumentasi Foto & Tulis Laporan */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>3. Upload Foto Dokumentasi & Laporan</span>
                </label>

                {/* Mode Toggle */}
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setReportMode('both')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      reportMode === 'both' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Keduanya
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportMode('upload')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      reportMode === 'upload' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Foto Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportMode('write')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      reportMode === 'write' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tulis Laporan
                  </button>
                </div>
              </div>

              {/* Area Upload Foto Dokumentasi (Muncul jika 'upload' atau 'both') */}
              {(reportMode === 'upload' || reportMode === 'both') && (
                <div className="space-y-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {isCompressing ? (
                    <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/20 p-6 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <p className="text-xs font-bold text-emerald-800">
                        Mengompres gambar otomatis untuk Google Drive...
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Mengoptimalkan resolusi dan ukuran byte agar kuota hemat.
                      </p>
                    </div>
                  ) : uploadedPhoto ? (
                    /* Visual Preview Foto yang Berhasil Diupload */
                    <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/50 bg-slate-900 group shadow-md max-h-44">
                      <div className="aspect-[21/9] w-full overflow-hidden">
                        <img
                          src={uploadedPhoto.dataUrl}
                          alt="Preview Foto Dokumentasi"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            {compressionInfo ? `Terkompresi (${compressionInfo.savingsPercent}% Lebih Hemat)` : 'Foto Terpasang'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedPhoto(null);
                              setCompressionInfo(null);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Ganti Foto
                          </button>
                        </div>

                        <div className="text-white text-[11px] font-mono">
                          <p className="font-bold truncate">{uploadedPhoto.name}</p>
                          <p className="text-[9px] text-emerald-300 font-semibold">
                            {compressionInfo
                              ? `${formatBytes(compressionInfo.originalSize)} ➔ ${formatBytes(compressionInfo.compressedSize)} (Hemat ${compressionInfo.savingsPercent}%) • Masuk ke Google Drive (bukan ke Firebase)`
                              : `${(uploadedPhoto.size / 1024).toFixed(1)} KB • Masuk ke Google Drive`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Box Drag & Drop File Picker - Compact */
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-2xl border-2 border-dashed p-3.5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isDragging
                          ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
                          : 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Klik atau Tarik Foto Dokumentasi ke Sini
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Format JPG, PNG, atau WebP (Maksimal 2MB • Masuk ke Google Drive, bukan ke Firebase)
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase tracking-wider">
                        📸 Foto ini menjadi cover kartu di Beranda
                      </span>
                    </div>
                  )}

                  {/* Opsi Tautan File Dokumen/Foto Siswa */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <Link className="w-3 h-3 text-blue-600" />
                        <span>Tautan Berkas / Dokumen Tambahan (Opsional):</span>
                      </label>
                    </div>
                    <input
                      type="url"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://... (tautan dokumen pendukung jika ada)"
                      className="w-full h-8 px-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Area Tulis Laporan (Muncul jika 'write' atau 'both') */}
              {(reportMode === 'write' || reportMode === 'both') && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Isi Laporan / Catatan Pelaksanaan & Refleksi</span>
                  </label>
                  <textarea
                    id="textarea-portfolio-report"
                    rows={2}
                    value={reflectionSummary}
                    onChange={(e) => setReflectionSummary(e.target.value)}
                    placeholder="Tuliskan prosedur pengamatan, data observasi, atau temuan sensor yang diperoleh selama penyelidikan..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* 4. Tulis Kesimpulan */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>4. Tulis Kesimpulan Saintifik</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-amber-600 font-bold font-mono">+50 XP</span>
              </label>
              <textarea
                id="textarea-portfolio-conclusion"
                required
                rows={2}
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Contoh: Laju kenaikan suhu zat cair berbanding lurus dengan intensitas radiasi panas yang dipancarkan ke kalorimeter..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>
          </div>

          {/* Sticky Footer Actions - Selalu terlihat jelas di layar */}
          <div className="flex items-center justify-between p-3.5 sm:px-5 border-t border-slate-200 bg-white shrink-0 sticky bottom-0 z-10">
            <div className="flex items-center gap-1.5 text-amber-600 font-mono text-xs font-extrabold bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200/60">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>Hadiah: +50 XP</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                id="btn-submit-upload-portfolio"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isSubmitting ? 'Menerbitkan...' : 'Terbitkan Portofolio'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
