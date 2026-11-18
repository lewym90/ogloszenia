// AM Oferty — most między edytorem rzutów a ofertą.
// Edytor i aplikacja AM Oferty są pod tym samym adresem, więc wymieniają dane przez wspólną bazę IndexedDB „am-rzut”:
//   wejscie:<oid> — plan zapisany w ofercie (z serwera), wkłada aplikacja przed otwarciem edytora
//   wynik:<oid>   — plan + obraz PNG + lista pomieszczeń z metrażem wewnętrznym, odbiera aplikacja po powrocie
import { get } from 'svelte/store';
import { currentProject, loadProject, createDefaultProject } from '$lib/stores/project';
import { readProject } from '$lib/utils/projectValidation';
import { autoSave } from '$lib/stores/saveStatus';
import { localStore } from '$lib/services/datastore';
import { resolveRoomGeometry } from '$lib/utils/roomDetection';
import { roomHoles } from '$lib/utils/roomNesting';
import { interiorRoomArea } from '$lib/utils/interiorArea';

function baza(): Promise<IDBDatabase> {
  return new Promise((ok, zle) => {
    const r = indexedDB.open('am-rzut', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('dane');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => zle(r.error);
  });
}
async function operacja<T>(tryb: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const d = await baza();
  return new Promise((ok, zle) => {
    const t = d.transaction('dane', tryb);
    const r = f(t.objectStore('dane'));
    t.oncomplete = () => { ok((r as IDBRequest | undefined)?.result as T); d.close(); };
    t.onerror = () => zle(t.error);
  });
}
const czytaj = <T>(k: string) => operacja<T>('readonly', (s) => s.get(k));
const zapisz = (k: string, v: unknown) => operacja<void>('readwrite', (s) => { s.put(v, k); });
const usun = (k: string) => operacja<void>('readwrite', (s) => { s.delete(k); });

export function amOid(): string | null {
  if (typeof location === 'undefined') return null;
  const v = new URL(location.href).searchParams.get('am');
  return v && /^[A-Za-z0-9_-]{6,40}$/.test(v) ? v : null;
}
export const adresOferty = (oid: string, ekran = 'zdjecia') => new URL(`../#/o/${oid}/${ekran}`, location.href).href;

/** Otwiera plan oferty: z wejścia od aplikacji, inaczej ostatnią wersję z tego urządzenia, inaczej pusty. */
export async function amOtworz(): Promise<boolean> {
  const oid = amOid();
  if (!oid) return false;
  const id = `am-${oid}`;
  const w = await czytaj<{ plan?: string; nazwa?: string } | undefined>(`wejscie:${oid}`).catch(() => undefined);
  let p;
  if (w?.plan) p = readProject(JSON.parse(w.plan));
  else p = (await lokalnyPlan(oid)) ?? createDefaultProject(w?.nazwa || 'Rzut');
  // zarejestruj bieżącą wersję projektu oferty w tym oknie — inaczej zapis planu wczytanego z serwera
  // albo z innego projektu edytor uznaje za konflikt („zmienił się w innej karcie”)
  await localStore.load(id).catch(() => null);
  p.id = id;
  if (w?.nazwa) p.name = w.nazwa;
  const PL: Record<string, string> = { 'Ground Floor': 'Parter', Basement: 'Piwnica' };
  for (const f of p.floors) f.name = PL[f.name] ?? f.name.replace(/^Floor (\d+)$/, 'Piętro $1').replace(/^Basement (\d+)$/, 'Piwnica $1');
  loadProject(p);
  await autoSave();
  if (w) await usun(`wejscie:${oid}`);
  return true;
}

/** Plan tej oferty zapisany na tym urządzeniu: ostatnio zapisany do oferty, inaczej najnowszy projekt w edytorze. */
async function lokalnyPlan(oid: string) {
  const ids: string[] = [];
  try { const z = localStorage.getItem(`am-projekt:${oid}`); if (z) ids.push(z); } catch { /* */ }
  ids.push(`am-${oid}`);
  for (const id of ids) { const p = await localStore.load(id).catch(() => null); if (p && p.floors?.some((f) => f.walls?.length)) return p; }
  // np. skan wczytany jako nowy projekt, zanim powstało powiązanie z ofertą — bierzemy najnowszy niepusty
  const lista = (await localStore.list().catch(() => [])).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  for (const m of lista.slice(0, 5)) { const p = await localStore.load(m.id).catch(() => null); if (p && p.floors?.some((f) => f.walls?.length)) return p; }
  return null;
}

export type Pokoj = { nazwa: string; m: number | null; kond: string };
export function pokojeZPlanu(p = get(currentProject)): Pokoj[] {
  const L: Pokoj[] = [];
  if (!p) return L;
  for (const floor of p.floors) {
    const g = resolveRoomGeometry(floor, floor.rooms ?? []);
    const h = roomHoles(g.map((x) => x.polygon));
    g.forEach((x, i) => {
      if (x.room.floorOpening) return;
      const a = interiorRoomArea(x.polygon, h[i], floor.walls); // metraż wewnętrzny (bez ścian), nie po osiach
      L.push({ nazwa: (x.room.name || '').trim(), m: a == null ? null : Math.round(a * 100) / 100, kond: p.floors.length > 1 ? floor.name : '' });
    });
  }
  return L;
}

/** Przekazuje plan z powrotem do edytora Rzut AM (plan.html) — tam powstaje obraz do ogłoszenia i zapis w ofercie. */
export const adresRzutu = (oid: string) => new URL(`../plan.html?am=${encodeURIComponent(oid)}`, location.href).href;
export async function amZapisz(): Promise<void> {
  const oid = amOid();
  const p = get(currentProject);
  if (!oid || !p) throw new Error('Brak otwartego planu.');
  await autoSave().catch(() => {});
  try { localStorage.setItem(`am-projekt:${oid}`, p.id); } catch { /* */ }
  await zapisz(`wejscie:${oid}`, { plan: JSON.stringify(p), z3d: true, t: Date.now() });
  location.href = adresRzutu(oid);
}
