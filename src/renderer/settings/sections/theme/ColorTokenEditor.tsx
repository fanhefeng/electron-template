import type { ThemeColors } from "@shared/theme";
import { isSafeCssColor } from "@shared/theme";

interface ColorTokenEditorProps {
  tokenKey: keyof ThemeColors;
  value: string;
  label: string;
  onChange: (key: keyof ThemeColors, value: string) => void;
}

export const ColorTokenEditor = ({ tokenKey, value, label, onChange }: ColorTokenEditorProps) => {
  const hexValue = toHex(value);
  const isValid = isSafeCssColor(value);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        {/* The swatch renders the REAL value (rgba()/hsl()/named colors included);
            the native color input sits on top, invisible, so picking still works.
            Previously non-6-digit-hex values displayed as a misleading black swatch. */}
        <span className="relative size-7 shrink-0">
          <span
            aria-hidden
            className="absolute inset-0 rounded border border-border-primary"
            style={{ backgroundColor: isValid ? value : "transparent" }}
          />
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(tokenKey, e.target.value)}
            className="absolute inset-0 size-7 cursor-pointer opacity-0"
          />
        </span>
        <span className="truncate text-xs text-text-secondary">{label}</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        className={`w-24 rounded border px-2 py-1 text-xs text-text-primary focus:outline-none ${
          isValid
            ? "border-border-primary bg-surface-primary focus:border-accent-primary"
            : "border-status-error bg-surface-primary focus:border-status-error"
        }`}
      />
    </div>
  );
};

// The native <input type=color> only accepts #rrggbb. Normalize the common hex
// forms to it (dropping any alpha) so the picker initializes to the real color;
// non-hex values (rgb()/hsl()/named) have no #rrggbb form and fall back to black,
// but the swatch overlay shows the true color regardless.
const toHex = (color: string): string => {
  const value = color.trim();
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) return value.slice(0, 7);
  if (/^#[0-9a-f]{3,4}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return "#000000";
};
