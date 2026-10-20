import { useEffect, useState } from 'react';
import { CalendarDays, DoorOpen, Home, ListChecks, Users } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';
import RoomsPage from './pages/RoomsPage';

const ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, el: <Dashboard /> },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays, el: <CalendarPage /> },
  { id: 'taken', label: 'Taken', icon: ListChecks, el: <TasksPage /> },
  { id: 'gebruikers', label: 'Gebruikers', icon: Users, el: <UsersPage /> },
  { id: 'ruimtes', label: 'Ruimtes', icon: DoorOpen, el: <RoomsPage /> },
] as const;

const currentId = () => window.location.hash.replace('#/', '') || 'dashboard';

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
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="sticky top-0 p-4">
          <div className="mb-6 flex items-center gap-2 px-2 text-xl font-bold text-indigo-600">
            <span className="text-2xl">🏡</span> Thuis
          </div>
          <nav className="space-y-1">
            {ROUTES.map(({ id: rid, label, icon: Icon }) => (
              <a
                key={rid}
                href={`#/${rid}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  route.id === rid ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={18} /> {label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <div className="mx-auto max-w-6xl">{route.el}</div>
      </main>

      {/* onderste navigatie (mobiel) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
        {ROUTES.map(({ id: rid, label, icon: Icon }) => (
          <a
            key={rid}
            href={`#/${rid}`}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              route.id === rid ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <Icon size={20} /> {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
