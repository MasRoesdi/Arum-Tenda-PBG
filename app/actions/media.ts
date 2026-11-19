'use server';

import sharp from 'sharp';
import { requireAdmin } from '@/utils/supabase/authorization';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Server Action: Mengunggah gambar produk atau galeri ke bucket Supabase Storage 'arum-media'
 * Gambar otomatis dikonversi ke format WebP teroptimasi menggunakan sharp.
 */
export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'File gambar tidak ditemukan atau kosong.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Ukuran file melebihi batas maksimal 5MB.' };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Format file tidak didukung. Harap unggah format JPEG, PNG, atau WebP.',
      };
    }

    const { supabase } = await requireAdmin();

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Konversi gambar ke WebP teroptimasi menggunakan sharp
    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const fileName = `${crypto.randomUUID()}.webp`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('arum-media')
      .upload(filePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Gagal mengunggah ke storage: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('arum-media').getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Terjadi kesalahan sistem saat mengunggah gambar.',
    };
  }
}
