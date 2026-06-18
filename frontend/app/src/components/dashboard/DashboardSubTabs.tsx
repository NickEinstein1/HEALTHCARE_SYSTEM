type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
};

/** In-page tabs using production button styles (matches futuristic.css). */
export function DashboardSubTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="dash-subtabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`btn-s btn-sm${active === t.id ? " on" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
