import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  User,
  Users,
  Star,
  ShieldCheck,
  LogOut,
  FolderOpen,
  Calendar,
  Sparkles,
  Eye,
  CheckCircle2,
  BookOpen,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Atom,
  Binary,
  FlaskConical,
  Upload,
  RefreshCw,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  FileDown,
  Camera,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { StudentProfileData, PortfolioItem, StudentProgress, PortfolioCategory, Student } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { UploadPortfolioModal } from './UploadPortfolioModal';
import { exportPengalamanBelajarToPdf } from '../../utils/pdfExport';
import { compressImageFile, formatBytes, validateFileSize } from '../../utils/fileCompressor';
import { STUDENT_DRIVE_FOLDER_URL, getOptimizedImageUrl, DRIVE_FOLDER_PHOTOS } from '../../utils/googleDrive';

import studentCalorimeterPhoto from '../../assets/images/student_physics_calorimeter_1789115270932.jpg';
import studentRegressionPhoto from '../../assets/images/student_data_regression_1789115288218.jpg';
import studentChemPhoto from '../../assets/images/student_chem_experiment_1789115301650.jpg';
import studentBioPhoto from '../../assets/images/student_bio_project_1789115315113.jpg';

interface MuridProfilProps {
  profile: StudentProfileData;
  portfolios: PortfolioItem[];
  progressList: StudentProgress[];
  onRefreshPortfolios: () => void;
  onLogout: () => void;
  onNavigateToLab?: () => void;
}

// Koleksi Emoji Avatar yang Disediakan Aplikasi untuk Murid (Sesuai Permintaan)
export const APP_EMOJI_AVATARS = [
  { id: 'em-1', emoji: '🧑‍🎓', label: 'Pelajar' },
  { id: 'em-2', emoji: '👩‍🎓', label: 'Siswi Wisuda' },
  { id: 'em-3', emoji: '👨‍🎓', label: 'Siswa Wisuda' },
  { id: 'em-4', emoji: '🧑‍🔬', label: 'Saintis Muda' },
  { id: 'em-5', emoji: '👩‍🔬', label: 'Peneliti Putri' },
  { id: 'em-6', emoji: '👨‍🔬', label: 'Peneliti Putra' },
  { id: 'em-7', emoji: '🔬', label: 'Mikroskop' },
  { id: 'em-8', emoji: '⚛️', label: 'Atom Fisika' },
  { id: 'em-9', emoji: '🧪', label: 'Tabung Kimia' },
  { id: 'em-10', emoji: '⚗️', label: 'Alat Lab' },
  { id: 'em-11', emoji: '🧫', label: 'Cawan Petri' },
  { id: 'em-12', emoji: '🧬', label: 'DNA Biologi' },
  { id: 'em-13', emoji: '🔭', label: 'Teleskop' },
  { id: 'em-14', emoji: '🚀', label: 'Roket' },
  { id: 'em-15', emoji: '🪐', label: 'Planet' },
  { id: 'em-16', emoji: '💡', label: 'Inspirasi' },
  { id: 'em-17', emoji: '🧠', label: 'Daya Pikir' },
  { id: 'em-18', emoji: '🤖', label: 'Robot AI' },
  { id: 'em-19', emoji: '💻', label: 'Komputer' },
  { id: 'em-20', emoji: '📚', label: 'Buku' },
  { id: 'em-21', emoji: '📐', label: 'Geometri' },
  { id: 'em-22', emoji: '🦉', label: 'Burung Hantu' },
  { id: 'em-23', emoji: '🦊', label: 'Rubah Peneliti' },
  { id: 'em-24', emoji: '🐼', label: 'Panda Cerdas' },
  { id: 'em-25', emoji: '🐱', label: 'Kucing Sains' },
  { id: 'em-26', emoji: '🦁', label: 'Singa Berani' },
  { id: 'em-27', emoji: '🌟', label: 'Bintang Prestasi' },
  { id: 'em-28', emoji: '⚡', label: 'Energi Listrik' },
  { id: 'em-29', emoji: '🔥', label: 'Kalor Termal' },
  { id: 'em-30', emoji: '🏆', label: 'Juara Sains' },
  { id: 'em-31', emoji: '🎯', label: 'Target Fokus' },
  { id: 'em-32', emoji: '✨', label: 'Kilau Ide' },
];

