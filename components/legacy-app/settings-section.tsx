
import { FoldIcon } from './fold-icon';

export function SettingsSection({
  title,
  folded,
  onToggle,
  className,
  children,
  toggleLabel,
}: {
  title: string;
  folded: boolean;
  onToggle: () => void;
  className: string;
  children: React.ReactNode;
  toggleLabel: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-black text-lg">{title}</h4>
        <button type="button" onClick={onToggle} title={toggleLabel} aria-label={toggleLabel} className="glass-card w-9 h-9 rounded-lg flex items-center justify-center">
          <FoldIcon folded={folded} />
        </button>
      </div>
      {!folded ? children : null}
    </section>
  );
}
