import {
  BookOpen,
  ClipboardCheck,
  LogOut,
  Settings,
  TrendingUp,
  Trophy,
  Users,
  Video,
} from 'lucide-react';

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: TrendingUp },
  { id: 'lessons', label: 'Lessons & Curricula', icon: BookOpen, badge: 'LEARN' },
  { id: 'quizzes', label: 'Quizzes & Tests', icon: ClipboardCheck, badge: 'ASSESS' },
  { id: 'studio', label: 'Live Studio & AI Chat', icon: Video, badge: 'COMING SOON' },
  { id: 'community', label: 'Practice Partners & ISL', icon: Users, badge: 'UNAVAILABLE' },
  { id: 'achievements', label: 'Credentials & Blockchain', icon: Trophy, badge: 'PLANNED' },
  { id: 'settings', label: 'Profile & Settings', icon: Settings },
];

export default function AppSidebar({ activeNav, user, onNavigate, onLogout }) {
  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[275px] shrink-0 flex-col border-r border-[rgba(92,225,214,0.14)] bg-[rgba(7,20,33,0.95)] p-5 shadow-sm backdrop-blur-xl max-lg:w-[76px] max-lg:px-2 max-sm:w-14 max-sm:px-1">
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sb-violet to-sb-signal text-2xl text-sb-midnight shadow-lg" aria-hidden="true">🤟</div>
        <div className="max-lg:hidden">
          <div className="text-xl font-extrabold tracking-tight text-sb-soft">SignBridge <span className="text-sb-signal">AI</span></div>
          <div className="text-[0.68rem] font-bold uppercase tracking-widest text-sb-violet">Inclusive Sign & Speech</div>
        </div>
      </div>
      <div className="mb-2 ml-2 mt-5 text-xs font-bold uppercase tracking-widest text-sb-muted max-lg:sr-only">Menu</div>
      <nav aria-label="Main navigation">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {navigation.map(({ id, label, icon: Icon, badge }) => (
            <li key={id}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sb-signal ${
                  activeNav === id
                    ? 'border-sb-signal bg-gradient-to-r from-sb-signal to-[#84f1e9] font-extrabold text-sb-midnight shadow-lg'
                    : 'border-transparent bg-transparent font-semibold text-sb-muted hover:border-[rgba(92,225,214,0.2)] hover:bg-[rgba(24,48,65,0.6)] hover:text-sb-soft'
                }`}
                aria-current={activeNav === id ? 'page' : undefined}
                aria-label={label}
                title={label}
                onClick={() => onNavigate(id)}
              >
                <Icon size={18} />
                <span className="max-lg:hidden">{label}</span>
                {badge && <span className="ml-auto rounded-xl bg-sb-violet px-2 py-0.5 text-[0.68rem] font-bold text-white max-lg:hidden">{badge}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto border-t border-[rgba(92,225,214,0.14)] pt-5">
        <button
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-[rgba(92,225,214,0.14)] bg-[rgba(24,48,65,0.6)] p-3 text-left transition-colors hover:border-sb-signal hover:bg-[rgba(24,48,65,0.95)]"
          type="button"
          title="Open profile and settings"
          onClick={() => onNavigate('settings')}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sb-violet to-sb-signal font-extrabold text-sb-midnight">{(user?.name || 'L').charAt(0).toUpperCase()}</span>
          <span className="flex min-w-0 flex-col max-lg:hidden">
            <span className="truncate text-sm font-bold text-sb-soft">{user?.name || 'Learner'}</span>
            <span className="text-xs text-sb-signal">ISL learner</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:border hover:border-red-500/30 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          <LogOut size={16} /><span className="max-lg:hidden">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
