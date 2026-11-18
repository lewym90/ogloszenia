// Minimalny ZIP (bez kompresji — JPG i tak jest skompresowany). Pliki do 4 GB łącznie.
const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export async function zrobZip(pliki) {
  const enc = new TextEncoder();
  const czesci = [], centralne = [];
  let offset = 0;
  const d = new Date();
  const czas = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const { nazwa, blob } of pliki) {
    const dane = new Uint8Array(await blob.arrayBuffer());
    const n = enc.encode(nazwa);
    const crc = crc32(dane);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, czas, true); lh.setUint16(12, data, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, dane.length, true); lh.setUint32(22, dane.length, true); lh.setUint16(26, n.length, true); lh.setUint16(28, 0, true);
    czesci.push(lh.buffer, n, dane);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, czas, true); ch.setUint16(14, data, true); ch.setUint32(16, crc, true); ch.setUint32(20, dane.length, true); ch.setUint32(24, dane.length, true);
    ch.setUint16(28, n.length, true); ch.setUint32(42, offset, true);
    centralne.push(ch.buffer, n);
    offset += 30 + n.length + dane.length;
  }
  const rozmiarC = centralne.reduce((s, c) => s + (c.byteLength ?? c.length), 0);
  const kon = new DataView(new ArrayBuffer(22));
  kon.setUint32(0, 0x06054b50, true); kon.setUint16(8, pliki.length, true); kon.setUint16(10, pliki.length, true);
  kon.setUint32(12, rozmiarC, true); kon.setUint32(16, offset, true);
  return new Blob([...czesci, ...centralne, kon.buffer], { type: 'application/zip' });
}