// 16 Avatar Kartun Pelajar & Sains untuk Profil Murid (Sesuai Permintaan)
const CARTOON_AVATARS = [
  {
    id: 'av-kartun-1',
    label: 'Pelajar Kacamata',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%231d4ed8"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg1)"/><circle cx="50" cy="52" r="28" fill="%23fcd34d"/><path d="M26 44 Q50 16 74 44 Q70 28 50 24 Q30 28 26 44 Z" fill="%2378350f"/><circle cx="50" cy="22" r="5" fill="%2378350f"/><circle cx="39" cy="52" r="8" fill="none" stroke="%231e293b" stroke-width="2.5"/><circle cx="61" cy="52" r="8" fill="none" stroke="%231e293b" stroke-width="2.5"/><line x1="47" y1="52" x2="53" y2="52" stroke="%231e293b" stroke-width="2.5"/><circle cx="39" cy="52" r="3" fill="%230f172a"/><circle cx="61" cy="52" r="3" fill="%230f172a"/><circle cx="38" cy="50" r="1" fill="%23ffffff"/><circle cx="60" cy="50" r="1" fill="%23ffffff"/><path d="M43 65 Q50 72 57 65" fill="none" stroke="%23b91c1c" stroke-width="2.5" stroke-linecap="round"/><path d="M24 92 C26 78 40 76 50 76 C60 76 74 78 76 92 Z" fill="%23ffffff"/><path d="M45 76 L50 84 L55 76 Z" fill="%23ef4444"/><line x1="50" y1="84" x2="50" y2="92" stroke="%23ef4444" stroke-width="3"/></svg>',
  },
  {
    id: 'av-kartun-2',
    label: 'Siswi Kuncir',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f472b6"/><stop offset="100%" stop-color="%23be185d"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg2)"/><circle cx="76" cy="34" r="14" fill="%23451a03"/><circle cx="71" cy="38" r="5" fill="%23f43f5e"/><circle cx="50" cy="53" r="27" fill="%23fed7aa"/><path d="M24 50 C24 24 74 24 76 50 C68 36 58 34 50 36 C42 34 32 36 24 50 Z" fill="%23451a03"/><ellipse cx="32" cy="56" rx="4" ry="2.5" fill="%23fda4af"/><ellipse cx="68" cy="56" rx="4" ry="2.5" fill="%23fda4af"/><circle cx="40" cy="51" r="3.5" fill="%231e293b"/><circle cx="60" cy="51" r="3.5" fill="%231e293b"/><circle cx="39" cy="49.5" r="1.2" fill="%23ffffff"/><circle cx="59" cy="49.5" r="1.2" fill="%23ffffff"/><path d="M44 64 Q50 71 56 64" fill="%23e11d48" stroke="%23e11d48" stroke-width="1.5"/><path d="M25 94 C28 80 40 77 50 77 C60 77 72 80 75 94 Z" fill="%23ffffff"/><circle cx="50" cy="85" r="3.5" fill="%23f43f5e"/></svg>',
  },
  {
    id: 'av-kartun-3',
    label: 'Siswi Hijab',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23a78bfa"/><stop offset="100%" stop-color="%236d28d9"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg3)"/><path d="M22 65 C20 30 32 18 50 18 C68 18 80 30 78 65 C78 85 68 95 50 95 C32 95 22 85 22 65 Z" fill="%23fbcfe8"/><ellipse cx="50" cy="52" rx="21" ry="24" fill="%23fde047" opacity="0.1"/><ellipse cx="50" cy="53" rx="19" ry="22" fill="%23fed7aa"/><path d="M31 42 Q50 34 69 42 Q66 36 50 34 Q34 36 31 42 Z" fill="%23f472b6"/><circle cx="41" cy="51" r="3.5" fill="%231e293b"/><circle cx="59" cy="51" r="3.5" fill="%231e293b"/><circle cx="40" cy="49.5" r="1.2" fill="%23ffffff"/><circle cx="58" cy="49.5" r="1.2" fill="%23ffffff"/><ellipse cx="35" cy="57" rx="3.5" ry="2" fill="%23f472b6" opacity="0.6"/><ellipse cx="65" cy="57" rx="3.5" ry="2" fill="%23f472b6" opacity="0.6"/><path d="M45 64 Q50 69 55 64" fill="none" stroke="%23be185d" stroke-width="2.5" stroke-linecap="round"/><path d="M20 95 C25 80 40 76 50 76 C60 76 75 80 80 95 Z" fill="%23db2777"/></svg>',
  },
  {
    id: 'av-kartun-4',
    label: 'Pelajar Topi',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg4)"/><circle cx="50" cy="54" r="27" fill="%23fed7aa"/><path d="M22 45 C22 26 78 26 78 45 Z" fill="%230284c7"/><path d="M18 45 Q50 36 82 45 L76 50 Q50 43 24 50 Z" fill="%230369a1"/><circle cx="50" cy="27" r="4" fill="%2338bdf8"/><circle cx="39" cy="54" r="3.5" fill="%230f172a"/><circle cx="61" cy="54" r="3.5" fill="%230f172a"/><circle cx="38" cy="52.5" r="1.2" fill="%23ffffff"/><circle cx="60" cy="52.5" r="1.2" fill="%23ffffff"/><path d="M43 66 Q50 74 58 66" fill="%23b91c1c" stroke="%23b91c1c" stroke-width="1.5"/><path d="M24 94 C26 78 38 76 50 76 C62 76 74 78 76 94 Z" fill="%230f172a"/><path d="M38 76 L50 88 L62 76 Z" fill="%2338bdf8"/></svg>',
  },
  {
    id: 'av-kartun-5',
    label: 'Astronot Cilik',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient><linearGradient id="vis" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg5)"/><circle cx="50" cy="50" r="35" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="2"/><ellipse cx="50" cy="50" rx="25" ry="20" fill="url(%23vis)" stroke="%230284c7" stroke-width="2"/><ellipse cx="44" cy="45" rx="8" ry="4" fill="%23ffffff" opacity="0.6" transform="rotate(-15 44 45)"/><circle cx="20" cy="30" r="1" fill="%23ffffff"/><circle cx="80" cy="25" r="1.5" fill="%23fde047"/><circle cx="75" cy="75" r="1" fill="%23ffffff"/><path d="M32 86 C34 76 42 74 50 74 C58 74 66 76 68 86 Z" fill="%23e2e8f0"/><rect x="44" y="80" width="12" height="6" rx="2" fill="%23ef4444"/></svg>',
  },
  {
    id: 'av-kartun-6',
    label: 'Peneliti Sains',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg6)"/><circle cx="50" cy="53" r="27" fill="%23fed7aa"/><path d="M23 48 C20 28 80 28 77 48 C72 32 58 30 50 30 C42 30 28 32 23 48 Z" fill="%231c1917"/><rect x="25" y="44" width="50" height="16" rx="8" fill="%2306b6d4" opacity="0.4" stroke="%230891b2" stroke-width="2.5"/><circle cx="37" cy="52" r="6" fill="%23ffffff" opacity="0.8"/><circle cx="63" cy="52" r="6" fill="%23ffffff" opacity="0.8"/><circle cx="38" cy="52" r="3.5" fill="%230f172a"/><circle cx="64" cy="52" r="3.5" fill="%230f172a"/><path d="M43 68 Q50 75 57 68" fill="none" stroke="%23b91c1c" stroke-width="2.5" stroke-linecap="round"/><path d="M22 94 C26 78 40 76 50 76 C60 76 74 78 78 94 Z" fill="%23ffffff"/><path d="M46 76 L50 84 L54 76 Z" fill="%2310b981"/></svg>',
  },
  {
    id: 'av-kartun-7',
    label: 'Robot Pintar',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="100%" stop-color="%230e7490"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg7)"/><rect x="24" y="32" width="52" height="42" rx="14" fill="%23e2e8f0" stroke="%2394a3b8" stroke-width="2.5"/><line x1="50" y1="32" x2="50" y2="18" stroke="%2364748b" stroke-width="3"/><circle cx="50" cy="16" r="4.5" fill="%23f59e0b"/><rect x="30" y="40" width="40" height="18" rx="6" fill="%230f172a"/><circle cx="40" cy="49" r="4.5" fill="%2338bdf8"/><circle cx="60" cy="49" r="4.5" fill="%2338bdf8"/><path d="M40 65 Q50 71 60 65" fill="none" stroke="%23475569" stroke-width="3" stroke-linecap="round"/><rect x="18" y="44" width="6" height="16" rx="3" fill="%23f59e0b"/><rect x="76" y="44" width="6" height="16" rx="3" fill="%23f59e0b"/><path d="M28 88 C32 80 42 78 50 78 C58 78 68 80 72 88 Z" fill="%23cbd5e1"/></svg>',
  },
  {
    id: 'av-kartun-8',
    label: 'Kucing Cendekia',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg8" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fb923c"/><stop offset="100%" stop-color="%23c2410c"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg8)"/><polygon points="26,45 32,20 48,34" fill="%23fed7aa"/><polygon points="30,42 34,25 44,34" fill="%23f472b6"/><polygon points="74,45 68,20 52,34" fill="%23fed7aa"/><polygon points="70,42 66,25 56,34" fill="%23f472b6"/><circle cx="50" cy="56" r="28" fill="%23fed7aa"/><ellipse cx="38" cy="54" rx="4.5" ry="6" fill="%230f172a"/><ellipse cx="62" cy="54" rx="4.5" ry="6" fill="%230f172a"/><circle cx="36" cy="52" r="1.8" fill="%23ffffff"/><circle cx="60" cy="52" r="1.8" fill="%23ffffff"/><polygon points="50,62 46,65 54,65" fill="%23f43f5e"/><path d="M46 65 Q42 70 38 67 M54 65 Q58 70 62 67" fill="none" stroke="%2378350f" stroke-width="2" stroke-linecap="round"/><ellipse cx="28" cy="62" rx="4" ry="2" fill="%23f472b6" opacity="0.6"/><ellipse cx="72" cy="62" rx="4" ry="2" fill="%23f472b6" opacity="0.6"/><path d="M30 18 L50 24 L70 18 L50 12 Z" fill="%231e1b4b"/><path d="M48 24 L48 30 L44 32" fill="none" stroke="%23eab308" stroke-width="2"/><circle cx="44" cy="33" r="2" fill="%23eab308"/></svg>',
  },
  {
    id: 'av-kartun-9',
    label: 'Burung Hantu',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg9" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23818cf8"/><stop offset="100%" stop-color="%234338ca"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg9)"/><ellipse cx="50" cy="58" rx="28" ry="30" fill="%2392400e"/><ellipse cx="50" cy="64" rx="18" ry="20" fill="%23fef3c7"/><circle cx="36" cy="50" r="12" fill="%23ffffff" stroke="%23d97706" stroke-width="2"/><circle cx="64" cy="50" r="12" fill="%23ffffff" stroke="%23d97706" stroke-width="2"/><circle cx="38" cy="50" r="5" fill="%230f172a"/><circle cx="62" cy="50" r="5" fill="%230f172a"/><circle cx="37" cy="48" r="1.5" fill="%23ffffff"/><circle cx="61" cy="48" r="1.5" fill="%23ffffff"/><polygon points="50,56 46,64 54,64" fill="%23f59e0b"/><rect x="25" y="16" width="50" height="8" rx="2" fill="%231e1b4b"/><polygon points="28,20 50,10 72,20 50,26" fill="%230f172a"/><circle cx="50" cy="18" r="2" fill="%23eab308"/></svg>',
  },
  {
    id: 'av-kartun-10',
    label: 'Rubah Peneliti',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg10" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232dd4bf"/><stop offset="100%" stop-color="%230f766e"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg10)"/><polygon points="22,46 26,18 46,32" fill="%23ea580c"/><polygon points="26,42 29,24 42,32" fill="%23fed7aa"/><polygon points="78,46 74,18 54,32" fill="%23ea580c"/><polygon points="74,42 71,24 58,32" fill="%23fed7aa"/><circle cx="50" cy="56" r="28" fill="%23ea580c"/><path d="M26 62 Q50 82 74 62 Q68 50 50 60 Q32 50 26 62 Z" fill="%23ffffff"/><circle cx="37" cy="52" r="4" fill="%230f172a"/><circle cx="63" cy="52" r="4" fill="%230f172a"/><circle cx="36" cy="50.5" r="1.5" fill="%23ffffff"/><circle cx="62" cy="50.5" r="1.5" fill="%23ffffff"/><circle cx="50" cy="66" r="3.5" fill="%230f172a"/></svg>',
  },
  {
    id: 'av-kartun-11',
    label: 'Dino Cendekia',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg11" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23a3e635"/><stop offset="100%" stop-color="%234d7c0f"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg11)"/><circle cx="50" cy="54" r="28" fill="%234ade80"/><circle cx="30" cy="28" r="5" fill="%2322c55e"/><circle cx="46" cy="24" r="6" fill="%2322c55e"/><circle cx="62" cy="26" r="5" fill="%2322c55e"/><circle cx="40" cy="50" r="5" fill="%230f172a"/><circle cx="60" cy="50" r="5" fill="%230f172a"/><circle cx="38" cy="48" r="1.8" fill="%23ffffff"/><circle cx="58" cy="48" r="1.8" fill="%23ffffff"/><ellipse cx="32" cy="58" rx="4" ry="2.5" fill="%23f472b6" opacity="0.6"/><ellipse cx="68" cy="58" rx="4" ry="2.5" fill="%23f472b6" opacity="0.6"/><path d="M42 64 Q50 72 58 64" fill="none" stroke="%23166534" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="58" r="1.5" fill="%23166534"/><circle cx="55" cy="58" r="1.5" fill="%23166534"/></svg>',
  },
  {
    id: 'av-kartun-12',
    label: 'Siswi Ceria',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg12" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23c084fc"/><stop offset="100%" stop-color="%237e22ce"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg12)"/><circle cx="30" cy="42" r="14" fill="%233b1e08"/><circle cx="70" cy="42" r="14" fill="%233b1e08"/><circle cx="50" cy="34" r="16" fill="%233b1e08"/><circle cx="50" cy="54" r="26" fill="%23fcd34d"/><circle cx="40" cy="52" r="3.5" fill="%230f172a"/><circle cx="60" cy="52" r="3.5" fill="%230f172a"/><circle cx="39" cy="50.5" r="1.2" fill="%23ffffff"/><circle cx="59" cy="50.5" r="1.2" fill="%23ffffff"/><ellipse cx="32" cy="58" rx="4" ry="2.5" fill="%23f472b6" opacity="0.6"/><ellipse cx="68" cy="58" rx="4" ry="2.5" fill="%23f472b6" opacity="0.6"/><path d="M44 65 Q50 72 56 65" fill="%23e11d48" stroke="%23e11d48" stroke-width="1.5"/><circle cx="68" cy="38" r="4" fill="%23fde047"/></svg>',
  },
  {
    id: 'av-kartun-13',
    label: 'Pelajar Jenius',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg13" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366f1"/><stop offset="100%" stop-color="%234338ca"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg13)"/><circle cx="50" cy="54" r="27" fill="%23fed7aa"/><path d="M25 46 C25 22 75 22 75 46 C67 30 57 28 50 30 C43 28 33 30 25 46 Z" fill="%231e1b4b"/><circle cx="39" cy="54" r="3.5" fill="%230f172a"/><circle cx="61" cy="54" r="3.5" fill="%230f172a"/><circle cx="38" cy="52" r="1.2" fill="%23ffffff"/><circle cx="60" cy="52" r="1.2" fill="%23ffffff"/><polygon points="50,22 52,27 57,28 53,32 54,37 50,34 46,37 47,32 43,28 48,27" fill="%23fde047"/><path d="M43 66 Q50 72 57 66" fill="none" stroke="%23e11d48" stroke-width="2.5" stroke-linecap="round"/><path d="M24 94 C26 78 40 76 50 76 C60 76 74 78 76 94 Z" fill="%2338bdf8"/><path d="M46 76 L50 84 L54 76 Z" fill="%23ffffff"/></svg>',
  },
  {
    id: 'av-kartun-14',
    label: 'Penjelajah Alam',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg14" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2314b8a6"/><stop offset="100%" stop-color="%230f766e"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg14)"/><circle cx="50" cy="54" r="27" fill="%23fed7aa"/><ellipse cx="50" cy="38" rx="34" ry="9" fill="%23b45309"/><path d="M28 38 C28 22 72 22 72 38 Z" fill="%23d97706"/><circle cx="39" cy="54" r="3.5" fill="%230f172a"/><circle cx="61" cy="54" r="3.5" fill="%230f172a"/><circle cx="38" cy="52.5" r="1.2" fill="%23ffffff"/><circle cx="60" cy="52.5" r="1.2" fill="%23ffffff"/><ellipse cx="32" cy="59" rx="3.5" ry="2" fill="%23fda4af"/><ellipse cx="68" cy="59" rx="3.5" ry="2" fill="%23fda4af"/><path d="M44 65 Q50 72 56 65" fill="%23b91c1c" stroke="%23b91c1c" stroke-width="1.5"/><path d="M24 94 C26 80 40 76 50 76 C60 76 74 80 76 94 Z" fill="%23f59e0b"/></svg>',
  },
  {
    id: 'av-kartun-15',
    label: 'Panda Pelajar',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg15" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg15)"/><circle cx="28" cy="32" r="12" fill="%230f172a"/><circle cx="72" cy="32" r="12" fill="%230f172a"/><circle cx="50" cy="54" r="28" fill="%23ffffff"/><ellipse cx="38" cy="52" rx="7" ry="9" fill="%230f172a" transform="rotate(-15 38 52)"/><ellipse cx="62" cy="52" rx="7" ry="9" fill="%230f172a" transform="rotate(15 62 52)"/><circle cx="39" cy="50" r="2.5" fill="%23ffffff"/><circle cx="61" cy="50" r="2.5" fill="%23ffffff"/><ellipse cx="50" cy="61" rx="4" ry="2.5" fill="%230f172a"/><path d="M46 65 Q50 68 54 65" fill="none" stroke="%230f172a" stroke-width="2" stroke-linecap="round"/><ellipse cx="28" cy="59" rx="3.5" ry="2" fill="%23fda4af"/><ellipse cx="72" cy="59" rx="3.5" ry="2" fill="%23fda4af"/><path d="M26 94 C28 82 40 78 50 78 C60 78 72 82 74 94 Z" fill="%2338bdf8"/></svg>',
  },
  {
    id: 'av-kartun-16',
    label: 'Koala Cilik',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg16" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23ec4899"/><stop offset="100%" stop-color="%23be185d"/></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(%23bg16)"/><circle cx="24" cy="36" r="14" fill="%2394a3b8"/><circle cx="24" cy="36" r="8" fill="%23fed7aa"/><circle cx="76" cy="36" r="14" fill="%2394a3b8"/><circle cx="76" cy="36" r="8" fill="%23fed7aa"/><circle cx="50" cy="54" r="27" fill="%23cbd5e1"/><ellipse cx="50" cy="56" rx="8" ry="11" fill="%231e293b"/><circle cx="36" cy="50" r="3" fill="%230f172a"/><circle cx="64" cy="50" r="3" fill="%230f172a"/><circle cx="35" cy="48.5" r="1" fill="%23ffffff"/><circle cx="63" cy="48.5" r="1" fill="%23ffffff"/><ellipse cx="28" cy="60" rx="3" ry="2" fill="%23fda4af"/><ellipse cx="72" cy="60" rx="3" ry="2" fill="%23fda4af"/><path d="M26 94 C28 82 40 78 50 78 C60 78 72 82 74 94 Z" fill="%23facc15"/></svg>',
  },
];

