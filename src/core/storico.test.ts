import { describe, expect, test } from 'vitest';
import type { SigarettaValutata } from './engine';
import {
  chiaveGiorno,
  etichettaGiorno,
  giornoPrecedente,
  giornoSuccessivo,
  inizioGiornoLocale,
  sigaretteDelGiorno,
} from './storico';

function sig(iso: string, extra: Partial<SigarettaValutata> = {}): SigarettaValutata {
  return {
    timestamp: new Date(iso).getTime(),
    giorno: 0,
    sgarro: false,
    usaCredito: false,
    minutiAnticipo: 0,
    multa: 0,
    ...extra,
  };
}

describe('chiaveGiorno', () => {
  test('usa il fuso locale, non UTC', () => {
    expect(chiaveGiorno(new Date('2026-07-10T23:59:00').getTime())).toBe('2026-07-10');
    expect(chiaveGiorno(new Date('2026-07-11T00:01:00').getTime())).toBe('2026-07-11');
  });
});

describe('inizioGiornoLocale', () => {
  test('e la mezzanotte locale del giorno di t', () => {
    const t = new Date('2026-07-10T15:30:00').getTime();
    const atteso = new Date('2026-07-10T00:00:00').getTime();
    expect(inizioGiornoLocale(t)).toBe(atteso);
  });
});

describe('navigazione', () => {
  test('giorno precedente e successivo', () => {
    expect(giornoPrecedente('2026-07-01')).toBe('2026-06-30');
    expect(giornoSuccessivo('2026-12-31')).toBe('2027-01-01');
  });

  test('attraversa il cambio di ora legale senza saltare giorni', () => {
    // In Italia l'ora legale finisce il 25/10/2026: quel giorno dura 25 ore.
    expect(giornoPrecedente('2026-10-26')).toBe('2026-10-25');
    expect(giornoSuccessivo('2026-10-25')).toBe('2026-10-26');
  });
});

describe('sigaretteDelGiorno', () => {
  const elenco = [
    sig('2026-07-09T22:00:00'),
    sig('2026-07-10T08:00:00'),
    sig('2026-07-10T11:00:00', { sgarro: true, minutiAnticipo: 22, multa: 0.55 }),
    sig('2026-07-10T14:00:00', { usaCredito: true }),
    sig('2026-07-11T09:00:00'),
  ];

  test('tiene solo le sigarette del giorno chiesto', () => {
    const r = sigaretteDelGiorno(elenco, '2026-07-10');
    expect(r.fumate).toBe(3);
    expect(r.sgarri).toBe(1);
    expect(r.crediti).toBe(1);
  });

  test('le ordina dalla piu recente', () => {
    const r = sigaretteDelGiorno(elenco, '2026-07-10');
    expect(r.sigarette.map((s) => new Date(s.timestamp).getHours())).toEqual([14, 11, 8]);
  });

  test('un giorno vuoto da un riepilogo a zero', () => {
    const r = sigaretteDelGiorno(elenco, '2026-07-12');
    expect(r).toEqual({ sigarette: [], fumate: 0, sgarri: 0, crediti: 0 });
  });

  test('una sigaretta a mezzanotte in punto appartiene al giorno che inizia', () => {
    const mezzanotte = [sig('2026-07-10T00:00:00')];
    expect(sigaretteDelGiorno(mezzanotte, '2026-07-10').fumate).toBe(1);
    expect(sigaretteDelGiorno(mezzanotte, '2026-07-09').fumate).toBe(0);
  });
});

describe('etichettaGiorno', () => {
  test('formato leggibile in italiano', () => {
    expect(etichettaGiorno('2026-07-10')).toBe('ven 10 luglio 2026');
  });
});
