/**
 * File & Image Compression Utility for Firebase Storage and Realtime Database
 * 
 * Mengompresi setiap gambar atau berkas sebelum dikirim/disimpan ke Firebase
 * untuk menghemat kuota transmisi, mencegah lonjakan beban database,
 * dan mempercepat waktu muat pengguna.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 s.d 1.0 (default: 0.75)
  targetMaxSizeBytes?: number; // default: 200 * 1024 (200 KB)
  outputFormat?: 'image/jpeg' | 'image/webp';
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savingsPercent: number;
  width: number;
  height: number;
  name: string;
  mimeType: string;
}

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (Batas maksimal upload aplikasi)

/**
 * Validasi ukuran berkas maksimal 2MB
 * Menolak jika melebihi 2MB sesuai instruksi sistem
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Ukuran file (${sizeInMb} MB) melebihi batas maksimal 2MB. Aplikasi menolak file ini. Silakan pilih file atau foto dengan ukuran maksimal 2MB.`,
    };
  }
  return { valid: true };
}

/**
 * Format ukuran byte menjadi format yang mudah dibaca (B, KB, MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Hitung perkiraan ukuran byte dari base64 string
 */
export function getBase64ByteSize(base64String: string): number {
  if (!base64String) return 0;
  const base64Clean = base64String.split(',')[1] || base64String;
  const padding = (base64Clean.match(/=*$/) || [''])[0].length;
  return Math.floor((base64Clean.length * 3) / 4) - padding;
}

/**
 * Kompres file gambar menggunakan HTML5 Canvas
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75,
    targetMaxSizeBytes = 200 * 1024, // 200 KB
    outputFormat = 'image/jpeg',
  } = options;

  const originalSize = file.size;

  // Jika file bukan gambar, kembalikan data URL langsung jika memungkinkan
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({
          dataUrl,
          originalSize,
          compressedSize: originalSize,
          savedBytes: 0,
          savingsPercent: 0,
          width: 0,
          height: 0,
          name: file.name,
          mimeType: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback jika decode gambar gagal
        const rawDataUrl = e.target?.result as string;
        resolve({
          dataUrl: rawDataUrl,
          originalSize,
          compressedSize: originalSize,
          savedBytes: 0,
          savingsPercent: 0,
          width: 0,
          height: 0,
          name: file.name,
          mimeType: file.type,
        });
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Pertahankan rasio aspek gambar saat resize
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawDataUrl = e.target?.result as string;
          resolve({
            dataUrl: rawDataUrl,
            originalSize,
            compressedSize: originalSize,
            savedBytes: 0,
            savingsPercent: 0,
            width,
            height,
            name: file.name,
            mimeType: file.type,
          });
          return;
        }

        // Gambar latar belakang putih (mencegah transparansi hitam pada PNG ke JPEG)
        if (outputFormat === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Kompresi tahap 1
        let currentQuality = quality;
        let dataUrl = canvas.toDataURL(outputFormat, currentQuality);
        let compressedSize = getBase64ByteSize(dataUrl);

        // Jika ukuran masih melebihi target dan kualitas masih bisa diturunkan
        if (compressedSize > targetMaxSizeBytes && currentQuality > 0.4) {
          currentQuality = 0.55;
          dataUrl = canvas.toDataURL(outputFormat, currentQuality);
          compressedSize = getBase64ByteSize(dataUrl);
        }

        // Jika masih melebihi, turunkan ke 0.4
        if (compressedSize > targetMaxSizeBytes && currentQuality > 0.35) {
          currentQuality = 0.4;
          dataUrl = canvas.toDataURL(outputFormat, currentQuality);
          compressedSize = getBase64ByteSize(dataUrl);
        }

        const savedBytes = Math.max(0, originalSize - compressedSize);
        const savingsPercent = originalSize > 0 ? Math.round(((savedBytes) / originalSize) * 100) : 0;

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          savedBytes,
          savingsPercent,
          width,
          height,
          name: file.name,
          mimeType: outputFormat,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Kompres data URL base64 yang sudah ada
 */
export async function compressDataUrl(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const originalSize = getBase64ByteSize(dataUrl);
  // Lewatkan kompresi jika sudah kecil (< 120 KB) atau format SVG
  if (originalSize < 120 * 1024 || dataUrl.includes('image/svg+xml')) {
    return dataUrl;
  }

  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    outputFormat = 'image/jpeg',
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      if (outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
      const compressedSize = getBase64ByteSize(compressedDataUrl);

      // Gunakan hasil kompresi hanya jika ukurannya memang lebih kecil
      if (compressedSize < originalSize) {
        resolve(compressedDataUrl);
      } else {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Kompres string base64 secara agresif khusus untuk disimpan di Firebase Realtime Database
 * Mengubah dimensi (max 640px) dan kompresi JPEG (kualitas ~0.55 - 0.45)
 * sehingga ukuran string base64 menjadi sangat ringan (~20KB - 45KB),
 * mencegah server/database overload, namun tetap jernih saat ditampilkan di beranda teman lain.
 */
export async function compressBase64ForFirebase(
  dataUrl: string,
  targetMaxSizeBytes = 50 * 1024 // 50 KB target
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // Lewatkan jika berupa vektor SVG
  if (dataUrl.includes('image/svg+xml')) {
    return dataUrl;
  }

  const currentSize = getBase64ByteSize(dataUrl);
  // Jika sudah sangat kecil (< 32 KB), tidak perlu re-compress
  if (currentSize <= 32 * 1024) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        const maxDimension = 640;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let resultUrl = canvas.toDataURL('image/jpeg', 0.55);
        let resultSize = getBase64ByteSize(resultUrl);

        // Jika ukuran string base64 masih > target, kecilkan dimensi ke 480px dan quality 0.45
        if (resultSize > targetMaxSizeBytes) {
          const smallCanvas = document.createElement('canvas');
          const scale = Math.min(0.8, Math.sqrt(targetMaxSizeBytes / resultSize));
          smallCanvas.width = Math.max(280, Math.round(canvas.width * scale));
          smallCanvas.height = Math.max(200, Math.round(canvas.height * scale));
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.fillStyle = '#FFFFFF';
            sCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
            sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            const secondaryUrl = smallCanvas.toDataURL('image/jpeg', 0.45);
            if (getBase64ByteSize(secondaryUrl) < resultSize) {
              resultUrl = secondaryUrl;
            }
          }
        }

        resolve(resultUrl);
      } catch (err) {
        console.warn('[fileCompressor] compressBase64ForFirebase fallback:', err);
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