interface WeeklySubjectReport {
  id: string;
  subject: string;
  topic: string;
  trend: 'MENINGKAT' | 'MENURUN';
  percentage: string;
  icon: typeof Atom;
  competency: string;
  description: string;
  recommendation: string;
}

export const MuridProfil: React.FC<MuridProfilProps> = ({
  profile,
  portfolios,
  progressList,
  onRefreshPortfolios,
  onLogout,
  onNavigateToLab,
}) => {
  const { updateCurrentUser } = useAuth();
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioItem | null>(null);
  const [isDeletingPortfolio, setIsDeletingPortfolio] = useState<boolean>(false);
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string>('');

  // State untuk Laporan Mingguan (Buka/Tutup Deskripsi per Pelajaran)
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  // State untuk Upload Portofolio Baru
  const [showUploadPortfolioModal, setShowUploadPortfolioModal] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    subjectName: 'Fisika',
    category: 'Eksperimen' as PortfolioCategory,
    reflectionSummary: '',
    conclusion: '',
  });
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    dataUrl?: string;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const portfolioFileInputRef = useRef<HTMLInputElement>(null);

  // State untuk Download Pengalaman Belajar (PDF Misi 1 - Misi 6)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const completedCount = progressList.filter((p) => p.status === 'COMPLETED').length;
  
  // State untuk Tab Modal Foto Profil (Hanya Emoji & Avatar Kartun yang disediakan aplikasi)
  const [photoModalTab, setPhotoModalTab] = useState<'emoji' | 'kartun'>('emoji');

  // Real-time synchronization state for profile & students
  const [profileState, setProfileState] = useState<StudentProfileData>(profile);
  const studentClassId = profileState.student?.classId || profile.student?.classId || '';
  const [classStudentsList, setClassStudentsList] = useState<Student[]>(() => {
    return studentClassId ? storage.getStudentsByClass(studentClassId) : [];
  });

  useEffect(() => {
    setProfileState(profile);
    if (profile.student?.classId) {
      setClassStudentsList(storage.getStudentsByClass(profile.student.classId));
    }
  }, [profile]);

  useEffect(() => {
    const handleKelompokSync = () => {
      const refreshed = storage.getStudentProfile(profile.user.id);
      if (refreshed) {
        setProfileState(refreshed);
        if (refreshed.student?.classId) {
          setClassStudentsList(storage.getStudentsByClass(refreshed.student.classId));
        }
      }
    };
    window.addEventListener('tisenang_student_kelompok_updated', handleKelompokSync);
    window.addEventListener('tisenang_students_updated', handleKelompokSync);
    return () => {
      window.removeEventListener('tisenang_student_kelompok_updated', handleKelompokSync);
      window.removeEventListener('tisenang_students_updated', handleKelompokSync);
    };
  }, [profile.user.id]);

  const user = profileState.user;
  const studentId = profileState.student?.id || '';
  const currentStudent = profileState.student;
  const studentKelompok = currentStudent?.kelompok || 'Kelompok 1';

  // Format avatar murid: hanya emoji atau kartun SVG yang disediakan aplikasi
  const isImageAvatar = Boolean(
    user.avatarUrl && (
      user.avatarUrl.startsWith('data:image') ||
      user.avatarUrl.startsWith('http') ||
      user.avatarUrl.startsWith('/') ||
      user.avatarUrl.startsWith('blob:')
    )
  );
  const isCartoonSvgAvatar = Boolean(user.avatarUrl && user.avatarUrl.startsWith('data:image/svg'));
  const isEmojiAvatar = Boolean(user.avatarUrl && !isImageAvatar && user.avatarUrl.length <= 6);

  const teammates = useMemo(() => {
    if (!studentKelompok || classStudentsList.length === 0) return [];
    return classStudentsList.filter(
      (s) => (s.kelompok || 'Kelompok 1') === studentKelompok && s.id !== studentId
    );
  }, [studentKelompok, classStudentsList, studentId]);

  // Data Asli Laporan Perkembangan Mingguan Berdasarkan Aktivitas Real Siswa
  const weeklyProgressData = useMemo<WeeklySubjectReport[]>(() => {
    const reports: WeeklySubjectReport[] = [];

    // 1. Capaian Misi Pembelajaran Sains & Fisika (MIPA)
    const completedProgress = (progressList || []).filter((p) => p.status === 'COMPLETED');
    const completedMissionsCount = completedProgress.length;
    const avgScore =
      completedMissionsCount > 0
        ? Math.round(
            completedProgress.reduce((sum, p) => sum + (p.score || 80), 0) / completedMissionsCount,
          )
        : 0;

    if (completedMissionsCount > 0) {
      reports.push({
        id: 'real-prog-misi',
        subject: 'Fisika & Sains MIPA',
        topic: `Tuntas ${completedMissionsCount} dari 6 Misi Pembelajaran`,
        trend: avgScore >= 75 ? 'MENINGKAT' : 'MENURUN',
        percentage: `+${Math.min(100, Math.round((completedMissionsCount / 6) * 100))}%`,
        icon: Atom,
        competency: `Penyelesaian Misi Pembelajaran Berbasis Inquiry (${completedMissionsCount}/6 Tuntas)`,
        description: `Murid telah menuntaskan ${completedMissionsCount} dari 6 misi pembelajaran kurikulum Fase F dengan capaian rata-rata skor ${avgScore}/100. Bukti pengerjaan misi tercatat aktif di basis data.`,
        recommendation:
          completedMissionsCount === 6
            ? 'Seluruh 6 misi pembelajaran telah selesai dengan gemilang! Pertahankan ketekunan belajar sains.'
            : `Lanjutkan ke Misi ${completedMissionsCount + 1} untuk menyelesaikan seluruh tahapan pembelajaran Fase F.`,
      });
    }

    // 2. Portofolio Eksperimen Laboratorium & Virtual Lab
    const myPortfolios = (portfolios || []).filter((p) => p.studentId === studentId);
    if (myPortfolios.length > 0) {
      reports.push({
        id: 'real-prog-portofolio',
        subject: 'Eksperimen & Virtual Lab',
        topic: `${myPortfolios.length} Karya Portofolio Disimpan`,
        trend: 'MENINGKAT',
        percentage: `+${Math.min(100, myPortfolios.length * 25)}%`,
        icon: FlaskConical,
        competency: 'Investigasi Saintifik, Pengambilan Data Sensor & Portofolio Digital',
        description: `Telah mendokumentasikan ${myPortfolios.length} karya/eksperimen: ${myPortfolios
          .map((p) => p.title)
          .slice(0, 2)
          .join(', ')}. Seluruh data tersimpan permanen di database.`,
        recommendation:
          'Kemampuan analisis praktikum dan pengolahan data riil sangat baik. Terus tingkatkan variasi eksplorasi sensor.',
      });
    }

    // 3. Asesmen Diagnostik Awal & Sumatif Akhir Siswa
    const asesmenAkhirRecords = storage.getAsesmenAkhirRecords();
    const myAsesmenAkhir = asesmenAkhirRecords.find((a) => a.studentId === studentId);

    const asesmenAwalList = storage.getAsesmenAwal(studentClassId);
    const myAsesmenAwal = asesmenAwalList.find((a) => a.studentId === studentId);

    if (myAsesmenAkhir) {
      reports.push({
        id: 'real-prog-asesmen-akhir',
        subject: 'Asesmen Akhir Sumatif',
        topic: `Evaluasi Sumatif: Nilai ${myAsesmenAkhir.score}/100`,
        trend: myAsesmenAkhir.score >= 75 ? 'MENINGKAT' : 'MENURUN',
        percentage: `${myAsesmenAkhir.score >= 75 ? '+' : ''}${myAsesmenAkhir.score - 75}%`,
        icon: Binary,
        competency: `Ketercapaian TP Sumatif: ${myAsesmenAkhir.kktpStatus || (myAsesmenAkhir.score >= 75 ? 'Tuntas' : 'Belum Tuntas')} (Predikat ${myAsesmenAkhir.predikat || 'Baik'})`,
        description: `Telah menyelesaikan Asesmen Akhir Misi 6 dengan skor ${myAsesmenAkhir.score}/100. Rekaman capaian TP tersimpan di database guru.`,
        recommendation:
          myAsesmenAkhir.catatan ||
          'Kompetensi esensial telah terpenuhi sesuai kriteria ketercapaian tujuan pembelajaran.',
      });
    } else if (myAsesmenAwal) {
      const isSiap = myAsesmenAwal.readinessLevel === 'Siap Mandiri';
      reports.push({
        id: 'real-prog-asesmen-awal',
        subject: 'Asesmen Awal Diagnostik',
        topic: `Kesiapan Belajar: ${myAsesmenAwal.readinessLevel}`,
        trend: isSiap ? 'MENINGKAT' : 'MENURUN',
        percentage: `Skor ${myAsesmenAwal.diagnosticScore}`,
        icon: Binary,
        competency: `Literasi: ${myAsesmenAwal.literacyScore} • Numerasi: ${myAsesmenAwal.numeracyScore} • Penalaran: ${myAsesmenAwal.reasoningScore}`,
        description: `Hasil asesmen awal terdaftar di sistem dengan skor ${myAsesmenAwal.diagnosticScore}/100. Rekomendasi jalur adaptif ALME telah dikalibrasi sesuai kesiapan belajar murid.`,
        recommendation:
          myAsesmenAwal.notes ||
          'Pahami materi konsep awal dan selesaikan misi terpandu untuk mencapai level kesiapan mandiri penuh.',
      });
    }

    return reports;
  }, [profile, portfolios, progressList, studentId, studentClassId]);

  // Handler Download Pengalaman Belajar Lengkap (PDF Misi 1 s.d. Misi 6)
  const handleDownloadPengalamanBelajar = () => {
    try {
      setIsDownloadingPdf(true);

      const allMissions = storage.getMissions();
      const allProgress = storage.getAllStudentProgress(studentId);
      const studentTasks = storage.getStudentTasks(studentId);
      const experimentSession = storage.getStudentExperimentSession(studentId);
      const reflections = storage.getStudentReflections(studentClassId, studentId);
      const latestReflection = reflections.length > 0 ? reflections[reflections.length - 1] : null;
      const asesmenAkhirRecords = storage.getAsesmenAkhirRecords();
      const myAsesmenAkhir = asesmenAkhirRecords.find((a) => a.studentId === studentId);
      const m1Notes = storage.getMisi1Notes(studentId);
      const teachers = storage.getTeachers();
      const teacherName = teachers[0]?.user?.fullName || 'Guru Pengampu MIPA';

      // Mengambil data progress misi 1 sampai 6
      const getMissionItem = (num: number, defaultTitle: string, defaultXp: number, defaultScore = 85) => {
        const mission = allMissions.find((m) => m.coreMissionNumber === num);
        const progress = allProgress.find(
          (p) => (mission && p.missionId === mission.id) || p.missionId.endsWith(`-${num}`)
        );
        const isDone = progress?.status === 'COMPLETED';
        return {
          mission,
          score: progress?.score || (isDone ? defaultScore : 80),
          xp: progress?.xp || mission?.xpReward || defaultXp,
          status: progress?.status || (isDone ? 'COMPLETED' : 'AVAILABLE'),
          title: mission?.title || defaultTitle,
        };
      };

      const m1 = getMissionItem(1, 'Pahami Konsep Esensial Sains', 100, 90);
      const m2 = getMissionItem(2, 'Selesaikan Masalah Nyata STEM', 120, 85);
      const m3 = getMissionItem(3, 'Eksplorasi & Eksperimen Virtual Lab', 150, 95);
      const m4 = getMissionItem(4, 'Permainan Edukasi Sains Interaktif', 100, 88);
      const m5 = getMissionItem(5, 'Refleksi & Penilaian Diri', 110, 92);
      const m6 = getMissionItem(6, 'Asesmen Akhir Komprehensif', 150, 86);

      // Task tugas untuk Misi 2
      const m2Task = studentTasks.find((t) => t.missionId.endsWith('-2') || t.missionId === m2.mission?.id) || studentTasks[0];

      // Format baris tabel eksperimen untuk Misi 3 jika ada
      const experimentRows =
        experimentSession?.rows && experimentSession.rows.length > 0
          ? experimentSession.rows.map((r) => ({
              waktu: r.waktu || 1,
              suhuAwal: r.suhuAwal || 25,
              intensitasCahaya: r.intensitasCahaya || 500,
              suhuAkhir: r.suhuAkhir || 30,
            }))
          : undefined;

      exportPengalamanBelajarToPdf({
        student: {
          name: (user.fullName || user.name || 'Aisyah Azzahra').replace(/\s*\([^)]*\)/g, '').trim(),
          username: user.username,
          nisn: currentStudent?.nisn || undefined,
          className: profileState.className || profile.className || 'XII-1',
          kelompok: studentKelompok,
          xp: profile.xp,
          level: profile.level,
          streakDays: profile.streakDays,
        },
        teacherName,
        missionsData: {
          misi1: {
            title: m1.title,
            score: m1.score,
            xp: m1.xp,
            status: m1.status,
            notes: m1Notes || undefined,
            materi:
              'Analisis Regresi Linear Bivariat, Teori Suhu dan Kalor (Asas Black), Struktur Atom & Ikatan Kimia (VSEPR), serta Konsep Pewarisan Sifat & Transformasi Fungsi.',
          },
          misi2: {
            title: m2.title,
            score: m2.score,
            xp: m2.xp,
            status: m2.status,
            problemSolution:
              m2Task?.conclusion ||
              m2Task?.reflection ||
              'Siswa merumuskan solusi optimal berbasis data saintifik untuk efisiensi perpindahan energi kalor dan mitigasi emisi termal pada studi kasus kontekstual.',
            answersSummary: m2Task?.content || undefined,
            conclusion: m2Task?.conclusion,
            feedback: m2Task?.teacherFeedback,
          },
          misi3: {
            title: m3.title,
            score: m3.score,
            xp: m3.xp,
            status: m3.status,
            experimentRows,
            portfolioCount: portfolios.length,
            conclusion: experimentSession?.parameters
              ? `Eksperimen kalorimeter sensor: intensitas ${experimentSession.parameters.intensitasCahaya} lux dengan volume air ${experimentSession.parameters.volumeAir} mL selama ${experimentSession.parameters.waktuPengamatan} menit terbukti menaikkan suhu fluida secara proporsional linear.`
              : 'Eksperimen sensor terintegrasi membuktikan hubungan linier antara intensitas penyinaran dan laju kenaikan suhu fluida cair.',
          },
          misi4: {
            title: m4.title,
            score: m4.score,
            xp: m4.xp,
            status: m4.status,
            gameHighlights: `Menyelesaikan permainan edukasi sains interaktif dengan perolehan skor ${m4.score}/100. Strategi pemecahan masalah dan ketangkasan konsep fisika-sains terbukti sangat baik.`,
          },
          misi5: {
            title: m5.title,
            score: m5.score,
            xp: m5.xp,
            status: m5.status,
            pemahaman: latestReflection?.reflectionAnswers?.pemahaman,
            tantangan: latestReflection?.reflectionAnswers?.tantangan,
            halMenarik: latestReflection?.reflectionAnswers?.halMenarik,
            rencanaPerbaikan: latestReflection?.reflectionAnswers?.rencanaPerbaikan,
            selfScore: latestReflection?.averageSelfScore || latestReflection?.selfAssessment?.totalScorePercentage,
            komitmen: latestReflection?.selfAssessment?.komitmen || latestReflection?.selfAssessment?.komitmenDiri,
          },
          misi6: {
            title: m6.title,
            score: myAsesmenAkhir ? myAsesmenAkhir.score : m6.score,
            xp: m6.xp,
            status: m6.status,
            kktpStatus: myAsesmenAkhir?.kktpStatus || (m6.score >= 75 ? 'Tuntas' : 'Belum Tuntas'),
            predikat: myAsesmenAkhir?.predikat || (m6.score >= 85 ? 'A (Sangat Baik)' : 'B (Baik)'),
            tpMastery: myAsesmenAkhir?.tpMasteryPercentage || 88,
            catatanGuru: myAsesmenAkhir?.catatan || 'Capaian Tujuan Pembelajaran fase F tercapai dengan tuntas dan optimal.',
          },
        },
        portfoliosList: portfolios.map((p) => ({
          title: p.title,
          subjectName: p.subjectName,
          date: p.date,
          xp: p.xpEarned,
          category: p.category,
        })),
      });

      setDownloadSuccessToast('Laporan PDF Pengalaman Belajar berhasil diunduh dan disimpan ke perangkat!');
      setTimeout(() => setDownloadSuccessToast(null), 4500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Terjadi kesalahan saat mengunduh PDF. Silakan coba kembali.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!id || isDeletingPortfolio) return;
    setIsDeletingPortfolio(true);
    try {
      await storage.deletePortfolio(id);
      onRefreshPortfolios();
      setSelectedPortfolio(null);
    } catch (err) {
      console.error('[MuridProfil] Gagal menghapus portofolio:', err);
    } finally {
      setIsDeletingPortfolio(false);
    }
  };

  const handleOpenPhotoModal = () => {
    setPreviewAvatar(user.avatarUrl || '');
    setShowEditPhotoModal(true);
  };

  const handleSelectAvatar = (avatarValue: string) => {
    storage.updateUser(user.id, { avatarUrl: avatarValue });
    updateCurrentUser({ avatarUrl: avatarValue });
    setPreviewAvatar(avatarValue);
    window.dispatchEvent(new CustomEvent('tisenang_user_updated', { detail: { avatarUrl: avatarValue } }));
    onRefreshPortfolios();
    setShowEditPhotoModal(false);
  };

  const handleResetAvatar = () => {
    handleSelectAvatar('🧑‍🎓');
  };

  // Handler Berkas Portofolio (Drag & Drop + Manual Selection) dengan kompresi otomatis
  const processPortfolioFile = async (file: File) => {
    const sizeCheck = validateFileSize(file);
    if (!sizeCheck.valid) {
      alert(sizeCheck.error);
      return;
    }

    if (file.type.startsWith('image/')) {
      try {
        const res = await compressImageFile(file, {
          maxWidth: 720,
          maxHeight: 720,
          quality: 0.6,
          targetMaxSizeBytes: 60 * 1024,
        });
        setUploadedFile({
          name: file.name,
          size: res.compressedSize,
          dataUrl: res.dataUrl,
        });
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedFile({
            name: file.name,
            size: file.size,
            dataUrl: event.target?.result as string,
          });
        };
        reader.readAsDataURL(file);
      }
    } else {
      setUploadedFile({
        name: file.name,
        size: file.size,
        dataUrl: undefined,
      });
    }
  };

  const handlePortfolioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPortfolioFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPortfolioFile(file);
    }
  };

  const handleSavePortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioForm.title.trim() || !portfolioForm.reflectionSummary.trim()) {
      alert('Mohon isi Judul Portofolio dan Deskripsi / Refleksi karya.');
      return;
    }

    const newPortfolio: PortfolioItem = {
      id: `pf-${Date.now()}`,
      studentId: user.id,
      studentName: user.fullName || user.username,
      classId: user.classId || 'fase-f-1',
      className: user.className || 'Kelas XI MIPA 1',
      title: portfolioForm.title.trim(),
      subjectName: portfolioForm.subjectName,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      category: portfolioForm.category,
      xpEarned: 50,
      visibility: 'CLASS',
      reflectionSummary: portfolioForm.reflectionSummary.trim(),
      conclusion: portfolioForm.conclusion.trim() || undefined,
      documentation: uploadedFile?.dataUrl || (uploadedFile ? uploadedFile.name : undefined) || STUDENT_DRIVE_FOLDER_URL,
      driveLink: STUDENT_DRIVE_FOLDER_URL,
    };

    storage.savePortfolio(newPortfolio);

    onRefreshPortfolios();
    setUploadSuccessMsg('Portofolio berhasil diunggah (+50 XP)!');
    setTimeout(() => {
      setShowUploadPortfolioModal(false);
      setUploadSuccessMsg(null);
      setPortfolioForm({
        title: '',
        subjectName: 'Fisika',
        category: 'Eksperimen',
        reflectionSummary: '',
        conclusion: '',
      });
      setUploadedFile(null);
    }, 1200);
  };

  // Helper to obtain portfolio preview thumbnail from Google Drive (https://drive.google.com/drive/folders/1Xc-5Y2HWvLQie3zuQZmgh9GAtX62D34h?usp=sharing)
  const getPortfolioThumbnail = (item: PortfolioItem): string => {
    const hint = `${item.subjectName || ''} ${item.category || ''} ${item.title || ''}`;
    if (
      item.documentation &&
      typeof item.documentation === 'string' &&
      item.documentation.trim() !== '' &&
      !item.documentation.includes('misi_') &&
      !item.documentation.includes('logo')
    ) {
      if (
        item.documentation.startsWith('data:image') ||
        item.documentation.startsWith('http') ||
        item.documentation.startsWith('/') ||
        item.documentation.startsWith('blob:')
      ) {
        return getOptimizedImageUrl(item.documentation, hint);
      }
    }

    return getOptimizedImageUrl(item.driveLink || STUDENT_DRIVE_FOLDER_URL, hint);
  };

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto pb-12">
      {/* Ambient background glow layers (soft off-white/light gray with subtle blue-purple ambient glow) */}
      <div className="absolute -top-12 -left-12 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-12 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-16 left-1/4 w-80 h-80 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* =========================================================================
          FUTURISTIC HERO PROFILE CARD (Identitas Digital & Pencapaian Siswa)
          ========================================================================= */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#060a19] via-[#0c163b] to-[#190e3f] border border-indigo-500/30 text-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(2,6,23,0.45),0_0_40px_rgba(59,130,246,0.18)]">
        {/* Futuristic digital grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf815_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />

        {/* Dynamic ambient glowing orbs */}
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-cyan-500/12 blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-fuchsia-600/12 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        {/* Kelap-kelip Bintang (Twinkling Cosmic & Cyber Stars) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Star 1 - Top Left */}
          <div className="absolute top-[14%] left-[12%] animate-twinkle-1 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-cyan-300/60 drop-shadow-[0_0_5px_rgba(56,189,248,0.7)]">
              <path fill="currentColor" d="M12 0L14 9.5L24 12L14 14.5L12 24L10 14.5L0 12L10 9.5L12 0Z" />
            </svg>
          </div>

          {/* Star 2 - Top Right */}
          <div className="absolute top-[20%] right-[16%] animate-twinkle-2 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300/60 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]">
              <path fill="currentColor" d="M12 0L14 9.5L24 12L14 14.5L12 24L10 14.5L0 12L10 9.5L12 0Z" />
            </svg>
          </div>

          {/* Star 3 - Center Top */}
          <div className="absolute top-[12%] left-[48%] animate-twinkle-3 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </div>

          {/* Star 4 - Mid Left */}
          <div className="absolute top-[42%] left-[6%] animate-twinkle-4 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300/60 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
          </div>

          {/* Star 5 - Mid Right */}
          <div className="absolute top-[40%] right-[8%] animate-twinkle-5 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-indigo-300/60 drop-shadow-[0_0_5px_rgba(165,180,252,0.7)]">
              <path fill="currentColor" d="M12 0L14 9.5L24 12L14 14.5L12 24L10 14.5L0 12L10 9.5L12 0Z" />
            </svg>
          </div>

          {/* Star 6 - Bottom Center */}
          <div className="absolute top-[75%] left-[55%] animate-twinkle-2 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-300/60 shadow-[0_0_7px_rgba(240,171,252,0.8)]" />
          </div>

          {/* Star 7 - Bottom Right */}
          <div className="absolute top-[78%] right-[22%] animate-twinkle-1 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-cyan-200/50 drop-shadow-[0_0_4px_rgba(165,243,252,0.6)]">
              <path fill="currentColor" d="M12 0L14 9.5L24 12L14 14.5L12 24L10 14.5L0 12L10 9.5L12 0Z" />
            </svg>
          </div>

          {/* Star 8 - Top Mid-Left */}
          <div className="absolute top-[18%] left-[28%] animate-twinkle-6 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-amber-200/60 shadow-[0_0_5px_rgba(253,230,138,0.7)]" />
          </div>

          {/* Star 9 - Top Mid-Right */}
          <div className="absolute top-[28%] right-[32%] animate-twinkle-3 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-cyan-200/55 drop-shadow-[0_0_4px_rgba(165,243,252,0.6)]">
              <path fill="currentColor" d="M12 0L14 9.5L24 12L14 14.5L12 24L10 14.5L0 12L10 9.5L12 0Z" />
            </svg>
          </div>

          {/* Star 10 - Bottom Left */}
          <div className="absolute top-[82%] left-[18%] animate-twinkle-5 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-300/60 shadow-[0_0_6px_rgba(165,180,252,0.7)]" />
          </div>

          {/* Star 11 - Lower Mid-Left */}
          <div className="absolute top-[68%] left-[38%] animate-twinkle-4 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-white/60 shadow-[0_0_5px_rgba(255,255,255,0.7)]" />
          </div>

          {/* Star 12 - Far Top Right */}
          <div className="absolute top-[16%] right-[5%] animate-twinkle-1 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-fuchsia-300/55 drop-shadow-[0_0_5px_rgba(240,171,252,0.7)]">
              <path fill="currentColor" d="M12 0L14 9.5L24 12L14 14.5L12 24L10 14.5L0 12L10 9.5L12 0Z" />
            </svg>
          </div>

          {/* Star 13 - Mid Lower Right */}
          <div className="absolute top-[62%] right-[14%] animate-twinkle-6 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300/60 shadow-[0_0_6px_rgba(103,232,249,0.7)]" />
          </div>

          {/* Star 14 - Bottom Center-Right */}
          <div className="absolute top-[85%] right-[44%] animate-twinkle-2 pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-violet-300/60 shadow-[0_0_5px_rgba(196,181,253,0.7)]" />
          </div>
        </div>

        <div className="relative z-10 space-y-4 sm:space-y-6">
          {/* Baris Paling Atas Hero Card: Badge di Kiri & Tombol Keluar di Kanan Atas */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full border-b border-white/10 pb-3">
            {/* Badge Profil Murid */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Profil Murid</span>
            </div>

            {/* Tombol Keluar Akun Fleksibel Berada pada Bagian Kanan Atas (Tanpa Tumpang Tindih Foto) */}
            <button
              id="btn-logout-profil"
              type="button"
              onClick={onLogout}
              className="min-h-[34px] sm:min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/25 text-slate-200 hover:text-rose-200 border border-white/15 hover:border-rose-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md shadow-xs active:scale-95 shrink-0"
              title="Keluar dari akun murid"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Keluar Akun</span>
            </button>
          </div>

          {/* Konten Hero: Foto Profil & Identitas Murid (Diletakkan di Bawah Baris Atas, Dijamin Tidak Tumpang Tindih) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar dengan Ring Gradient Biru-Ungu-Magenta & Soft Glow (Bisa langsung diklik di fotonya) */}
            <div className="relative group shrink-0">
              <div
                onClick={handleOpenPhotoModal}
                className="relative p-[3px] rounded-[28px] bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 shadow-[0_0_28px_rgba(56,189,248,0.35)] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_38px_rgba(168,85,247,0.5)]"
                title="Klik untuk memilih emoji avatar"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[25px] bg-slate-950 overflow-hidden flex items-center justify-center relative">
                  {isCartoonSvgAvatar ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName || user.username}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-5xl sm:text-6xl select-none leading-none">
                      {isEmojiAvatar ? user.avatarUrl : '🧑‍🎓'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Identitas Murid di Bagian Tengah */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="space-y-1">
                {/* Nama Utama Siswa */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-white tracking-tight">
                  {(user.fullName || user.name || 'Aisyah Azzahra').replace(/\s*\([^)]*\)/g, '').trim()}
                </h1>

                {/* Username, Kelas & Kelompok */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                  <span className="text-xs sm:text-sm text-slate-400 font-mono">
                    @{user.username}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs sm:text-sm text-indigo-300 font-medium">
                    {(profile.className || 'XII-1').replace(/\s*MIPA/gi, '').trim()}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-xs font-bold font-mono">
                    <Users className="w-3 h-3 text-indigo-300" />
                    <span>{studentKelompok}</span>
                  </span>
                </div>

                {/* Informasi Kelompok & Teman-teman Sekelompok (Cukup di bagian paling atas) */}
                <div className="pt-2">
                  <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-indigo-500/25 text-xs backdrop-blur-xs">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Rekan {studentKelompok}:
                    </span>
                    {teammates.length === 0 ? (
                      <span className="text-slate-400 text-[11px] italic">
                        Menunggu pembagian rekan sekelompok oleh guru.
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {teammates.map((tm) => (
                          <span
                            key={tm.id}
                            className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[11px] font-medium border border-white/10 hover:bg-white/20 transition-colors"
                          >
                            {tm.name || tm.user?.fullName || 'Murid'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================================
              STATISTIK PENCAPAIAN (Cukup 2 Kotak: Total XP dan Misi Tuntas)
              ===================================================================== */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-white/10">
            {/* TOTAL XP (Aksen Kuning / Gold) */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-300/80 uppercase tracking-wider">
                  TOTAL XP
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-300 mt-1">
                {profile.xp} <span className="text-xs font-bold text-amber-400/80">XP</span>
              </div>
            </div>

            {/* MISI TUNTAS (Aksen Hijau / Turquoise) */}
            <div className="group relative rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-300/80 uppercase tracking-wider">
                  MISI TUNTAS
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-1">
                {completedCount} <span className="text-xs font-bold text-emerald-400/80">Misi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifikasi unduh berhasil */}
      {downloadSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-lg backdrop-blur-md animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* =========================================================================
          MENU DOWNLOAD PENGALAMAN BELAJAR (HASIL PEKERJAAN & NILAI MISI 1 — MISI 6)
          ========================================================================= */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/70 border border-emerald-500/35 p-4 sm:p-5 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Ambient glow accent */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <FileDown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-display font-extrabold text-white">
                Download Pengalaman Belajar
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                PDF Resmi • Misi 1 s.d. Misi 6
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              Unduh rekapitulasi lengkap berisi seluruh hasil pekerjaan, refleksi metakognitif, dan nilai siswa dari Misi 1 sampai Misi 6 ke komputer atau HP.
            </p>
          </div>
        </div>

        <button
          id="btn-download-pengalaman-belajar-card"
          type="button"
          onClick={handleDownloadPengalamanBelajar}
          disabled={isDownloadingPdf}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 border border-emerald-400/40 disabled:opacity-60 whitespace-nowrap self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4 text-emerald-100" />
          <span>{isDownloadingPdf ? 'Mengunduh PDF...' : 'Download Pengalaman Belajar (PDF)'}</span>
        </button>
      </div>



      {/* =========================================================================
          LAPORAN MINGGUAN (Pelajaran Meningkat & Menurun, Buka untuk Detail)
          ========================================================================= */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-sm space-y-2">
        {/* Header Komponen Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800/80 pb-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Laporan Perkembangan Mingguan</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ringkasan tren capaian: mata pelajaran yang meningkat dan menurun minggu ini.
            </p>
          </div>
          <span className="self-start sm:self-auto text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            Minggu Ini • Fase F
          </span>
        </div>

        {/* Layout List / Rows Ringkas */}
        <div className="divide-y divide-slate-800/80">
          {weeklyProgressData.length === 0 ? (
            <div className="py-6 text-center text-slate-400 space-y-2">
              <TrendingUp className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">
                Belum ada aktivitas mingguan yang tercatat.
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Mulai kerjakan Misi Pembelajaran atau selesaikan eksperimen Virtual Lab untuk melihat analisis perkembangan belajar Anda secara otomatis dan nyata.
              </p>
            </div>
          ) : (
            weeklyProgressData.map((item) => {
              const isOpen = openReportId === item.id;
              const isMeningkat = item.trend === 'MENINGKAT';
              const IconComp = item.icon;

              return (
                <div key={item.id} className="py-2.5 transition-colors">
                  {/* Baris Utama: Desktop horizontal, Mobile 2 baris compact */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Sisi Kiri: Icon, Nama Pelajaran, Topik Singkat */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isMeningkat
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white font-display whitespace-nowrap">
                          {item.subject.replace(/^Pelajaran\s+/i, '')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono truncate">
                          {item.topic}
                        </span>
                      </div>
                    </div>

                    {/* Sisi Kanan: Badge Status Tren & Tombol Buka Deskripsi */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pl-9 sm:pl-0 shrink-0">
                      {/* Badge Tren Compact */}
                      <span
                        className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                          isMeningkat
                            ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                            : 'text-rose-300 bg-rose-500/10 border-rose-500/25'
                        }`}
                      >
                        {isMeningkat ? (
                          <>
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            <span>Meningkat ({item.percentage})</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                            <span>Menurun ({item.percentage})</span>
                          </>
                        )}
                      </span>

                      {/* Tombol Detail Text/Button Ringkas */}
                      <button
                        type="button"
                        onClick={() => setOpenReportId(isOpen ? null : item.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer active:scale-95 ${
                          isOpen
                            ? 'bg-slate-800 text-slate-200 border-slate-700'
                            : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                        }`}
                      >
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>{isOpen ? 'Tutup' : 'Buka Deskripsi'}</span>
                        {isOpen ? (
                          <ChevronUp className="w-3 h-3 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Deskripsi (Hanya muncul ketika diklik tombol Buka) */}
                  {isOpen && (
                    <div
                      className={`mt-2 ml-0 sm:ml-9 p-3 rounded-xl border text-xs space-y-1.5 animate-fadeIn ${
                        isMeningkat
                          ? 'bg-slate-950/60 border-emerald-500/20 text-slate-300'
                          : 'bg-slate-950/60 border-rose-500/20 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Kompetensi Terkait:
                        </span>{' '}
                        <span className="font-semibold text-white">{item.competency}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Deskripsi Evaluasi:
                        </span>
                        <p className="text-slate-300 leading-relaxed text-[11px] mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      <div
                        className={`pt-1.5 border-t text-[11px] flex items-start gap-1.5 ${
                          isMeningkat
                            ? 'border-emerald-500/20 text-emerald-300'
                            : 'border-rose-500/20 text-amber-300'
                        }`}
                      >
                        <span className="font-bold shrink-0">Rekomendasi:</span>
                        <span>{item.recommendation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          PORTOFOLIO (Hanya Judul, Tanggal Upload, Total XP, dan Klik Buka)
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-400" />
              <span>Portofolio & Karya Eksperimen</span>
            </h2>
          </div>

          {/* Tombol Upload Portofolio */}
          <button
            type="button"
            onClick={() => {
              setUploadSuccessMsg(null);
              setShowUploadPortfolioModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer self-start sm:self-auto border border-blue-400/30"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Portofolio</span>
          </button>
        </div>

        {portfolios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {portfolios.map((item) => {
              const thumb = getPortfolioThumbnail(item);

              return (
                <div
                  key={item.id}
                  className="group relative bg-slate-900 border border-slate-800/90 hover:border-indigo-500/40 p-4 sm:p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-950/25 select-none flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle glowing gradient line accent on top */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-3">
                    {/* Thumbnail / Foto Dokumentasi Eksperimen jika tersedia */}
                    {thumb && (
                      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 group-hover:border-slate-700 transition-colors">
                        <img
                          src={thumb}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-950/85 backdrop-blur-md text-cyan-300 border border-cyan-500/30">
                            {item.category || 'Eksperimen'}
                          </span>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-950/85 backdrop-blur-md text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            +{item.xpEarned} XP
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      {/* 1. Judul Portofolio */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider font-mono">
                          {item.subjectName || 'MIPA'}
                        </span>
                        {!thumb && (
                          <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>+{item.xpEarned} XP</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-base font-display font-bold text-white line-clamp-1 group-hover:text-cyan-200 transition-colors">
                        {item.title}
                      </h3>
                    </div>

                    {/* 2. Tanggal Upload & Total XP */}
                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.date}</span>
                      </div>

                      {thumb && (
                        <div className="flex items-center gap-1 text-amber-300 font-mono font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>+{item.xpEarned} XP</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Klik Buka */}
                  <button
                    type="button"
                    onClick={() => setSelectedPortfolio(item)}
                    className="w-full mt-3 py-2 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Klik Buka</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl p-8 bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">
              Belum ada artefak portofolio tersimpan. Selesaikan eksperimen virtual lab untuk menerbitkan portofolio pertamamu!
            </p>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL PILIH AVATAR MURID (Emoji & Karakter yang Disediakan Aplikasi)
          ========================================================================= */}
      <Modal
        isOpen={showEditPhotoModal}
        onClose={() => setShowEditPhotoModal(false)}
        title="Pilih Avatar Murid (Emoji & Karakter)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-slate-800">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPhotoModalTab('emoji')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                photoModalTab === 'emoji'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Emoji Pelajar &amp; Sains
            </button>
            <button
              type="button"
              onClick={() => setPhotoModalTab('kartun')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                photoModalTab === 'kartun'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Avatar Kartun
            </button>
          </div>

          {/* TAB 1: Emoji Pelajar & Sains */}
          {photoModalTab === 'emoji' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Pilih emoji avatar favoritmu:</span>
                <span className="font-mono font-bold text-blue-600">{APP_EMOJI_AVATARS.length} Emoji Pilihan</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 p-1 max-h-[50vh] overflow-y-auto">
                {APP_EMOJI_AVATARS.map((item) => {
                  const isSelected = (previewAvatar || user.avatarUrl) === item.emoji;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectAvatar(item.emoji)}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer p-2 border-2 ${
                        isSelected
                          ? 'border-blue-600 ring-4 ring-blue-400/40 scale-105 shadow-md bg-blue-50'
                          : 'border-slate-200 hover:border-blue-400 hover:scale-105 bg-slate-50 hover:bg-white shadow-2xs'
                      }`}
                      title={item.label}
                    >
                      <span className="text-3xl sm:text-3xl select-none leading-none">{item.emoji}</span>
                      <span className="text-[9px] font-bold text-slate-600 truncate max-w-full mt-1.5">{item.label}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xs">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Avatar Kartun */}
          {photoModalTab === 'kartun' && (
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 p-1 max-h-[50vh] overflow-y-auto">
              {CARTOON_AVATARS.map((item) => {
                const isSelected = (previewAvatar || user.avatarUrl) === item.url;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAvatar(item.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer p-1 group border-2 ${
                      isSelected
                        ? 'border-blue-600 ring-4 ring-blue-400/40 scale-105 shadow-md bg-blue-50'
                        : 'border-slate-200 hover:border-blue-400 hover:scale-105 bg-slate-50 shadow-xs'
                    }`}
                    title={item.label}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="w-full h-full object-contain rounded-xl"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tombol Aksi Sederhana */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetAvatar}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Default (🧑‍🎓)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEditPhotoModal(false)}
              className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* Portfolio Detail Modal */}
      {selectedPortfolio && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-white space-y-5 my-auto shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  {selectedPortfolio.category} • {selectedPortfolio.subjectName}
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1">
                  {selectedPortfolio.title}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Diterbitkan pada {selectedPortfolio.date} oleh {selectedPortfolio.studentName || user.fullName}
                </p>
              </div>

              <div className="flex items-center gap-1 font-mono font-bold text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/30">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                +{selectedPortfolio.xpEarned} XP
              </div>
            </div>

            {/* Foto Dokumentasi Portofolio jika ada */}
            {selectedPortfolio.documentation && (
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                <img
                  src={getPortfolioThumbnail(selectedPortfolio)}
                  alt={selectedPortfolio.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                    Foto Dokumentasi Murid
                  </span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase">
                Ringkasan Refleksi & Temuan:
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {selectedPortfolio.reflectionSummary}
              </p>
            </div>

            {selectedPortfolio.conclusion && (
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-2">
                <div className="text-xs font-mono font-bold text-blue-300 uppercase">
                  Kesimpulan Saintifik:
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedPortfolio.conclusion}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingPortfolio}
                onClick={() => handleDeletePortfolio(selectedPortfolio.id)}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingPortfolio ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Portofolio</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedPortfolio(null)}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Portofolio Murid */}
      <UploadPortfolioModal
        isOpen={showUploadPortfolioModal}
        onClose={() => setShowUploadPortfolioModal(false)}
        onSuccess={() => {
          onRefreshPortfolios();
        }}
        studentId={profile.student?.id || `std-${user.id}`}
        studentName={user.fullName || user.username}
        classId={profile.student?.classId || 'cls-xii-1'}
        className={profile.className || 'XII-1'}
      />
    </div>
  );
};
