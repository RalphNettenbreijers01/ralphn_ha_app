import { useEffect, useState } from 'react';
import { useStore } from '../store/AppContext';
import { fetchAfval } from '../lib/storage';
import { parseISO, formatShort } from '../lib/dates';
import { addDays, toISO } from '../lib/dates';
import type { AfvalInfo } from '../lib/afval';

export default function AfvalPage() {
  const { afval, users, rooms, setAfvalType, setAfvalTime, syncAfval } = useStore();
  const [info, setInfo] = useState<AfvalInfo | null | undefined>(null); // null = laden, undefined = geen backend
  const [busy, setBusy] = useState(false);

  const load = async (refresh: boolean) => {
    setBusy(true);
    const r = await fetchAfval(refresh);
    setInfo(r);
    if (r?.pickups.length) syncAfval(r.pickups);
    setBusy(false);
  };
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const types = Object.keys(afval.types).sort();
  const upcoming = (info?.pickups ?? []).slice().sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold"><span className="mr-2 inline-block animate-floaty">♻️</span>Afval</h1>
          <p className="text-sm text-muted">Ophaaldagen uit Home Assistant, als taak op de avond ervoor.</p>
        </div>
        <button className="btn-primary" disabled={busy || !info?.configured} onClick={() => load(true)}>
          {busy ? 'Bezig…' : 'Nu synchroniseren'}
        </button>
      </header>

      {info === undefined && (
        <div className="card text-sm text-muted">Geen verbinding met de add-on-server. Deze functie werkt alleen binnen Home Assistant.</div>
      )}

      {info && !info.configured && (
        <div className="card space-y-2 text-sm">
          <p className="font-semibold">Nog niet ingesteld</p>
          <p className="text-muted">
            Open de add-on in Home Assistant → Configuratie en vul bij <code>afval_entities</code> de entiteiten van Afvalbeheer in,
            gescheiden door komma's. Bijvoorbeeld <code>calendar.afvalbeheer</code> of <code>sensor.afvalbeheer_gft, sensor.afvalbeheer_restafval</code>.
            Je vindt de namen onder Ontwikkelaarstools → Statussen. Start daarna de add-on opnieuw.
          </p>
        </div>
      )}

      {info?.errors?.length ? (
        <div className="card border-danger/40 text-sm">
          <p className="mb-1 font-semibold text-danger">Er ging iets mis bij het ophalen</p>
          <ul className="list-inside list-disc text-muted">
            {info.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {types.length > 0 && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Containers</h2>
            <label className="flex items-center gap-2 text-sm">
              Taak op de avond ervoor om
              <input type="time" className="input !w-auto" value={afval.time} onChange={(e) => e.target.value && setAfvalTime(e.target.value)} />
            </label>
          </div>
          <ul className="divide-y divide-line">
            {types.map((t) => {
              const cfg = afval.types[t];
              return (
                <li key={t} className="flex flex-wrap items-center gap-3 py-3">
                  <label className="flex min-w-[140px] flex-1 items-center gap-2 font-medium">
                    <input type="checkbox" checked={cfg.enabled} onChange={(e) => setAfvalType(t, { enabled: e.target.checked })} />
                    {t}
                  </label>
                  <select aria-label={`Gebruiker voor ${t}`} className="input !w-auto" value={cfg.userId ?? ''} disabled={!cfg.enabled} onChange={(e) => setAfvalType(t, { userId: e.target.value || null })}>
                    <option value="">— Niemand —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <select aria-label={`Ruimte voor ${t}`} className="input !w-auto" value={cfg.roomId ?? ''} disabled={!cfg.enabled} onChange={(e) => setAfvalType(t, { roomId: e.target.value || null })}>
                    <option value="">— Geen ruimte —</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">
            Wijzigingen gelden direct voor de nog komende taken. Een taak die je zelf verwijdert, komt niet terug.
          </p>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Komende ophaaldagen</h2>
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {upcoming.slice(0, 20).map((p) => (
              <li key={p.type + p.date} className="flex justify-between gap-3">
                <span>{p.type}</span>
                <span className="text-muted">
                  {formatShort(p.date)} · taak {formatShort(toISO(addDays(parseISO(p.date), -1)))}
                </span>
              </li>
            ))}
          </ul>
          {info?.updatedAt && <p className="mt-3 text-xs text-muted">Laatst opgehaald: {new Date(info.updatedAt).toLocaleString('nl-NL')}</p>}
        </section>
      )}
    </div>
  );
}
