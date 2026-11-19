'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import SubpageHeader from '../components/subpage-header';
import SubpageFooter from '../components/subpage-footer';
import TentCanvasPreview from '@/components/simulator/TentCanvasPreview';
import { TENT_TEMPLATES, COLOR_PRESETS } from '@/config/tentTemplates';
import { Palette, Layers, Check, ArrowUpRight } from 'lucide-react';

export default function SimulatorClient() {
  const [selectedTentId, setSelectedTentId] = useState('kerut');
  const [activePresetId, setActivePresetId] = useState('navy-silver');

  // Current active tent template config
  const currentTemplate = useMemo(() => {
    return TENT_TEMPLATES.find((t) => t.id === selectedTentId) || TENT_TEMPLATES[0];
  }, [selectedTentId]);

  // Helper to extract default layer states from template
  const getInitialLayerStates = useCallback((template) => {
    const states = {};
    for (const layer of template.layers) {
      states[layer.id] = {
        color: layer.defaultColor,
        intensity: layer.defaultIntensity,
        enabled: layer.defaultEnabled,
      };
    }
    return states;
  }, []);

  // Layer state storage per tent type
  const [layerStates, setLayerStates] = useState(() =>
    getInitialLayerStates(currentTemplate)
  );

  // Switch tent type and reset layer state to that template's defaults
  const handleTentTypeChange = (tentId) => {
    setSelectedTentId(tentId);
    setActivePresetId('navy-silver');
    const targetTemplate = TENT_TEMPLATES.find((t) => t.id === tentId) || TENT_TEMPLATES[0];
    setLayerStates(getInitialLayerStates(targetTemplate));
  };

  // Apply Quick 2-Color Preset
  const handleApplyPreset = (presetId) => {
    const preset = COLOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);
    setLayerStates((prev) => {
      const next = { ...prev };
      for (const layer of currentTemplate.layers) {
        if (!next[layer.id]) continue;
        if (layer.role === 'primary') {
          next[layer.id] = { ...next[layer.id], color: preset.primary, enabled: true };
        } else if (layer.role === 'secondary') {
          next[layer.id] = { ...next[layer.id], color: preset.secondary, enabled: true };
        } else if (layer.role === 'tertiary' || layer.role === 'accent') {
          next[layer.id] = {
            ...next[layer.id],
            color: preset.tertiary || preset.primary,
            enabled: true,
          };
        }
      }
      return next;
    });
  };

  // Custom layer color picker change
  const handleColorChange = (layerId, color) => {
    setActivePresetId(null);
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        color,
        enabled: true,
      },
    }));
  };

  // Custom layer intensity slider change
  const handleIntensityChange = (layerId, intensity) => {
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        intensity,
      },
    }));
  };

  // Toggle layer active / inactive
  const handleToggleLayer = (layerId) => {
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        enabled: !prev[layerId]?.enabled,
      },
    }));
  };

  // Reset to original template defaults
  const handleResetColors = () => {
    setActivePresetId('navy-silver');
    setLayerStates(getInitialLayerStates(currentTemplate));
  };

  // Prepare consultation query summary
  const consultationSummary = useMemo(() => {
    const layerSummary = currentTemplate.layers
      .filter((l) => layerStates[l.id]?.enabled)
      .map((l) => `${l.name} (${layerStates[l.id]?.color})`)
      .join(', ');
    return `Halo Arum Tenda, saya telah merancang simulasi tenda tipe ${currentTemplate.name} dengan kombinasi: ${layerSummary}. Mohon informasi survei lokasi & konsultasi.`;
  }, [currentTemplate, layerStates]);

  return (
    <div className="subpage">
      <SubpageHeader activePage="/simulasi" />

      <main className="tent-simulator-page">
        {/* Page Title & Heading */}
        <div className="simulator-heading">
          <p className="eyebrow">INTERACTIVE PHOTO VISUALIZER</p>
          <h1>Simulasi Tenda &amp; Warna</h1>
          <p>
            Rancang kombinasi warna kain serut dengan visualisasi realistik berbasis lipatan kain
            asli.
          </p>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="simulator-main-layout">
          {/* Left Column: Interactive Canvas Visualizer (Sticky on Desktop) */}
          <section className="simulator-preview-col" aria-label="Kanvas Pratinjau Tenda">
            <TentCanvasPreview
              template={currentTemplate}
              layerStates={layerStates}
              onReset={handleResetColors}
            />
          </section>

          {/* Right Column: Interactive Configuration Panels */}
          <section className="simulator-controls-col" aria-label="Panel Konfigurasi Tenda">
            {/* 1. Model / Tipe Tenda Selector */}
            <div className="sim-control-card">
              <div className="sim-card-header">
                <div>
                  <h2 className="sim-card-title">1. Pilih Tipe Tenda</h2>
                  <p className="sim-card-subtitle">Pilih model kerangka dan pola plafon kain</p>
                </div>
              </div>

              <div className="sim-type-selector-grid" role="group" aria-label="Pilih model tenda">
                {TENT_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTentId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      className={`sim-type-card-btn ${isSelected ? 'is-active' : ''}`}
                      onClick={() => handleTentTypeChange(tpl.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="sim-type-name">{tpl.name}</span>
                      <span className="sim-type-desc">{tpl.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Preset Kombinasi 2-Warna Siap Pakai */}
            <div className="sim-control-card">
              <div className="sim-card-header">
                <div>
                  <h2 className="sim-card-title">2. Kombinasi Warna Siap Pakai</h2>
                  <p className="sim-card-subtitle">
                    Preset 2-warna untuk peninjauan cepat
                  </p>
                </div>
                <Palette size={18} className="text-gray-400" />
              </div>

              <div className="sim-presets-grid" role="group" aria-label="Preset warna siap pakai">
                {COLOR_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`sim-preset-btn ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleApplyPreset(preset.id)}
                      aria-pressed={isActive}
                      title={`Terapkan ${preset.name}`}
                    >
                      <div className="sim-preset-swatches">
                        <span
                          className="sim-preset-dot"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="sim-preset-dot"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </div>
                      <span className="sim-preset-label">{preset.name}</span>
                      {isActive && <Check size={14} className="ml-auto text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Kustomisasi Komponen Layer Per Komponen */}
            <div className="sim-control-card">
              <div className="sim-card-header">
                <div>
                  <h2 className="sim-card-title">3. Kustomisasi Detail Layer</h2>
                  <p className="sim-card-subtitle">
                    Atur warna custom dan kepekatan intensitas tiap bagian kain
                  </p>
                </div>
                <Layers size={18} className="text-gray-400" />
              </div>

              <div className="sim-layers-list">
                {currentTemplate.layers.map((layer) => {
                  const state = layerStates[layer.id] || {
                    color: layer.defaultColor,
                    intensity: layer.defaultIntensity,
                    enabled: layer.defaultEnabled,
                  };

                  return (
                    <div
                      key={layer.id}
                      className={`sim-layer-item ${!state.enabled ? 'is-disabled' : ''}`}
                    >
                      <div className="sim-layer-top">
                        <div className="sim-layer-info">
                          <span className="sim-layer-name">{layer.name}</span>
                          <span className={`sim-role-badge ${layer.role}`}>
                            {layer.role === 'primary'
                              ? 'Primer'
                              : layer.role === 'secondary'
                              ? 'Sekunder'
                              : 'Aksen/Tirai'}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                          <input
                            type="checkbox"
                            checked={state.enabled}
                            onChange={() => handleToggleLayer(layer.id)}
                            className="rounded cursor-pointer"
                          />
                          <span>{state.enabled ? 'Aktif' : 'Off'}</span>
                        </label>
                      </div>

                      {state.enabled && (
                        <div className="sim-layer-controls">
                          {/* Color picker & Hex */}
                          <div className="sim-color-picker-wrap">
                            <input
                              type="color"
                              value={state.color}
                              onChange={(e) => handleColorChange(layer.id, e.target.value)}
                              className="sim-color-input"
                              aria-label={`Pilih warna untuk ${layer.name}`}
                            />
                            <span className="sim-color-hex">{state.color.toUpperCase()}</span>
                          </div>

                          {/* Intensity slider */}
                          <div className="sim-slider-wrap">
                            <div className="sim-slider-label">
                              <span>Kepekatan Warna</span>
                              <b>{state.intensity}%</b>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              step="5"
                              value={state.intensity}
                              onChange={(e) =>
                                handleIntensityChange(layer.id, parseInt(e.target.value, 10))
                              }
                              className="sim-slider"
                              aria-label={`Kepekatan ${layer.name}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Konsultasi & Pemesanan */}
            <div className="sim-cta-card">
              <h3 className="sim-cta-title">Suka dengan Kombinasi Ini?</h3>
              <p className="sim-cta-desc">
                Konsultasikan hasil simulasi Anda langsung dengan tim perancang Arum Tenda untuk
                menyesuaikan ukuran venue dan jadwal acara Anda.
              </p>
              <Link
                className="sim-cta-button"
                href={`/kontak?pesan=${encodeURIComponent(consultationSummary)}`}
              >
                <span>Konsultasikan Pilihan Ini</span>
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SubpageFooter activePage="/simulasi" />
    </div>
  );
}
