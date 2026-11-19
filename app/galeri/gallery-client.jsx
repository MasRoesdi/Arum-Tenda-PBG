'use client';

import { memo, useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { Play, Sparkles } from 'lucide-react';
import SubpageHeader from '../components/subpage-header';
import SubpageFooter from '../components/subpage-footer';

gsap.registerPlugin(Flip);

const instagramUrl = 'https://www.instagram.com/arumtendapbg/';

function formatIndonesianDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function getGalleryDescription(item) {
  if (!item) return '';
  const dateStr = formatIndonesianDate(item.createdAt);
  const title = (item.title || '').trim();
  const lowerTitle = title.toLowerCase();

  const isLocation = title && !lowerTitle.includes('berminat') && !lowerTitle.includes('hubungi');
  const baseText = isLocation
    ? `Dokumentasi portofolio acara di ${title}`
    : `Dokumentasi portofolio pemasangan tenda Arum Tenda`;

  return dateStr ? `${baseText} — ${dateStr}` : baseText;
}

const InteractiveGallery = memo(function InteractiveGallery({ galleryItems }) {
  const gridRef = useRef(null);
  const modalRef = useRef(null);
  const modalMediaRef = useRef(null);
  const videoContainerRef = useRef(null);
  const overlayRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const instagramLinkRef = useRef(null);
  const typeBadgeRef = useRef(null);
  const mediaBadgeRef = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    const modal = modalRef.current;
    const modalMedia = modalMediaRef.current;
    const videoContainer = videoContainerRef.current;
    const overlay = overlayRef.current;
    const title = titleRef.current;
    const description = descriptionRef.current;
    const instagramLink = instagramLinkRef.current;
    const typeBadge = typeBadgeRef.current;
    const mediaBadge = mediaBadgeRef.current;
    if (!grid || !modal || !modalMedia || !overlay) return undefined;

    const boxes = [...grid.querySelectorAll('.gallery-box')];
    const images = boxes.map((box) => box.querySelector('.gallery-box-content'));
    let activeIndex;
    let activeImage;
    let previousBodyPaddingRight = '';

    function closeGalleryModal() {
      if (activeIndex === undefined || !activeImage) return;

      if (videoContainer) {
        const currentVideo = videoContainer.querySelector('video');
        if (currentVideo) {
          currentVideo.pause();
          currentVideo.removeAttribute('src');
          currentVideo.load();
        }
        videoContainer.innerHTML = '';
        videoContainer.style.display = 'none';
      }

      const index = activeIndex;
      const image = activeImage;
      const state = Flip.getState(image);
      boxes[index]?.appendChild(image);
      activeIndex = undefined;
      activeImage = undefined;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('is-open');
      gsap.to([modal, overlay], { autoAlpha: 0, duration: 0.35, ease: 'power1.inOut' });
      Flip.from(state, {
        duration: 0.7,
        ease: 'power1.inOut',
        absolute: true,
        onComplete: () => {
          gsap.set(image, { clearProps: 'zIndex,willChange' });
          document.body.classList.remove('gallery-modal-open');
          document.body.style.paddingRight = previousBodyPaddingRight;
          images[index]?.focus({ preventScroll: true });
        },
      });
      gsap.set(image, { zIndex: 1002 });
    }

    function openGalleryModal(index, image) {
      if (activeIndex !== undefined) {
        closeGalleryModal();
        return;
      }
      const state = Flip.getState(image);
      modalMedia.appendChild(image);
      activeIndex = index;
      activeImage = image;
      const item = galleryItems[index];
      if (item) {
        title.textContent = item.title;
        description.textContent = getGalleryDescription(item);
        instagramLink.href = item.postUrl || instagramUrl;
        modal.setAttribute('aria-label', `Pratinjau ${item.title}`);

        if (typeBadge) {
          typeBadge.textContent = `Tenda ${item.type || 'Pilihan'}`;
        }
        if (mediaBadge) {
          if (item.mediaType === 'VIDEO') {
            mediaBadge.textContent = '🎥 Video Reels';
            mediaBadge.className = 'gallery-modal-media-badge badge-video';
          } else {
            mediaBadge.textContent = '📷 Foto';
            mediaBadge.className = 'gallery-modal-media-badge';
          }
        }

        if (item.mediaType === 'VIDEO' && item.videoUrl && videoContainer) {
          videoContainer.innerHTML = '';
          const video = document.createElement('video');
          video.className = 'gallery-modal-video';
          video.src = item.videoUrl;
          video.poster = item.image;
          video.controls = true;
          video.playsInline = true;
          video.preload = 'metadata';
          video.autoplay = true;
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          videoContainer.appendChild(video);
          videoContainer.style.display = 'flex';
          video.play().catch(() => {});
        } else if (videoContainer) {
          videoContainer.innerHTML = '';
          videoContainer.style.display = 'none';
        }
      }
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      previousBodyPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.classList.add('gallery-modal-open');
      gsap.to([modal, overlay], { autoAlpha: 1, duration: 0.45, ease: 'power2.out' });
      Flip.from(state, {
        duration: 0.8,
        ease: 'power2.out',
        absolute: true,
        onComplete: () => {
          modal.querySelector('.gallery-modal-close')?.focus({ preventScroll: true });
        },
      });
    }

    const imageHandlers = images.map((image, index) => {
      const handler = () => openGalleryModal(index, image);
      image.addEventListener('click', handler);
      return handler;
    });

    const onEscape = (event) => { if (event.key === 'Escape') closeGalleryModal(); };
    overlay.addEventListener('click', closeGalleryModal);
    modal.querySelector('.gallery-modal-close')?.addEventListener('click', closeGalleryModal);
    document.addEventListener('keydown', onEscape);

    return () => {
      if (videoContainer) {
        const currentVideo = videoContainer.querySelector('video');
        if (currentVideo) {
          currentVideo.pause();
        }
        videoContainer.innerHTML = '';
      }
      if (activeIndex !== undefined && activeImage && boxes[activeIndex]) {
        boxes[activeIndex].appendChild(activeImage);
      }
      images.forEach((image, index) => image.removeEventListener('click', imageHandlers[index]));
      overlay.removeEventListener('click', closeGalleryModal);
      modal.querySelector('.gallery-modal-close')?.removeEventListener('click', closeGalleryModal);
      document.removeEventListener('keydown', onEscape);
      gsap.killTweensOf([modal, overlay, ...images]);
      gsap.set([modal, overlay, ...images], { clearProps: 'all' });
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('gallery-modal-open');
      document.body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [galleryItems]);

  return (
    <>
      <div className="event-gallery-grid boxes-container" id="event-gallery-grid" ref={gridRef} aria-live="polite">
        {galleryItems.map((item, index) => (
          <div className="gallery-box" data-gallery-type={(item.type || 'transparan').toLowerCase()} key={item.id || item.index || index}>
            <button
              className="gallery-box-content"
              type="button"
              aria-label={`Lihat ${item.mediaType === 'VIDEO' ? 'video reels' : 'foto'}: ${item.title}`}
            >
              <img src={item.image} alt={item.title} loading="lazy" />
              {item.mediaType === 'VIDEO' && (
                <div className="gallery-video-badge" aria-label="Instagram Reels Video">
                  <Play size={12} fill="currentColor" strokeWidth={0} />
                  <span>Reels</span>
                </div>
              )}
              <span>{item.title}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="gallery-modal" ref={modalRef} aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="gallery-modal-title">
        <button className="gallery-modal-overlay" type="button" aria-label="Tutup foto" ref={overlayRef} />
        <section className="gallery-modal-layout">
          <div className="gallery-modal-media" ref={modalMediaRef}>
            <div className="gallery-modal-video-container" ref={videoContainerRef} style={{ display: 'none' }} />
          </div>
          <div className="gallery-modal-caption">
            <div className="gallery-modal-tags">
              <span className="gallery-modal-type-badge" ref={typeBadgeRef}>Tenda</span>
              <span className="gallery-modal-media-badge" ref={mediaBadgeRef}>Foto</span>
            </div>
            <h2 id="gallery-modal-title" ref={titleRef} />
            <p className="gallery-modal-description" ref={descriptionRef} />
            <a className="button button-dark gallery-instagram-link" href={instagramUrl} target="_blank" rel="noreferrer" ref={instagramLinkRef}>
              Lihat Post di IG <span>↗</span>
            </a>
            <button type="button" className="gallery-modal-close">Kembali ke galeri</button>
          </div>
        </section>
      </div>
    </>
  );
});

export default function GalleryClient({ initialItems }) {
  const [selectedType, setSelectedType] = useState('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const allItems = useMemo(() => {
    return (initialItems && initialItems.length > 0)
      ? initialItems.map((item, index) => ({
          id: item.id,
          title: item.title,
          type: item.tent_type,
          image: item.image_url,
          mediaType: item.media_type || 'IMAGE',
          videoUrl: item.video_url || null,
          postUrl: item.instagram_url || instagramUrl,
          createdAt: item.created_at,
          index,
        }))
      : [];
  }, [initialItems]);

  const filteredItems = useMemo(() => {
    if (selectedType === 'all') return allItems;
    return allItems.filter(
      (item) => (item.type || '').toLowerCase() === selectedType.toLowerCase()
    );
  }, [allItems, selectedType]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const handleFilterChange = (e) => {
    setSelectedType(e.target.value);
    setVisibleCount(20);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

  const remainingCount = filteredItems.length - displayedItems.length;
  const isCompletelyEmpty = allItems.length === 0;
  const isFilterEmpty = !isCompletelyEmpty && displayedItems.length === 0;

  return (
    <div className="subpage">
      <SubpageHeader activePage="/galeri" />
      <main className="gallery-page-main">
        <div className="gallery-page-heading">
          <div>
            <p className="eyebrow">INSPIRASI ACARA ARUM TENDA</p>
            <h1>Galeri Tenda</h1>
          </div>
          {!isCompletelyEmpty && (
            <label className="gallery-filter-label" htmlFor="gallery-filter">
              <span>JENIS TENDA</span>
              <select
                id="gallery-filter"
                value={selectedType}
                onChange={handleFilterChange}
              >
                <option value="all">Semua jenis ({allItems.length})</option>
                <option value="transparan">Transparan</option>
                <option value="kerut">Kerut</option>
                <option value="blukat">Blukat</option>
                <option value="piramid">Piramid</option>
              </select>
            </label>
          )}
        </div>
        <p className="gallery-page-note">
          Kumpulan suasana dan inspirasi pemasangan tenda asli dari Instagram @arumtendapbg untuk membantu Anda membayangkan acara yang ingin disiapkan.
        </p>

        {isCompletelyEmpty ? (
          <div className="empty-state-notice">
            <div className="empty-state-icon" aria-hidden="true">
              <Sparkles size={26} strokeWidth={1.5} />
            </div>
            <p className="eyebrow">DOKUMENTASI PORTFOLIO</p>
            <h2 className="empty-state-title">Nantikan informasi lebih lanjut!</h2>
            <p className="empty-state-desc">
              Dokumentasi portofolio acara dan inspirasi pemasangan tenda terbaru sedang dipersiapkan. Hubungi kami via WhatsApp untuk konsultasi dan inspirasi langsung.
            </p>
            <a
              className="button button-dark"
              href="https://wa.me/6281234567890?text=Halo%20Arum%20Tenda%2C%20saya%20ingin%20konsultasi%20mengenai%20foto%20dan%20inspirasi%20tenda."
              target="_blank"
              rel="noreferrer"
            >
              Konsultasi Acara via WhatsApp <span>↗</span>
            </a>
          </div>
        ) : isFilterEmpty ? (
          <div className="empty-state-notice">
            <div className="empty-state-icon" aria-hidden="true">
              <Sparkles size={26} strokeWidth={1.5} />
            </div>
            <p className="eyebrow">DOKUMENTASI JENIS TENDA</p>
            <h2 className="empty-state-title">Nantikan informasi lebih lanjut!</h2>
            <p className="empty-state-desc">
              Belum ada foto dokumentasi untuk jenis tenda ini. Dokumentasi baru akan segera kami tambahkan.
            </p>
            <button
              type="button"
              className="button button-dark"
              onClick={() => setSelectedType('all')}
            >
              Lihat Semua Foto ({allItems.length}) <span>↺</span>
            </button>
          </div>
        ) : (
          <>
            <InteractiveGallery galleryItems={displayedItems} />

            {remainingCount > 0 && (
              <div className="gallery-load-more-container">
                <button
                  type="button"
                  className="button button-dark gallery-load-more-button"
                  onClick={handleLoadMore}
                >
                  Muat Lebih Banyak Foto ({remainingCount} lagi) <span>↓</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <SubpageFooter activePage="/galeri" />
    </div>
  );
}
