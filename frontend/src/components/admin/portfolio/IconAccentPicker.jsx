import { ACCENT_PRESETS, ACCENT_NAMES, ICON_PRESETS, getAccent } from './portfolioTheme';

// Small grid pickers used in Settings ("Visual") and the create/edit modals
// for a Group/Category — spec §3/§14/§16.
export const IconPicker = ({ value, onChange, accent = 'indigo' }) => {
  const { soft, text } = getAccent(accent);
  return (
    <div className="grid grid-cols-6 gap-2">
      {ICON_PRESETS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          aria-label={icon}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
            value === icon
              ? `${soft} ${text} border-current`
              : 'border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 dark:border-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </button>
      ))}
    </div>
  );
};

export const AccentPicker = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {ACCENT_NAMES.map((name) => {
      const preset = ACCENT_PRESETS[name];
      const active = value === name;
      return (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          aria-label={name}
          className={`h-8 w-8 rounded-full ${preset.swatch} transition ${active ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-white dark:ring-offset-neutral-900' : 'opacity-80 hover:opacity-100'}`}
        />
      );
    })}
  </div>
);

const IconAccentPicker = ({ icon, accent, onIconChange, onAccentChange }) => (
  <div className="space-y-3">
    <div>
      <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Icon</span>
      <IconPicker value={icon} accent={accent} onChange={onIconChange} />
    </div>
    <div>
      <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Accent</span>
      <AccentPicker value={accent} onChange={onAccentChange} />
    </div>
  </div>
);

export default IconAccentPicker;
