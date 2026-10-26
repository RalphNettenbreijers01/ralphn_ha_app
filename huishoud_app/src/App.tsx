import { useEffect, useState } from 'react';
import { CloudOff } from './components/icons';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';
import RoomsPage from './pages/RoomsPage';
import NotesPage from './pages/NotesPage';
import AfvalPage from './pages/AfvalPage';
import MealsPage from './pages/MealsPage';
import RecipesPage from './pages/RecipesPage';
import ListsPage from './pages/ListsPage';
import StatsPage from './pages/StatsPage';
import PointsPage from './pages/PointsPage';
import ShoppingPage from './pages/ShoppingPage';
import { useStore } from './store/AppContext';

// Elk onderdeel heeft een eigen emoji en kleur
const ROUTES = [
  { id: 'dashboard', label: 'Dashboard', emoji: '🏠', color: '#6366f1', el: <Dashboard /> },
  { id: 'kalender', label: 'Kalender', emoji: '📅', color: '#ef4444', el: <CalendarPage /> },
  { id: 'taken', label: 'Taken', emoji: '✅', color: '#10b981', el: <TasksPage /> },
  { id: 'maaltijden', label: 'Maaltijden', short: 'Eten', emoji: '🍝', color: '#f97316', el: <MealsPage /> },
  { id: 'recepten', label: 'Recepten', emoji: '👩‍🍳', color: '#eab308', el: <RecipesPage /> },
  { id: 'punten', label: 'Punten & badges', short: 'Punten', emoji: '🏆', color: '#f59e0b', el: <PointsPage /> },
  { id: 'boodschappen', label: 'Boodschappen', short: 'Winkel', emoji: '🛒', color: '#06b6d4', el: <ShoppingPage /> },
  { id: 'lijsten', label: 'Lijsten', emoji: '📋', color: '#8b5cf6', el: <ListsPage /> },
  { id: 'notities', label: 'Notities', emoji: '📌', color: '#facc15', el: <NotesPage /> },
  { id: 'gebruikers', label: 'Gebruikers', emoji: '👨‍👩‍👧‍👦', color: '#ec4899', el: <UsersPage /> },
  { id: 'afval', label: 'Afval', emoji: '♻️', color: '#22c55e', el: <AfvalPage /> },
  { id: 'overzicht', label: 'Overzicht', emoji: '📊', color: '#3b82f6', el: <StatsPage /> },
  { id: 'ruimtes', label: 'Ruimtes', emoji: '🚪', color: '#14b8a6', el: <RoomsPage /> },
] as const;

const currentId = () => window.location.hash.replace('#/', '') || 'dashboard';

function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex max-w-sm flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto animate-pop rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lg">
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function OfflineBanner() {
  const { offline } = useStore();
  if (!offline) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-sm">
      <CloudOff size={18} />
      <span>Geen verbinding. Je wijzigingen worden bewaard en gesynchroniseerd zodra je weer online bent.</span>
    </div>
  );
}

export default function App() {
  const [id, setId] = useState(currentId);
  useEffect(() => {
    const onHash = () => setId(currentId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const route = ROUTES.find((r) => r.id === id) ?? ROUTES[0];

  return (
    <div className="min-h-screen md:flex">
      {/* zijbalk (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-line bg-side md:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto p-4">
          <div className="mb-5 flex items-center gap-2 px-2 text-xl font-bold text-fg">
            <span className="animate-floaty inline-block text-3xl">🏡</span> Huishouden
          </div>
          <nav className="space-y-1">
            {ROUTES.map(({ id: rid, label, emoji, color }) => {
              const active = route.id === rid;
              return (
                <a
                  key={rid}
                  href={`#/${rid}`}
                  className={`group flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium transition ${
                    active ? 'bg-side-sel font-semibold text-side-sel-fg' : 'text-fg hover:bg-fg/10'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg transition group-hover:animate-wiggle ${active ? 'animate-pop' : ''}`}
                    style={{ backgroundColor: color + '33', boxShadow: active ? `0 0 0 2px ${color}` : undefined }}
                  >
                    {emoji}
                  </span>
                  {label}
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <div className="mx-auto max-w-6xl">
          <OfflineBanner />
          {route.el}
        </div>
      </main>

      <Toasts />

      {/* onderste navigatie (mobiel) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-card md:hidden">
        {ROUTES.map(({ id: rid, label, emoji, color, ...r }) => {
          const active = route.id === rid;
          return (
            <a
              key={rid}
              href={`#/${rid}`}
              className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium ${active ? 'text-fg' : 'text-muted'}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${active ? 'animate-pop' : ''}`}
                style={{ backgroundColor: active ? color + '40' : 'transparent', boxShadow: active ? `0 0 0 2px ${color}` : undefined }}
              >
                {emoji}
              </span>
              <span className="max-w-full truncate">{'short' in r ? r.short : label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
