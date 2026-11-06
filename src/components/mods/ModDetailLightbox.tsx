"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { UnifiedGalleryImage } from "../../types/unified";

interface ModDetailLightboxProps {
  images: UnifiedGalleryImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

// Square, flat control on the dark scrim
const NAV_BTN =
  "w-9 h-9 grid place-items-center bg-s2 border border-line text-fg-2 hover:text-fg hover:border-line-3 transition-colors duration-fast";

export function ModDetailLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: ModDetailLightboxProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ": // Space to toggle zoom
          e.preventDefault();
          setIsZoomed((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsZoomed(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  }, [images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg) 96%, transparent)" }}
      onClick={onClose}
    >
      {/* Top bar: counter, keyboard hints, close */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <span className="cc-num text-[12px] text-fg-2">
          {t('lightbox.counter', { current: currentIndex + 1, total: images.length })}
        </span>
        <span className="flex-1" />
        <span className="hidden md:flex items-center gap-2 cc-num text-[11px] text-fg-4">
          <span>{t('lightbox.press_space_zoom')}</span>
          <span>·</span>
          <span>{t('lightbox.arrow_keys_navigate')}</span>
          <span>·</span>
          <span>{t('lightbox.esc_close')}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className={NAV_BTN}
          style={{ borderRadius: "var(--r-md)" }}
          aria-label={t('lightbox.esc_close')}
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Image with previous / next */}
      <div className="flex-1 min-h-0 flex items-center gap-4 px-4">
        <div className="w-9 flex-shrink-0">
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className={NAV_BTN}
              style={{ borderRadius: "var(--r-md)" }}
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div
          className="relative flex-1 h-full min-w-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={currentImage.url}
            alt={currentImage.title || `${currentIndex + 1}`}
            className={`
              w-full h-full object-contain
              transition-transform duration-300 cursor-pointer
              ${isZoomed ? "scale-150" : "scale-100"}
            `}
            onClick={() => setIsZoomed((prev) => !prev)}
          />
        </div>

        <div className="w-9 flex-shrink-0">
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className={NAV_BTN}
              style={{ borderRadius: "var(--r-md)" }}
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar: title, description, thumbnails */}
      <div className="flex-shrink-0 px-6 pt-3 pb-4" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-4xl mx-auto">
          {(currentImage.title || currentImage.description) && (
            <div className="text-center">
              {currentImage.title && (
                <h3 className="text-[14px] font-[600] text-fg normal-case tracking-normal">
                  {currentImage.title}
                </h3>
              )}
              {currentImage.description && (
                <p className="text-[12.5px] text-fg-3 mt-0.5">
                  {currentImage.description}
                </p>
              )}
            </div>
          )}

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar justify-center">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    setIsZoomed(false);
                  }}
                  className={`
                    flex-shrink-0 w-16 h-10 overflow-hidden border transition-[opacity,border-color] duration-fast
                    ${index === currentIndex ? "border-fg-2" : "border-line opacity-50 hover:opacity-100"}
                  `}
                  style={{ borderRadius: "var(--r-sm)" }}
                >
                  <img
                    src={image.thumbnail_url || image.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
