// Samenvoegen van data van meerdere apparaten. Wordt gebruikt door server.js én de app (src/store).
//
// Elk record (taak, notitie, boodschap, gebruiker, ruimte) heeft `updatedAt`; de nieuwste wint per record,
// zodat twee mensen tegelijk verschillende dingen kunnen wijzigen zonder elkaars werk te overschrijven.
// Verwijderen wordt bijgehouden in `deleted` (id → tijdstip), anders zou een verouderd apparaat het record terugzetten.

const COLLECTIONS = ['users', 'rooms', 'tasks', 'notes', 'shopping', 'meals', 'points', 'rewards', 'badges'];
const TOMBSTONE_TTL = 60 * 24 * 60 * 60 * 1000; // 60 dagen

/**
 * @param a bestaande/andere kant
 * @param b nieuwere/lokale kant: wint bij gelijke tijdstippen
 */
export function mergeData(a, b) {
  const now = Date.now();
  const deleted = {};
  for (const src of [a?.deleted, b?.deleted]) {
    for (const [id, ts] of Object.entries(src ?? {})) {
      if (now - ts < TOMBSTONE_TTL) deleted[id] = Math.max(deleted[id] ?? 0, ts);
    }
  }

  const out = {};
  for (const key of COLLECTIONS) {
    const map = new Map();
    for (const x of a?.[key] ?? []) map.set(x.id, x);
    for (const x of b?.[key] ?? []) {
      const cur = map.get(x.id);
      if (!cur || (x.updatedAt ?? 0) >= (cur.updatedAt ?? 0)) map.set(x.id, x);
    }
    out[key] = [...map.values()].filter((x) => (deleted[x.id] ?? -1) < (x.updatedAt ?? 0));
  }

  out.shoppingNames = [...new Set([...(b?.shoppingNames ?? []), ...(a?.shoppingNames ?? [])])].slice(0, 200);

  const aa = a?.afval;
  const ba = b?.afval;
  const pick = !aa ? ba : !ba ? aa : (ba.updatedAt ?? 0) >= (aa.updatedAt ?? 0) ? ba : aa;
  out.afval = {
    types: {},
    time: '18:00',
    ...pick,
    ignored: [...new Set([...(aa?.ignored ?? []), ...(ba?.ignored ?? [])])],
  };
  out.deleted = deleted;
  return out;
}
