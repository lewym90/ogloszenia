// Liczenie „Obróbki AI” (hybryda) i „Obróbki AM” (własny model) poza głównym wątkiem — okno nie zamarza przy pełnym zdjęciu.
import * as HY from './hybryda.js';
import * as AM from './obrobkaAM.js';
import * as SN from './obrobkaSiec.js';

let org = null, podglad = null, nauka = null;
let wagi = null, am = null; // am: { org, przyg, orgP, preP }
async function zaladujWagi() {
  if (!wagi) {
    const [j, b] = await Promise.all([
      fetch(new URL('../modele/am1.json', import.meta.url)).then((r) => { if (!r.ok) throw new Error('Brak modelu — połącz się raz z internetem.'); return r.json(); }),
      fetch(new URL('../modele/am1.bin', import.meta.url)).then((r) => { if (!r.ok) throw new Error('Brak modelu — połącz się raz z internetem.'); return r.arrayBuffer(); }),
    ]);
    wagi = SN.wczytajWagi(j, b);
  }
  return wagi;
}
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.typ === 'przygotuj') {
      org = m.org; nauka = HY.przygotuj(org, m.ai);
      podglad = HY.zmniejsz(org, m.bokPodgladu || 1000);
      const p = HY.naloz(podglad, nauka, m.ust);
      self.postMessage({ typ: 'gotowe', zgodnosc: nauka.zgodnosc, pokrycie: nauka.pokrycie, org: podglad, wynik: p });
    } else if (m.typ === 'podglad') {
      const p = HY.naloz(podglad, nauka, m.ust);
      self.postMessage({ typ: 'podglad', nr: m.nr, wynik: p }, [p.data.buffer]);
    } else if (m.typ === 'pelne') {
      const p = HY.naloz(org, nauka, m.ust);
      self.postMessage({ typ: 'pelne', wynik: p }, [p.data.buffer]);
    } else if (m.typ === 'am-przygotuj') {
      const przyg = AM.przygotujAM(await zaladujWagi(), m.org), bok = m.bokPodgladu || 1000;
      am = { org: m.org, przyg, orgP: HY.zmniejsz(m.org, bok), preP: HY.zmniejsz(przyg.pre, bok) };
      self.postMessage({ typ: 'am-gotowe', org: am.orgP, wynik: AM.nalozAM(am.orgP, am.preP, przyg, m.ust) });
    } else if (m.typ === 'am-podglad') {
      const p = AM.nalozAM(am.orgP, am.preP, am.przyg, m.ust);
      self.postMessage({ typ: 'am-podglad', wynik: p }, [p.data.buffer]);
    } else if (m.typ === 'am-pelne') {
      const p = AM.nalozAM(am.org, am.przyg.pre, am.przyg, m.ust);
      self.postMessage({ typ: 'am-pelne', wynik: p }, [p.data.buffer]);
    } else if (m.typ === 'am-auto') { // od razu pełne zdjęcie z ustawieniami domyślnymi (obróbka wszystkich)
      const przyg = AM.przygotujAM(await zaladujWagi(), m.org);
      const p = AM.nalozAM(m.org, przyg.pre, przyg, m.ust || {});
      self.postMessage({ typ: 'am-auto', wynik: p }, [p.data.buffer]);
    }
  } catch (er) { self.postMessage({ typ: 'blad', blad: er.message || String(er) }); }
};
