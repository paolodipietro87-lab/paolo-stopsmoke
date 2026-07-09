import { describe, expect, test } from 'vitest';
import { minutiUtili } from './nightWindow';

const notte = { inizioOra: 0, fineOra: 7 };
const d = (s: string) => new Date(s).getTime();

describe('minutiUtili', () => {
  test('intervallo interamente diurno conta tutti i minuti', () => {
    expect(minutiUtili(d('2026-07-09T10:00'), d('2026-07-09T12:30'), notte)).toBe(150);
  });

  test('intervallo interamente notturno non conta nulla', () => {
    expect(minutiUtili(d('2026-07-09T01:00'), d('2026-07-09T05:00'), notte)).toBe(0);
  });

  test('scavalca la notte contando solo la parte diurna', () => {
    // 23:00 -> 09:00 : 60 min prima di mezzanotte + 120 min dopo le 07:00
    expect(minutiUtili(d('2026-07-08T23:00'), d('2026-07-09T09:00'), notte)).toBe(180);
  });

  test('scavalca piu notti', () => {
    // 09-07 08:00 -> 11-07 08:00 : 48h meno due finestre da 7h = 2880 - 840
    expect(minutiUtili(d('2026-07-09T08:00'), d('2026-07-11T08:00'), notte)).toBe(2040);
  });

  test('inizio dentro la notte parte dalle 07:00', () => {
    expect(minutiUtili(d('2026-07-09T03:00'), d('2026-07-09T08:00'), notte)).toBe(60);
  });

  test('fine dentro la notte si ferma a mezzanotte', () => {
    expect(minutiUtili(d('2026-07-08T23:30'), d('2026-07-09T02:00'), notte)).toBe(30);
  });

  test('to precedente a from da zero', () => {
    expect(minutiUtili(d('2026-07-09T12:00'), d('2026-07-09T10:00'), notte)).toBe(0);
  });

  test('finestra notturna configurabile', () => {
    const custom = { inizioOra: 1, fineOra: 6 };
    // 00:00 -> 08:00 : 60 min (00-01) + 120 min (06-08) = 180
    expect(minutiUtili(d('2026-07-09T00:00'), d('2026-07-09T08:00'), custom)).toBe(180);
  });
});
