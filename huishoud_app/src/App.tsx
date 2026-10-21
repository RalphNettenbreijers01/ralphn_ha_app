import { useEffect, useState } from 'react';
import { Bin, Cart, CalendarDays, DoorOpen, Home, ListChecks, Note, Users } from './components/icons';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import TasksPage from './pages/TasksPage';
import UsersPage from './pages/UsersPage';
import RoomsPage from './pages/RoomsPage';
import NotesPage from './pages/NotesPage';
import AfvalPage from './pages/AfvalPage';
import ShoppingPage from './pages/ShoppingPage';

const ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, el: <Dashboard /> },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays, el: <CalendarPage /> },
  { id: 'taken', label: 'Taken', icon: ListChecks, el: <TasksPage /> },
  { id: 'boodschappen', label: 'Boodschappen', short: 'Winkel', icon: Cart, el: <ShoppingPage /> },
  { id: 'notities', label: 'Notities', icon: Note, el: <NotesPage /> },
  { id: 'gebruikers', label: 'Gebruikers', icon: Users, el: <UsersPage /> },
  { id: 'afval', label: 'Afval', icon: Bin, el: <AfvalPage /> },
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
      <aside className="hidden w-56 shrink-0 border-r border-line bg-side md:block">
        <div className="sticky top-0 p-4">
          <div className="mb-6 flex items-center gap-2 px-2 text-xl font-bold text-fg">
            <span className="text-2xl">🏡</span> Huishouden
          </div>
          <nav className="space-y-1">
            {ROUTES.map(({ id: rid, label, icon: Icon }) => (
              <a
                key={rid}
                href={`#/${rid}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  route.id === rid ? "bg-side-sel font-semibold text-side-sel-fg" : "text-fg hover:bg-fg/10"
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
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-card md:hidden">
        {ROUTES.map(({ id: rid, label, icon: Icon, ...r }) => (
          <a
            key={rid}
            href={`#/${rid}`}
            className={`flex min-w-[60px] flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              route.id === rid ? 'text-primary' : 'text-muted'
            }`}
          >
            <Icon size={20} /> <span className="max-w-full truncate">{'short' in r ? r.short : label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
