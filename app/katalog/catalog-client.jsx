'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import SubpageHeader from '../components/subpage-header';
import SubpageFooter from '../components/subpage-footer';

const whatsappNumber = '6281234567890';

function getProductGalleryCategory(product) {
  const catSlug = (product.category?.slug || '').toLowerCase();
  const name = (product.name || '').toLowerCase();

  if (catSlug === 'tenda' || name.includes('tenda')) return 'tenda';
  if (catSlug.includes('kursi') || catSlug.includes('meja') || name.includes('kursi') || name.includes('meja')) return 'kursi-meja';
  if (catSlug.includes('makan') || name.includes('makan') || name.includes('piring') || name.includes('sendok') || name.includes('garpu')) return 'alat-makan';
  if (catSlug.includes('gelas') || name.includes('gelas') || name.includes('cangkir') || name.includes('glassware')) return 'gelas';
  if (catSlug.includes('prasmanan') || name.includes('prasmanan') || name.includes('baskom') || name.includes('chafing') || name.includes('masak')) return 'prasmanan';
  if (catSlug) return catSlug;
  return 'kursi-meja';
}

function WhatsAppLink({ children, message }) {
  const text = message || 'Halo Arum Tenda, saya ingin konsultasi mengenai kebutuhan sewa tenda untuk acara.';
  return (
    <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function PriceTable({ rows = [], start = 1 }) {
  return (
    <div className="price-table-wrap">
      <table className="price-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nama Barang / Spesifikasi</th>
            <th>Harga Sewa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, price], index) => (
            <tr key={`${name}-${index}`}>
              <td>{String(start + index).padStart(2, '0')}</td>
              <td>{name}</td>
              <td>{price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CatalogClient({ initialProducts }) {
  const products = useMemo(() => {
    return initialProducts && initialProducts.length > 0 ? initialProducts : [];
  }, [initialProducts]);

  const [activePhoto, setActivePhoto] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [inventoryLimit, setInventoryLimit] = useState(15);

  // Daftar harga terhubung langsung dengan katalog admin
  const dynamicPriceRows = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      if (p.prices && p.prices.length > 0) {
        p.prices.forEach((spec) => {
          const specLabel =
            spec.spec_name &&
            spec.spec_name.toLowerCase() !== 'standar' &&
            !p.name.toLowerCase().includes(spec.spec_name.toLowerCase())
              ? `${p.name} (${spec.spec_name})`
              : p.name;
          list.push([
            specLabel,
            `Rp ${new Intl.NumberFormat('id-ID').format(spec.price)} / ${spec.unit}`,
          ]);
        });
      } else if (p.price) {
        list.push([
          p.name,
          `Rp ${new Intl.NumberFormat('id-ID').format(p.price)} / ${p.unit || 'm²'}`,
        ]);
      }
    });

    const midpoint = Math.ceil(list.length / 2);
    return [list.slice(0, midpoint), list.slice(midpoint)];
  }, [products]);

  // Galeri Barang terhubung langsung dengan katalog admin
  const galleryItems = useMemo(() => {
    const adminGalleryItems = products.map((product) => {
      const primaryImage =
        product.colors?.find((c) => c.image_url)?.image_url ||
        '/images/tents/aset_piramid_lux.png';
      const categoryKey = getProductGalleryCategory(product);
      const startingPrice = product.prices?.[0]?.price;
      const unit = product.prices?.[0]?.unit || 'm²';

      return {
        id: `prod-${product.id}`,
        name: product.name,
        slug: product.slug,
        category: categoryKey,
        image: primaryImage,
        price: startingPrice,
        unit: unit,
        description: product.description,
        colors: product.colors || [],
        prices: product.prices || [],
        isFromAdmin: true,
      };
    });

    return [...adminGalleryItems];
  }, [products]);

  const filteredGallery = useMemo(() => {
    if (inventoryFilter === 'all') return galleryItems;
    return galleryItems.filter((item) => item.category === inventoryFilter);
  }, [galleryItems, inventoryFilter]);

  const visibleGallery = useMemo(() => {
    return filteredGallery.slice(0, inventoryLimit);
  }, [filteredGallery, inventoryLimit]);

  const hasPrices = (dynamicPriceRows[0]?.length || 0) + (dynamicPriceRows[1]?.length || 0) > 0;

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

  return (
    <div className="subpage catalog-page">
      <SubpageHeader activePage="/katalog" />
      <main className="catalog-page-main">
        {/* SEKSI 1: PRICELIST */}
        <section className="price-section">
          <div className="catalog-title-row">
            <div>
              <p className="eyebrow">DAFTAR SEWA &amp; PERLENGKAPAN</p>
              <h1>Pricelist</h1>
            </div>
            <p className="catalog-note">
              Daftar harga sewa resmi dan perlengkapan pendukung acara. Detail ukuran, ketersediaan jadwal, dan paket kustom dapat dikonfirmasi bersama tim kami.
            </p>
          </div>
          {hasPrices ? (
            <>
              <div className="price-board">
                <PriceTable rows={dynamicPriceRows[0]} start={1} />
                <PriceTable rows={dynamicPriceRows[1]} start={(dynamicPriceRows[0]?.length || 0) + 1} />
              </div>
              <p className="price-footnote">
                * Estimasi harga dasar sewa harian. Tersedia paket hemat untuk durasi sewa lebih dari 2 hari.
              </p>
            </>
          ) : (
            <div className="empty-state-notice">
              <div className="empty-state-icon" aria-hidden="true">
                <Sparkles size={26} strokeWidth={1.5} />
              </div>
              <p className="eyebrow">DAFTAR SEWA &amp; PERLENGKAPAN</p>
              <h3 className="empty-state-title">Nantikan informasi lebih lanjut!</h3>
              <p className="empty-state-desc">
                Daftar harga sewa resmi dan paket perlengkapan acara sedang dalam pembaruan. Hubungi kami via WhatsApp untuk konsultasi dan penawaran langsung.
              </p>
              <WhatsAppLink message="Halo Arum Tenda, saya ingin menanyakan daftar harga dan estimasi biaya sewa perlengkapan acara.">
                <span className="button button-dark">
                  Tanya Harga via WhatsApp <span>↗</span>
                </span>
              </WhatsAppLink>
            </div>
          )}
        </section>

        {/* SEKSI 2: GALERI BARANG */}
        <section className="catalog-gallery-section">
          <div className="gallery-title-row">
            <div>
              <p className="eyebrow">PILIHAN PERLENGKAPAN</p>
              <h2>Galeri Barang</h2>
            </div>
            <p>Koleksi dokumentasi asli perlengkapan tenda, pesta, prasmanan, dan jamuan dari Arum Tenda.</p>
          </div>

          {galleryItems.length > 0 && (
            <div className="catalog-toolbar" style={{ marginTop: '0', marginBottom: '20px' }}>
              <div className="catalog-tabs" role="group" aria-label="Filter galeri barang">
                {[
                  ['all', `Semua (${galleryItems.length})`],
                  ['tenda', 'Tenda'],
                  ['kursi-meja', 'Kursi & Meja'],
                  ['alat-makan', 'Alat Makan'],
                  ['prasmanan', 'Prasmanan & Masak'],
                  ['gelas', 'Gelas & Minuman'],
                ].map(([key, label]) => (
                  <button
                    type="button"
                    data-filter={key}
                    className={`catalog-filter${inventoryFilter === key ? ' active' : ''}`}
                    key={key}
                    onClick={() => {
                      setInventoryFilter(key);
                      setInventoryLimit(15);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleGallery.length > 0 ? (
            <>
              <div className="catalog-product-grid boxes-container">
                {visibleGallery.map((item) => (
                  <div className="box" key={item.id}>
                    <button
                      className="catalog-product-card box-content"
                      type="button"
                      onClick={() => setActivePhoto(item)}
                      aria-label={`Lihat ${item.name}`}
                    >
                      <img src={item.image} alt={item.name} loading="lazy" />
                      <span>{item.name}</span>
                    </button>
                  </div>
                ))}
              </div>

              {inventoryLimit < filteredGallery.length && (
                <div className="gallery-load-more-container" style={{ marginTop: '28px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="button button-dark gallery-load-more-button"
                    onClick={() => setInventoryLimit((prev) => prev + 15)}
                  >
                    Muat Lebih Banyak Barang ({filteredGallery.length - visibleGallery.length} lagi) <span>↓</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state-notice">
              <div className="empty-state-icon" aria-hidden="true">
                <Sparkles size={26} strokeWidth={1.5} />
              </div>
              <p className="eyebrow">PILIHAN PERLENGKAPAN</p>
              <h3 className="empty-state-title">Nantikan informasi lebih lanjut!</h3>
              <p className="empty-state-desc">
                {galleryItems.length === 0
                  ? 'Koleksi dokumentasi perlengkapan dan katalog barang sedang dipersiapkan untuk Anda.'
                  : 'Belum ada perlengkapan untuk kategori yang dipilih. Nantikan pembaruan katalog segera!'}
              </p>
              {galleryItems.length > 0 && inventoryFilter !== 'all' ? (
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => {
                    setInventoryFilter('all');
                    setInventoryLimit(15);
                  }}
                >
                  Lihat Semua Perlengkapan ({galleryItems.length}) <span>↺</span>
                </button>
              ) : (
                <WhatsAppLink message="Halo Arum Tenda, saya ingin konsultasi mengenai ketersediaan perlengkapan acara.">
                  <span className="button button-dark">
                    Hubungi Kami via WhatsApp <span>↗</span>
                  </span>
                </WhatsAppLink>
              )}
            </div>
          )}
        </section>
      </main>

      <SubpageFooter activePage="/katalog" />

      {/* MODAL LIGHTBOX FOTO BARANG INVENTARIS & PRODUK KATALOG */}
      {activePhoto && (
        <div className="simple-modal-backdrop" role="presentation" onClick={() => setActivePhoto(null)}>
          <section
            className="catalog-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau ${activePhoto.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="catalog-dialog-close"
              type="button"
              aria-label="Tutup pratinjau"
              onClick={() => setActivePhoto(null)}
            >
              ×
            </button>
            <img src={activePhoto.selectedImage || activePhoto.image} alt={activePhoto.name} />
            <div className="catalog-dialog-copy">
              <p className="eyebrow">
                {activePhoto.isFromAdmin
                  ? 'KATALOG SEWA RESMI · ARUM TENDA'
                  : 'DOKUMENTASI BARANG ASLI · ARUM TENDA'}
              </p>
              <h2>{activePhoto.name}</h2>
              {activePhoto.price ? (
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#9e2629', margin: '4px 0 10px' }}>
                  Mulai Rp {new Intl.NumberFormat('id-ID').format(activePhoto.price)} / {activePhoto.unit}
                </p>
              ) : null}
              <p>
                {activePhoto.description ||
                  'Foto dokumentasi asli inventaris perlengkapan pesta dan katering Arum Tenda. Hubungi tim kami untuk menanyakan stok dan ketersediaan jadwal acara Anda.'}
              </p>

              {activePhoto.colors && activePhoto.colors.filter((c) => c.image_url).length > 1 && (
                <div style={{ margin: '14px 0 10px' }}>
                  <p
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      color: '#6f756e',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    PILIHAN VARIASI WARNA / FOTO:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activePhoto.colors
                      .filter((c) => c.image_url)
                      .map((c, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setActivePhoto((prev) => ({ ...prev, selectedImage: c.image_url }))
                          }
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border:
                              (activePhoto.selectedImage || activePhoto.image) === c.image_url
                                ? '2px solid #233729'
                                : '1px solid #dcd8cf',
                            background: '#fff',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: c.hex_code || '#ccc',
                              border: '1px solid rgba(0,0,0,0.15)',
                            }}
                          />
                          {c.color_name}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <WhatsAppLink
                message={`Halo Arum Tenda, saya tertarik dan ingin menanyakan ketersediaan sewa untuk: ${activePhoto.name}${
                  activePhoto.price
                    ? ` (Mulai Rp ${new Intl.NumberFormat('id-ID').format(activePhoto.price)} / ${activePhoto.unit})`
                    : ''
                }. Mohon info harga dan persyaratannya.`}
              >
                <span
                  className="button button-dark"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                >
                  Tanya Sewa via WhatsApp ↗
                </span>
              </WhatsAppLink>

              {activePhoto.slug && (
                <Link
                  href={`/katalog/${activePhoto.slug}`}
                  className="button button-quiet"
                  style={{ marginTop: '8px', width: '100%', justifyContent: 'center', fontSize: '11px' }}
                >
                  Buka Halaman Spesifikasi Penuh ↗
                </Link>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
