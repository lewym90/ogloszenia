// Liczenie hybrydy „Obróbka AI” poza głównym wątkiem — okno nie zamarza przy pełnym zdjęciu.
import * as HY from './hybryda.js';

let org = null, podglad = null, nauka = null;
self.onmessage = (e) => {
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
    }
  } catch (er) { self.postMessage({ typ: 'blad', blad: er.message || String(er) }); }
};
