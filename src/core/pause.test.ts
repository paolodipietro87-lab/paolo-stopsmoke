import { describe, expect, test } from 'vitest';
import { DURATA_MAX_PAUSA_GG, fineEffettivaPausa, giorniCongelatiDaPause } from './pause';

const d = (s: string) => new Date(s).getTime();
const inizioPiano = d('2026-07-09T00:00');

describe('fineEffettivaPausa', () => {
  test('una pausa senza fine dura al massimo 7 giorni', () => {
    const fine = fineEffettivaPausa({ dataInizio: d('2026-07-09T10:00') });
    expect(fine).toBe(d('2026-07-16T10:00'));
    expect(DURATA_MAX_PAUSA_GG).toBe(7);
  });

  test('una pausa chiusa prima mantiene la sua fine', () => {
    const p = { dataInizio: d('2026-07-09T10:00'), dataFine: d('2026-07-11T10:00') };
    expect(fineEffettivaPausa(p)).toBe(d('2026-07-11T10:00'));
  });

  test('una pausa chiusa oltre i 7 giorni viene troncata', () => {
    const p = { dataInizio: d('2026-07-09T10:00'), dataFine: d('2026-07-30T10:00') };
    expect(fineEffettivaPausa(p)).toBe(d('2026-07-16T10:00'));
  });
});

describe('giorniCongelatiDaPause', () => {
  test('nessuna pausa, nessun giorno congelato', () => {
    expect(giorniCongelatiDaPause([], inizioPiano, 5)).toEqual([]);
  });

  test('i giorni coperti dalla pausa non fanno crescere l intervallo', () => {
    const pause = [{ dataInizio: d('2026-07-10T10:00'), dataFine: d('2026-07-12T09:00') }];
    // giorni di piano 1, 2 e 3 sono toccati dalla pausa: la progressione resta ferma
    expect(giorniCongelatiDaPause(pause, inizioPiano, 5)).toEqual([1, 2, 3]);
  });

  test('la pausa aperta congela fino al settimo giorno e poi riparte', () => {
    const pause = [{ dataInizio: d('2026-07-09T10:00') }];
    expect(giorniCongelatiDaPause(pause, inizioPiano, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  test('non congela oltre l orizzonte richiesto', () => {
    const pause = [{ dataInizio: d('2026-07-09T10:00') }];
    expect(giorniCongelatiDaPause(pause, inizioPiano, 2)).toEqual([0, 1, 2]);
  });
});
