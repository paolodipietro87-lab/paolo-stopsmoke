// Genera le icone PWA senza dipendenze: anello ambra su fondo ardesia, come l'app.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const FONDO = [14, 17, 22];
const AMBRA = [217, 164, 65];

function crc32(buf) {
  let c, tavola = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tavola[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = tavola[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dati) {
  const lung = Buffer.alloc(4);
  lung.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([lung, corpo, crc]);
}

function png(lato, maskable) {
  const righe = [];
  const centro = lato / 2;
  const raggio = lato * (maskable ? 0.3 : 0.38);
  const spessore = lato * 0.075;

  for (let y = 0; y < lato; y++) {
    const riga = Buffer.alloc(1 + lato * 3);
    for (let x = 0; x < lato; x++) {
      const dist = Math.hypot(x + 0.5 - centro, y + 0.5 - centro);
      // Anello aperto in alto: il countdown "in corsa".
      const angolo = Math.atan2(y + 0.5 - centro, x + 0.5 - centro);
      const nelloSpessore = Math.abs(dist - raggio) < spessore / 2;
      const gapAlto = angolo < -Math.PI / 3 && angolo > (-Math.PI * 2) / 3;
      const [r, g, b] = nelloSpessore && !gapAlto ? AMBRA : FONDO;
      riga.writeUInt8(r, 1 + x * 3);
      riga.writeUInt8(g, 2 + x * 3);
      riga.writeUInt8(b, 3 + x * 3);
    }
    righe.push(riga);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // truecolor

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(righe))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icona-192.png', png(192, false));
writeFileSync('public/icona-512.png', png(512, false));
writeFileSync('public/icona-maskable-512.png', png(512, true));
console.log('Icone generate in public/');
