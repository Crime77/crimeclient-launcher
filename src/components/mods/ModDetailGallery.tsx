"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UnifiedGalleryImage } from "../../types/unified";
import { ModDetailLightbox } from "./ModDetailLightbox";

interface ModDetailGalleryProps {
  images: UnifiedGalleryImage[];
}

/** Flat grid of the project's screenshots; a click opens the lightbox. */
export function ModDetailGallery({ images }: ModDetailGalleryProps) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Sort images by ordering, with featured first
  const sortedImages = [...images].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.ordering - b.ordering;
  });

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-3 gap-y-4">
        {sortedImages.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => openLightbox(index)}
            className="group text-left min-w-0"
          >
            <div
              className="aspect-video overflow-hidden bg-s2 border border-line group-hover:border-line-3 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-md)" }}
            >
              <img
                src={image.thumbnail_url || image.url}
                alt={image.title || t('mods.gallery.image', { n: index + 1 })}
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
            </div>
            {(image.title || image.featured) && (
              <div className="mt-1.5 flex items-baseline gap-2 min-w-0">
                {image.title && (
                  <span className="text-[12.5px] text-fg-2 truncate group-hover:text-fg transition-colors duration-fast">
                    {image.title}
                  </span>
                )}
                {image.featured && (
                  <span className="cc-num text-[11px] text-fg-4 flex-shrink-0">{t('mods.gallery.featured')}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <ModDetailLightbox
        images={sortedImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
