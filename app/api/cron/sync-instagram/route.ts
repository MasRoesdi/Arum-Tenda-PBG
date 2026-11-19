import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { createAdminClient, createClient } from '@/utils/supabase/server';

interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
}

interface PersistedMediaResult {
  imageUrl: string;
  videoUrl: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
}

const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB (Batas aman memori serverless)

/**
 * Route Handler: Cron Sync Instagram Feed via Meta Graph API
 * Dilindungi Bearer Token (CRON_SECRET) atau query parameter ?secret=
 */
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

/**
 * Helper: Mengunduh foto/thumbnail, konversi ke WebP via sharp,
 * serta mengunduh video Reels MP4 dan menyimpannya permanen di Supabase Storage bucket 'gallery'.
 */
async function persistMediaToStorage(
  supabase: any,
  item: InstagramMediaItem
): Promise<PersistedMediaResult> {
  const isVideo = item.media_type === 'VIDEO';
  const rawImageUrl = isVideo ? (item.thumbnail_url || item.media_url) : item.media_url;
  const rawVideoUrl = isVideo ? item.media_url : null;

  let permanentImageUrl = rawImageUrl || '';
  let permanentVideoUrl: string | null = null;

  // 1. Unduh dan konversi gambar/thumbnail ke .webp (lebar max 1200px, quality 82)
  if (rawImageUrl) {
    try {
      const imgRes = await fetch(rawImageUrl, { signal: AbortSignal.timeout(15000) });
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        const webpBuffer = await sharp(inputBuffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();

        const imgFileName = `ig-${item.id}.webp`;
        const { error: uploadImgError } = await supabase.storage
          .from('gallery')
          .upload(imgFileName, webpBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadImgError) {
          const { data: pubData } = supabase.storage
            .from('gallery')
            .getPublicUrl(imgFileName);
          if (pubData?.publicUrl) {
            permanentImageUrl = pubData.publicUrl;
          }
        } else {
          console.warn(`[Sync-IG] Gagal upload gambar WebP (${item.id}):`, uploadImgError.message);
        }
      }
    } catch (err: any) {
      console.warn(`[Sync-IG] Error memproses gambar WebP (${item.id}):`, err?.message);
    }
  }

  // 2. Untuk video Reels, unduh file MP4 jika ukuran <= 25MB
  if (isVideo && rawVideoUrl) {
    try {
      let shouldDownload = true;
      try {
        const headRes = await fetch(rawVideoUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
        });
        const len = Number(headRes.headers.get('content-length') || 0);
        if (len > MAX_VIDEO_BYTES) {
          console.warn(`[Sync-IG] Video Reels ${item.id} melebihi 25MB (${len} bytes), dilewati.`);
          shouldDownload = false;
        }
      } catch {
        // Lanjutkan jika HEAD method ditolak atau timeout
      }

      if (shouldDownload) {
        const vidRes = await fetch(rawVideoUrl, { signal: AbortSignal.timeout(30000) });
        if (vidRes.ok) {
          const vidArrayBuffer = await vidRes.arrayBuffer();
          if (vidArrayBuffer.byteLength <= MAX_VIDEO_BYTES) {
            const vidBuffer = Buffer.from(vidArrayBuffer);
            const vidFileName = `ig-${item.id}.mp4`;
            const { error: uploadVidError } = await supabase.storage
              .from('gallery')
              .upload(vidFileName, vidBuffer, {
                contentType: 'video/mp4',
                upsert: true,
              });

            if (!uploadVidError) {
              const { data: vidPubData } = supabase.storage
                .from('gallery')
                .getPublicUrl(vidFileName);
              if (vidPubData?.publicUrl) {
                permanentVideoUrl = vidPubData.publicUrl;
              }
            } else {
              console.warn(`[Sync-IG] Gagal upload video MP4 (${item.id}):`, uploadVidError.message);
            }
          } else {
            console.warn(`[Sync-IG] Ukuran video ${item.id} melebihi batas 25MB.`);
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Sync-IG] Error memproses video MP4 (${item.id}):`, err?.message);
    }
  }

  return {
    imageUrl: permanentImageUrl,
    videoUrl: permanentVideoUrl,
    mediaType: isVideo ? 'VIDEO' : 'IMAGE',
  };
}

async function handleSync(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');

    // 1. Validasi Secret Token (mendukung Bearer Header & ?secret= query)
    const isAuthorized =
      Boolean(cronSecret) &&
      (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak: Bearer token atau parameter secret tidak valid atau tidak disediakan.',
        },
        { status: 401 }
      );
    }

    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

    if (!accessToken || !igAccountId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'INSTAGRAM_ACCESS_TOKEN atau INSTAGRAM_ACCOUNT_ID belum dikonfigurasi di environment. Sinkronisasi dilewati.',
        },
        { status: 200 }
      );
    }

    // 2. Ambil media terbaru dari Meta Graph API menggunakan host graph.facebook.com & Account ID
    const metaApiUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=25&access_token=${accessToken}`;
    const response = await fetch(metaApiUrl, { cache: 'no-store' });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: 'Gagal mengambil data dari Meta Graph API', details: errorData },
        { status: 502 }
      );
    }

    const json = await response.json();
    const mediaList: InstagramMediaItem[] = json.data || [];

    // 3. Inisialisasi Supabase Client
    let supabase;
    try {
      supabase = await createAdminClient();
    } catch {
      supabase = await createClient();
    }

    // Pastikan bucket 'gallery' siap
    try {
      await supabase.storage.createBucket('gallery', {
        public: true,
        fileSizeLimit: MAX_VIDEO_BYTES,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
      });
    } catch {
      // Abaikan jika bucket sudah ada
    }

    let syncedCount = 0;
    let newItemsCount = 0;
    let updatedItemsCount = 0;

    for (const item of mediaList) {
      const permalink = item.permalink;
      const caption = item.caption || 'Koleksi Dokumentasi Arum Tenda';

      // Ambil judul singkat dari baris pertama caption
      const title = caption.split('\n')[0].substring(0, 100).trim() || 'Dokumentasi Acara';

      // Deteksi tipe tenda dari teks caption
      const lowerCaption = caption.toLowerCase();
      let tentType = 'transparan';
      if (lowerCaption.includes('kerut')) tentType = 'kerut';
      else if (lowerCaption.includes('blukat')) tentType = 'blukat';
      else if (lowerCaption.includes('piramid') || lowerCaption.includes('pyramid')) tentType = 'piramid';

      // Cek apakah postingan sudah ada di database
      const { data: existing } = await supabase
        .from('gallery_items')
        .select('id, image_url, video_url, media_type')
        .eq('instagram_url', permalink)
        .maybeSingle();

      // Cek apakah media sudah tersimpan permanen di Supabase Storage
      const alreadyPersisted =
        existing &&
        existing.image_url?.includes('.supabase.co') &&
        (item.media_type !== 'VIDEO' || (existing.video_url && existing.video_url.includes('.supabase.co')));

      let finalImageUrl: string;
      let finalVideoUrl: string | null = null;
      const mediaType = item.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

      if (alreadyPersisted) {
        finalImageUrl = existing.image_url;
        finalVideoUrl = existing.video_url || null;
      } else {
        const persisted = await persistMediaToStorage(supabase, item);
        finalImageUrl = persisted.imageUrl;
        finalVideoUrl = persisted.videoUrl;
      }

      if (!finalImageUrl) continue;

      if (existing) {
        await supabase
          .from('gallery_items')
          .update({
            title,
            tent_type: tentType,
            image_url: finalImageUrl,
            media_type: mediaType,
            video_url: finalVideoUrl,
          })
          .eq('id', existing.id);
        updatedItemsCount++;
      } else {
        await supabase.from('gallery_items').insert({
          title,
          tent_type: tentType,
          image_url: finalImageUrl,
          instagram_url: permalink,
          media_type: mediaType,
          video_url: finalVideoUrl,
          is_featured: false,
        });
        newItemsCount++;
      }

      syncedCount++;
    }

    // 4. On-demand cache invalidation
    revalidatePath('/galeri');
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${syncedCount} item dari Instagram (${newItemsCount} baru, ${updatedItemsCount} diperbarui).`,
      count: syncedCount,
      newItems: newItemsCount,
      updatedItems: updatedItemsCount,
    });
  } catch (error: any) {
    console.error('[Sync-IG] Fatal Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Terjadi kesalahan internal saat sinkronisasi Instagram.',
      },
      { status: 500 }
    );
  }
}
