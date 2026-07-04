import type { SyntheticEvent } from 'react';

/**
 * Inline SVG placeholder (light box + faint image glyph). Inline so it never
 * itself 404s — important because the real images live on remote object
 * storage that can be unreachable.
 */
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23eceff3'/%3E%3Ccircle cx='45' cy='46' r='8' fill='%23c7cdd6'/%3E%3Cpath d='M24 86l26-30 16 18 12-13 18 25z' fill='%23c7cdd6'/%3E%3C/svg%3E";

/**
 * onError handler for <img>. Swaps a broken/unreachable image for a neutral
 * placeholder instead of the browser's default broken-image icon. Detaches
 * itself after firing so it can never loop if the placeholder also failed.
 */
export function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null;
  if (img.src !== IMAGE_PLACEHOLDER) {
    img.src = IMAGE_PLACEHOLDER;
  }
}
