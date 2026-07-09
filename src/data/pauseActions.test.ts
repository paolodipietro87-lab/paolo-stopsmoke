import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { db } from './db';
import { giorniInPausa, iniziaPausa, pausaAttiva, terminaPausa } from './pauseActions';

const GIORNO = 1440 * 60_000;
const d = (s: string) => new Date(s).getTime();

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('iniziaPausa', () => {
  test('crea una pausa aperta', async () => {
    await iniziaPausa(d('2026-07-09T10:00'));
    const p = await pausaAttiva(d('2026-07-10T10:00'));
    expect(p?.dataInizio).toBe(d('2026-07-09T10:00'));
    expect(p?.dataFine).toBeUndefined();
  });

  test('non si possono avere due pause attive insieme', async () => {
    await iniziaPausa(d('2026-07-09T10:00'));
    await expect(iniziaPausa(d('2026-07-10T10:00'))).rejects.toThrow(/gia in pausa/i);
  });

  test('dopo 7 giorni la pausa non e piu attiva e se ne puo aprire un altra', async () => {
    const inizio = d('2026-07-01T10:00');
    await iniziaPausa(inizio);
    expect(await pausaAttiva(inizio + 8 * GIORNO)).toBeNull();
    await expect(iniziaPausa(inizio + 8 * GIORNO)).resolves.toBeTypeOf('number');
  });
});

describe('terminaPausa', () => {
  test('chiude la pausa attiva', async () => {
    await iniziaPausa(d('2026-07-09T10:00'));
    await terminaPausa(d('2026-07-10T10:00'));
    expect(await pausaAttiva(d('2026-07-10T11:00'))).toBeNull();
  });
});

describe('giorniInPausa', () => {
  test('conta i giorni da quando la pausa e iniziata', async () => {
    const inizio = d('2026-07-09T10:00');
    await iniziaPausa(inizio);
    expect(await giorniInPausa(inizio + 3 * GIORNO)).toBe(3);
  });

  test('zero se non c e nessuna pausa', async () => {
    expect(await giorniInPausa(Date.now())).toBe(0);
  });
});
