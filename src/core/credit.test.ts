import { describe, expect, test } from 'vitest';
import { creditAt } from './credit';
import { FINESTRA_DEFAULT } from './nightWindow';

const d = (s: string) => new Date(s).getTime();
const opt = { intervalloMin: 60, notte: FINESTRA_DEFAULT };

describe('creditAt', () => {
  test('nessun credito prima che passi il primo intervallo', () => {
    expect(creditAt(d('2026-07-09T10:00'), d('2026-07-09T10:59'), opt)).toBe(0);
  });

  test('il primo intervallo pieno non matura credito (e solo il countdown)', () => {
    expect(creditAt(d('2026-07-09T10:00'), d('2026-07-09T11:00'), opt)).toBe(0);
  });

  test('due intervalli pieni maturano 1 credito', () => {
    expect(creditAt(d('2026-07-09T10:00'), d('2026-07-09T12:00'), opt)).toBe(1);
  });

  test('tre intervalli pieni maturano 2 crediti', () => {
    expect(creditAt(d('2026-07-09T10:00'), d('2026-07-09T13:00'), opt)).toBe(2);
  });

  test('il credito e limitato a 2', () => {
    expect(creditAt(d('2026-07-09T10:00'), d('2026-07-09T20:00'), opt)).toBe(2);
  });

  test('la finestra notturna non matura credito', () => {
    // 23:00 -> 06:00 : solo 60 minuti utili = primo intervallo, nessun credito
    expect(creditAt(d('2026-07-08T23:00'), d('2026-07-09T06:00'), opt)).toBe(0);
  });

  test('taglio di mezzanotte: al risveglio al massimo 1 credito', () => {
    // 12:00 -> 23:59 stesso giorno: 2 crediti pieni
    expect(creditAt(d('2026-07-08T12:00'), d('2026-07-08T23:59'), opt)).toBe(2);
    // superata la mezzanotte il credito e tagliato a 1
    expect(creditAt(d('2026-07-08T12:00'), d('2026-07-09T00:30'), opt)).toBe(1);
  });

  test('dopo il taglio il credito puo tornare a 2 nel corso del giorno', () => {
    // dalle 07:00 riprende la maturazione: alle 09:00 due ore utili in piu
    expect(creditAt(d('2026-07-08T12:00'), d('2026-07-09T09:00'), opt)).toBe(2);
  });

  test('piu mezzanotti attraversate restano capped a 1 al mattino', () => {
    expect(creditAt(d('2026-07-06T12:00'), d('2026-07-09T07:30'), opt)).toBe(1);
  });

  test('ora precedente all ultima sigaretta da zero', () => {
    expect(creditAt(d('2026-07-09T12:00'), d('2026-07-09T11:00'), opt)).toBe(0);
  });
});
