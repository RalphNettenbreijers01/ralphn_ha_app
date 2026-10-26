import { useEffect, useState, type FormEvent } from 'react';
import { Lock, Pencil, Plus, Star, Trash2 } from '../components/icons';
import { useStore } from '../store/AppContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { BADGES, computeStats, currentStreak } from '../lib/badges';
import { balanceOf, levelOf, totalEarned } from '../lib/points';
import { REWARD_EXAMPLES, REWARD_ICONS } from '../lib/storage';
import { celebrate } from '../lib/fun';
import type { Reward } from '../types';

function RewardModal({ reward, onClose }: { reward: Partial<Reward>; onClose: () => void }) {
  const { saveReward, deleteReward } = useStore();
  const [title, setTitle] = useState(reward.title ?? '');
  const [icon, setIcon] = useState(reward.icon ?? REWARD_ICONS[0]);
  const [cost, setCost] = useState(reward.cost ?? 50);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || cost <= 0) return;
    saveReward({ id: reward.id, title: title.trim(), icon, cost: Math.floor(cost) });
    onClose();
  };

  return (
    <Modal title={reward.id ? 'Beloning bewerken' : 'Nieuwe beloning'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="r-title">Beloning</label>
          <input id="r-title" className="input" autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bijv. Filmavond kiezen" />
        </div>
        <div>
          <label className="label" htmlFor="r-cost">Kosten (punten)</label>
          <input id="r-cost" type="number" min={1} className="input !w-32" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </div>
        <div>
          <span className="label">Icoon</span>
          <div className="flex flex-wrap gap-1.5">
            {REWARD_ICONS.map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setIcon(i)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ring-1 ${icon === i ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          {reward.id ? (
            <button
              type="button"
              className="btn-ghost text-danger hover:!bg-danger/10"
              onClick={() => {
                if (confirm('Deze beloning verwijderen?')) {
                  deleteReward(reward.id!);
                  onClose();
                }
              }}
            >
              <Trash2 size={16} /> Verwijderen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn-primary">Opslaan</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function PointsPage() {
  const store = useStore();
  const { users, rewards, badges, points, saveReward, redeemReward, awardBonus, toast } = store;
  const [who, setWho] = useState('');
  const [editing, setEditing] = useState<Partial<Reward> | null>(null);
  const [bonus, setBonus] = useState({ points: 10, reason: '' });

  // standaard de eerste gebruiker kiezen (ook als die later pas wordt aangemaakt)
  useEffect(() => {
    if (!users.some((u) => u.id === who)) setWho(users[0]?.id ?? '');
  }, [users, who]);

  const data = store as unknown as Parameters<typeof balanceOf>[0];
  const ranking = users
    .map((u) => ({ u, balance: balanceOf(data, u.id), earned: totalEarned(data, u.id), streak: currentStreak(data, u.id) }))
    .sort((a, b) => b.earned - a.earned);
  const current = users.find((u) => u.id === who);
  const stats = current ? computeStats(data, current.id) : null;
  const myBadges = new Set(badges.filter((b) => b.userId === who).map((b) => b.badgeId));
  const earnedAt = (id: string) => badges.find((b) => b.userId === who && b.badgeId === id)?.earnedAt;
  const recent = [...points].sort((a, b) => b.ts - a.ts).slice(0, 10);

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold"><span className="mr-2 inline-block animate-floaty">🏆</span>Punten & badges</h1>
        <div className="card py-12 text-center text-muted">Voeg eerst gebruikers toe. Ze verdienen punten door taken af te ronden.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold"><span className="mr-2 inline-block animate-floaty">🏆</span>Punten & badges</h1>
        <p className="text-sm text-muted">Verdien punten met taken, haal badges en wissel punten in voor beloningen.</p>
      </header>

      {/* Scorebord */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ranking.map(({ u, balance, earned, streak }, i) => {
          const { level, progress } = levelOf(earned);
          return (
            <button key={u.id} onClick={() => setWho(u.id)} className={`card text-left transition hover:bg-fg/5 ${who === u.id ? '!border-primary' : ''}`}>
              <div className="flex items-center gap-3">
                <Avatar user={u} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i === 0 && earned > 0 ? '🥇 ' : ''}{u.name}</p>
                  <p className="text-xs text-muted">Level {level}{streak > 1 ? ` · 🔥 ${streak} dagen op rij` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{balance}</p>
                  <p className="text-xs text-muted">punten</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10">
                <div className="h-full rounded-full bg-ok" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{100 - progress} punten tot level {level + 1}</p>
            </button>
          );
        })}
      </section>

      {/* Gebruiker kiezen */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Bekijk als:</span>
        {users.map((u) => (
          <button key={u.id} onClick={() => setWho(u.id)} className={`inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ring-1 ${who === u.id ? 'bg-primary/10 ring-2 ring-primary' : 'ring-line hover:bg-fg/5'}`}>
            <Avatar user={u} size={24} /> {u.name}
          </button>
        ))}
      </div>

      {/* Beloningen */}
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Beloningen {current && <span className="normal-case text-fg">· {current.name} heeft {balanceOf(data, current.id)} punten</span>}
          </h2>
          <button className="btn-secondary" onClick={() => setEditing({})}>
            <Plus size={16} /> Nieuwe beloning
          </button>
        </div>
        {rewards.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">
            <p className="mb-3">Nog geen beloningen.</p>
            <button className="btn-primary" onClick={() => REWARD_EXAMPLES.forEach((r) => saveReward(r))}>Voorbeeldbeloningen toevoegen</button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...rewards].sort((a, b) => a.cost - b.cost).map((r) => {
              const balance = current ? balanceOf(data, current.id) : 0;
              const can = !!current && balance >= r.cost;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fg/10 text-2xl">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-muted"><Star size={12} /> {r.cost} punten</p>
                  </div>
                  <button
                    className="btn-primary !px-3 !py-1.5"
                    disabled={!can}
                    title={can ? 'Inwisselen' : `Nog ${r.cost - balance} punten nodig`}
                    onClick={() => {
                      if (current && confirm(`${current.name}: “${r.title}” inwisselen voor ${r.cost} punten?`) && redeemReward(current.id, r.id)) {
                        toast(`${r.icon} ${current.name} heeft “${r.title}” ingewisseld!`);
                        celebrate();
                      }
                    }}
                  >
                    Inwisselen
                  </button>
                  <button className="btn-ghost !p-1.5" onClick={() => setEditing(r)} aria-label={`${r.title} bewerken`}><Pencil size={16} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Badges */}
      {current && stats && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Badges van {current.name} · {myBadges.size}/{BADGES.length}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {BADGES.map((b) => {
              const got = myBadges.has(b.id);
              const have = Math.min(stats[b.metric], b.target);
              const when = earnedAt(b.id);
              return (
                <li key={b.id} title={b.description} className={`flex flex-col items-center rounded-xl border p-3 text-center ${got ? 'border-warn/50 bg-warn/10' : 'border-line'}`}>
                  <span className={`inline-block text-5xl ${got ? 'animate-shine hover:animate-wiggle' : 'opacity-30 grayscale'}`}>{b.icon}</span>
                  <p className="mt-1 text-sm font-semibold">{b.name}</p>
                  <p className="text-xs text-muted">{b.description}</p>
                  {got ? (
                    <p className="mt-1 text-xs text-ok">Behaald{when ? ` op ${new Date(when).toLocaleDateString('nl-NL')}` : ''}</p>
                  ) : (
                    <div className="mt-2 w-full">
                      <div className="h-1.5 overflow-hidden rounded-full bg-fg/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(have / b.target) * 100}%` }} />
                      </div>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><Lock size={11} /> {have}/{b.target}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bonuspunten */}
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Bonuspunten geven</h2>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!current || bonus.points <= 0) return;
              awardBonus(current.id, Math.floor(bonus.points), bonus.reason.trim());
              toast(`+${Math.floor(bonus.points)} punten voor ${current.name}`);
              setBonus({ points: 10, reason: '' });
            }}
          >
            <input type="number" min={1} className="input !w-24" aria-label="Punten" value={bonus.points} onChange={(e) => setBonus({ ...bonus, points: Number(e.target.value) })} />
            <input className="input !w-auto min-w-[140px] flex-1" aria-label="Reden" placeholder={`Reden, voor ${current?.name ?? '…'}`} value={bonus.reason} onChange={(e) => setBonus({ ...bonus, reason: e.target.value })} />
            <button className="btn-secondary" type="submit">Geven</button>
          </form>
          <p className="mt-2 text-xs text-muted">Bijvoorbeeld voor extra hulp of een goed rapport.</p>
        </section>

        {/* Activiteit */}
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recente activiteit</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nog niets. Rond een taak af om punten te verdienen!</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((e) => {
                const u = users.find((x) => x.id === e.userId);
                return (
                  <li key={e.id} className="flex items-center gap-2">
                    <Avatar user={u} size={22} />
                    <span className="min-w-0 flex-1 truncate">{e.reason}</span>
                    <span className={e.points >= 0 ? 'font-semibold text-ok' : 'font-semibold text-danger'}>{e.points > 0 ? '+' : ''}{e.points}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editing && <RewardModal reward={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
