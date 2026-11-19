// AM Oferty — sejf na urządzeniu: wszystko, co aplikacja trzyma w telefonie (oferty, klienci, kolejka zmian,
// zdjęcia dokumentów, token logowania), jest zaszyfrowane kluczem danych (AES-GCM 256).
// Klucz danych jest zawinięty kluczem z PIN-u (PBKDF2-SHA256, 310 000 przebiegów) — bez PIN-u nic nie da się odczytać.
// Po odblokowaniu klucz żyje w pamięci i w sessionStorage tej karty (powrót z edytora rzutu bez ponownego PIN-u),
// najdłużej 10 minut od ostatniej aktywności.
const enc = new TextEncoder(), dec = new TextDecoder();
export const BEZCZYNNOSC = 10 * 60e3;
export const MAKS_PROB = 5;
const SESJA = 'am-sejf', SESJA_T = 'am-sejf-t';
let klucz = null;

export const otwarty = () => !!klucz;
const b64 = (u8) => btoa(String.fromCharCode(...new Uint8Array(u8)));
const zB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function kluczZPinu(pin, sol) {
  const baza = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sol, iterations: 310000, hash: 'SHA-256' }, baza, { name: 'AES-KW', length: 256 }, false, ['wrapKey', 'unwrapKey']);
}
async function uzyj(raw) {
  klucz = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  try { sessionStorage.setItem(SESJA, b64(raw)); aktywnosc(); } catch { /* prywatny tryb — tylko pamięć */ }
}
// nowy sejf: zwraca zapis do meta (sól + zawinięty klucz) — bez PIN-u i bez klucza w jawnej postaci
export async function utworz(pin) {
  const dk = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const sol = crypto.getRandomValues(new Uint8Array(16));
  const zaw = new Uint8Array(await crypto.subtle.wrapKey('raw', dk, await kluczZPinu(pin, sol), 'AES-KW'));
  await uzyj(await crypto.subtle.exportKey('raw', dk));
  return { wer: 1, sol, zaw };
}
// zmiana PIN-u: ten sam klucz danych, nowe opakowanie
export async function przepakuj(staryPin, nowyPin, zapis) {
  const dk = await crypto.subtle.unwrapKey('raw', zapis.zaw, await kluczZPinu(staryPin, zapis.sol), 'AES-KW', { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  const sol = crypto.getRandomValues(new Uint8Array(16));
  const zaw = new Uint8Array(await crypto.subtle.wrapKey('raw', dk, await kluczZPinu(nowyPin, sol), 'AES-KW'));
  return { wer: 1, sol, zaw };
}
// otwarcie PIN-em; zły PIN = wyjątek (AES-KW sprawdza integralność)
export async function otworz(pin, zapis) {
  const dk = await crypto.subtle.unwrapKey('raw', zapis.zaw, await kluczZPinu(pin, zapis.sol), 'AES-KW', { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  await uzyj(await crypto.subtle.exportKey('raw', dk));
}
// otwarcie bez PIN-u: ta sama karta, nie dłużej niż 10 min od ostatniej aktywności
export async function zSesji() {
  try {
    const s = sessionStorage.getItem(SESJA), t = Number(sessionStorage.getItem(SESJA_T) || 0);
    if (!s || Date.now() - t > BEZCZYNNOSC) { zamknij(); return false; }
    await uzyj(zB64(s)); return true;
  } catch { return false; }
}
export function aktywnosc() { try { if (sessionStorage.getItem(SESJA)) sessionStorage.setItem(SESJA_T, String(Date.now())); } catch { /* */ } }
export function ostatniaAktywnosc() { try { return Number(sessionStorage.getItem(SESJA_T) || 0); } catch { return 0; } }
export function zamknij() { klucz = null; try { sessionStorage.removeItem(SESJA); sessionStorage.removeItem(SESJA_T); } catch { /* */ } }

// szyfrowanie wartości: obiekty jako JSON, pliki (Blob) jako bajty z typem
export async function szyfruj(v) {
  if (!klucz) throw new Error('Sejf zamknięty.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  let dane, typ;
  if (v instanceof Blob) { dane = await v.arrayBuffer(); typ = `b:${v.type || ''}`; } else { dane = enc.encode(JSON.stringify(v === undefined ? null : v)); typ = 'j'; }
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, klucz, dane);
  return { s1: 1, iv, c, typ };
}
export const zaszyfrowane = (z) => !!(z && typeof z === 'object' && z.s1 === 1 && z.c);
export async function odszyfruj(z) {
  if (!zaszyfrowane(z)) return z; // zapis sprzed sejfu (jawny)
  if (!klucz) throw new Error('Sejf zamknięty.');
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: z.iv }, klucz, z.c);
  return z.typ === 'j' ? JSON.parse(dec.decode(p)) : new Blob([p], { type: z.typ.slice(2) });
}
