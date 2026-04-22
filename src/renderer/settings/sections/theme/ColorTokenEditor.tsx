import type { ThemeColors } from "@shared/theme";

interface ColorTokenEditorProps {
  tokenKey: keyof ThemeColors;
  value: string;
  label: string;
  onChange: (key: keyof ThemeColors, value: string) => void;
}

export const ColorTokenEditor = ({ tokenKey, value, label, onChange }: ColorTokenEditorProps) => {
  const hexValue = toHex(value);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(tokenKey, e.target.value)}
          className="size-7 shrink-0 cursor-pointer rounded border border-border-primary bg-transparent p-0.5"
        />
        <span className="truncate text-xs text-text-secondary">{label}</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        className="w-24 rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
      />
    </div>
  );
};

const toHex = (color: string): string => {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return "#000000";
};
