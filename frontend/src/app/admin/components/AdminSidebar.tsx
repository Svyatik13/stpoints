'use client';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Uživatelé', icon: '👥' },
  { id: 'broadcast', label: 'Broadcast', icon: '📢' },
  { id: 'market', label: 'Market Control', icon: '📈' },
  { id: 'coinflip', label: 'Coinflip', icon: '🎰' },
  { id: 'giveaway', label: 'ST-Drops', icon: '🎁' },
  { id: 'cases', label: 'Cases', icon: '📦' },
  { id: 'case-stats', label: 'Case Analytics', icon: '📉' },
  { id: 'teachers', label: 'Učitelé', icon: '🧑‍🏫' },
  { id: 'audit', label: 'Audit Log', icon: '📋' },
] as const;

export type AdminSection = typeof SECTIONS[number]['id'];

interface Props {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ active, onChange, collapsed, onToggle }: Props) {
  return (
    <aside
      className="flex-shrink-0 transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 60 : 220 }}
    >
      <div className="sticky top-0 h-screen flex flex-col py-4 gap-1">
        {/* Toggle */}
        <button
          onClick={onToggle}
          className="mx-auto mb-3 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-text-muted text-xs transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>

        {SECTIONS.map(s => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-st-cyan/10 text-st-cyan border border-st-cyan/20'
                  : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary border border-transparent'
              }`}
              title={s.label}
            >
              <span className="text-base flex-shrink-0">{s.icon}</span>
              {!collapsed && <span className="truncate">{s.label}</span>}
            </button>
          );
        })}

        {/* Version */}
        {!collapsed && (
          <div className="mt-auto px-3 py-2 text-[10px] text-text-muted font-mono">
            Admin Panel v5.0
          </div>
        )}
      </div>
    </aside>
  );
}
