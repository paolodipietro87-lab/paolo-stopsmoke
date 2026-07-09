import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { FINESTRA_DEFAULT } from '../core/nightWindow';
import { annullaFumata, fuma } from './actions';
import { db } from './db';

const d = (s: string) => new Date(s).getTime();
const cfg = {
  intervalloBaseMin: 60,
  incrementoGiornalieroMin: 10,
  notte: FINESTRA_DEFAULT,
  multaPerSgarro: 0.55,
  inizioPiano: d('2026-07-09T00:00'),
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('fuma', () => {
  test('la prima sigaretta non genera multa', async () => {
    const r = await fuma(d('2026-07-09T08:00'), cfg);
    expect(r.valutazione.sgarro).toBe(false);
    expect(await db.penalties.count()).toBe(0);
  });

  test('una sigaretta anticipata crea una multa da versare', async () => {
    await fuma(d('2026-07-09T08:00'), cfg);
    const r = await fuma(d('2026-07-09T08:38'), cfg);
    expect(r.valutazione.sgarro).toBe(true);
    expect(r.valutazione.minutiAnticipo).toBe(22);
    const multe = await db.penalties.toArray();
    expect(multe).toHaveLength(1);
    expect(multe[0].importo).toBeCloseTo(0.55);
    expect(multe[0].stato).toBe('da_versare');
  });

  test('una sigaretta col credito non crea multa', async () => {
    await fuma(d('2026-07-09T08:00'), cfg);
    const r = await fuma(d('2026-07-09T10:00'), cfg);
    expect(r.valutazione.usaCredito).toBe(true);
    expect(await db.penalties.count()).toBe(0);
  });
});

describe('annullaFumata', () => {
  test('rimuove la sigaretta e la multa collegata', async () => {
    await fuma(d('2026-07-09T08:00'), cfg);
    const r = await fuma(d('2026-07-09T08:38'), cfg);
    await annullaFumata(r.id);
    expect(await db.smokes.count()).toBe(1);
    expect(await db.penalties.count()).toBe(0);
  });

  test('non tocca le multe di altre sigarette', async () => {
    await fuma(d('2026-07-09T08:00'), cfg);
    await fuma(d('2026-07-09T08:38'), cfg); // sgarro 1
    const r = await fuma(d('2026-07-09T09:00'), cfg); // sgarro 2
    await annullaFumata(r.id);
    expect(await db.penalties.count()).toBe(1);
  });

  test('annullare una sigaretta senza multa funziona', async () => {
    const r = await fuma(d('2026-07-09T08:00'), cfg);
    await annullaFumata(r.id);
    expect(await db.smokes.count()).toBe(0);
  });

  test('una multa gia versata sopravvive alla cancellazione della sigaretta', async () => {
    await fuma(d('2026-07-09T08:00'), cfg);
    const r = await fuma(d('2026-07-09T08:38'), cfg);
    const multa = (await db.penalties.toArray())[0];
    await db.penalties.update(multa.id!, {
      stato: 'versata',
      dataVersamento: d('2026-07-09T09:00'),
    });

    await annullaFumata(r.id);

    expect(await db.smokes.count()).toBe(1);
    const rimaste = await db.penalties.toArray();
    expect(rimaste).toHaveLength(1);
    expect(rimaste[0].stato).toBe('versata');
    expect(rimaste[0].importo).toBeCloseTo(0.55);
    // scollegata: la sigaretta non esiste piu, il denaro versato si
    expect(rimaste[0].sigarettaId).toBeUndefined();
    expect(rimaste[0].motivo).toContain('sigaretta cancellata');
  });
});
