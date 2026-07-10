import { describe, expect, test } from 'vitest';
import { FRASI_SOS, fraseSos, scenarioSos, type StatoSos } from './sos';

export const BASE: StatoSos = {
  mantenimento: false,
  secondiMancanti: 3600,
  puoiFumare: false,
  sgarriOggi: 0,
  multeDaVersareEuro: 0,
  streak: 0,
  oreSmokeFree: 5,
  risparmioEuro: 12.5,
};

describe('scenarioSos', () => {
  test('mantenimento vince su tutto', () => {
    expect(scenarioSos({ ...BASE, mantenimento: true, sgarriOggi: 3, secondiMancanti: 60 })).toBe('mantenimento');
  });

  test('quasi quando mancano 10 minuti o meno', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 600 })).toBe('quasi');
    expect(scenarioSos({ ...BASE, secondiMancanti: 601 })).toBe('incoraggiamento');
  });

  test('quasi batte rimprovero: a nove minuti serve aspettare, non essere processati', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 540, sgarriOggi: 2 })).toBe('quasi');
  });

  test('a timer scaduto non e piu quasi: non c e nulla da aspettare', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 0, puoiFumare: true })).toBe('incoraggiamento');
  });

  test('rimprovero con almeno uno sgarro oggi', () => {
    expect(scenarioSos({ ...BASE, sgarriOggi: 1, multeDaVersareEuro: 5, streak: 9 })).toBe('rimprovero');
  });

  test('contabile con multe in sospeso e nessuno sgarro oggi', () => {
    expect(scenarioSos({ ...BASE, multeDaVersareEuro: 4.4, streak: 9 })).toBe('contabile');
  });

  test('orgoglio con streak di almeno 3 giorni', () => {
    expect(scenarioSos({ ...BASE, streak: 3 })).toBe('orgoglio');
    expect(scenarioSos({ ...BASE, streak: 2 })).toBe('incoraggiamento');
  });

  test('incoraggiamento come fallback', () => {
    expect(scenarioSos(BASE)).toBe('incoraggiamento');
  });
});

describe('FRASI_SOS', () => {
  const scenari = [
    'mantenimento',
    'quasi',
    'rimprovero',
    'contabile',
    'orgoglio',
    'incoraggiamento',
  ] as const;

  test('ogni scenario ha 25 frasi', () => {
    for (const s of scenari) expect(FRASI_SOS[s]).toHaveLength(25);
  });

  test('nessuna frase duplicata dentro uno scenario', () => {
    for (const s of scenari) expect(new Set(FRASI_SOS[s]).size).toBe(25);
  });

  test('nessuna lettera accentata, come nel resto dei messaggi', () => {
    for (const s of scenari) {
      for (const f of FRASI_SOS[s]) expect(f).not.toMatch(/[àèéìòù]/);
    }
  });
});

describe('fraseSos', () => {
  test('e deterministica sul seed', () => {
    expect(fraseSos(BASE, 7)).toBe(fraseSos(BASE, 7));
  });

  test('seed diversi pescano frasi diverse', () => {
    const frasi = new Set([0, 1, 2, 3, 4].map((i) => fraseSos(BASE, i)));
    expect(frasi.size).toBeGreaterThan(1);
  });

  test('pesca dallo scenario giusto', () => {
    const f = fraseSos({ ...BASE, sgarriOggi: 1 }, 0);
    expect(FRASI_SOS.rimprovero).toContain(f);
  });

  test('risolve ogni segnaposto: nessuna graffa sopravvive', () => {
    const stati: StatoSos[] = [
      { ...BASE, mantenimento: true },
      { ...BASE, secondiMancanti: 540 },
      { ...BASE, sgarriOggi: 2 },
      { ...BASE, multeDaVersareEuro: 4.4 },
      { ...BASE, streak: 5 },
      BASE,
    ];
    for (const s of stati) {
      for (let seed = 0; seed < 25; seed++) {
        expect(fraseSos(s, seed)).not.toMatch(/[{}]/);
      }
    }
  });

  test('i numeri finiscono davvero nella frase', () => {
    const f = fraseSos({ ...BASE, secondiMancanti: 540 }, 0);
    // 540 s arrotondati per eccesso: 9 minuti.
    expect(FRASI_SOS.quasi[0].replace('{minuti}', '9')).toBe(f);
  });
});
