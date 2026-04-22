interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}

export const ToggleSwitch = ({ checked, onChange, ariaLabel }: ToggleSwitchProps) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary
        ${checked ? "bg-accent-primary" : "bg-border-secondary"}
      `}
    >
      <span
        className={`
          pointer-events-none absolute size-5 rounded-full bg-text-inverse shadow-sm
          ring-0 transition-all duration-200 ease-in-out
          [inset-block-start:0.125rem]
          ${checked ? "[inset-inline-start:1.25rem]" : "[inset-inline-start:0.125rem]"}
        `}
      />
    </button>
  );
};
