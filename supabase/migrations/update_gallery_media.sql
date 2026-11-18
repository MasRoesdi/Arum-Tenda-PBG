-- ==============================================================================
-- MIGRASI: DUKUNGAN INSTAGRAM REELS & STORAGE PERMANEN GALERI
-- ==============================================================================

-- 1. Tambah kolom media_type dan video_url pada tabel gallery_items
ALTER TABLE public.gallery_items
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'IMAGE',
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Buat atau perbarui bucket storage 'gallery' untuk gambar WebP dan video MP4 Reels
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    true,
    26214400, -- 25 MB (25 * 1024 * 1024 bytes) batas aman serverless
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Kebijakan Row Level Security (RLS) pada storage.objects untuk bucket 'gallery'
DROP POLICY IF EXISTS "Public can view gallery media" ON storage.objects;
CREATE POLICY "Public can view gallery media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated admin can upload gallery media" ON storage.objects;
CREATE POLICY "Authenticated admin can upload gallery media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated admin can update gallery media" ON storage.objects;
CREATE POLICY "Authenticated admin can update gallery media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated admin can delete gallery media" ON storage.objects;
CREATE POLICY "Authenticated admin can delete gallery media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'gallery');
