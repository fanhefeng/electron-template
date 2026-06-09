import type { ReactNode } from "react";

/**
 * Shared wrapper holding the common SVG attributes (viewBox, stroke styling) so
 * each icon below only declares its own path data instead of repeating the
 * boilerplate. `size` covers the few call sites that need a larger glyph.
 */
const SvgIcon = ({ size = 12, children }: { size?: number; children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const PencilIcon = () => (
  <SvgIcon>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </SvgIcon>
);

export const CopyIcon = () => (
  <SvgIcon>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </SvgIcon>
);

export const DownloadIcon = () => (
  <SvgIcon>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </SvgIcon>
);

export const TrashIcon = () => (
  <SvgIcon>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </SvgIcon>
);

export const CloseIcon = () => (
  <SvgIcon size={16}>
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </SvgIcon>
);
