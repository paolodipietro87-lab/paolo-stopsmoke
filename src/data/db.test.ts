import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { db, salvaProfilo, leggiProfilo, registraSigaretta, annullaSigaretta, sigaretteOrdinate, registraAcquisto, scortaCorrente, creaMulta, multeDaVersare, segnaMulteVersate } from './db';

const profiloBase = {
  nome: 'Paolo',
  dataInizio: new Date('2026-07-09T00:00').getTime(),
  sigaretteAlGiornoIniziali: 20,
  prezzoPacchetto: 5.5,
  incrementoGiornalieroMin: 10,
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('profilo', () => {
  test('salva e rilegge il profilo', async () => {
    await salvaProfilo(profiloBase);
    const p = await leggiProfilo();
    expect(p?.nome).toBe('Paolo');
    expect(p?.prezzoPacchetto).toBe(5.5);
  });

  test('senza onboarding il profilo e null, non undefined', async () => {
    expect(await leggiProfilo()).toBeNull();
  });
});

describe('sigarette', () => {
  test('registra e rilegge in ordine cronologico', async () => {
    await registraSigaretta(3000);
    await registraSigaretta(1000);
    expect((await sigaretteOrdinate()).map((s) => s.timestamp)).toEqual([1000, 3000]);
  });

  test('annulla rimuove la sigaretta (undo 10s)', async () => {
    const id = await registraSigaretta(1000);
    await annullaSigaretta(id);
    expect(await sigaretteOrdinate()).toEqual([]);
  });
});

describe('scorta', () => {
  test('scorta = pacchetti x 20 meno sigarette fumate', async () => {
    await registraAcquisto({ timestamp: 1000, numeroPacchetti: 2, prezzoTotale: 11 });
    await registraSigaretta(2000);
    await registraSigaretta(3000);
    expect(await scortaCorrente()).toBe(38);
  });

  test('la scorta non va sotto zero', async () => {
    await registraSigaretta(2000);
    expect(await scortaCorrente()).toBe(0);
  });
});

describe('multe', () => {
  test('una multa nasce da_versare e finisce nel totale da versare', async () => {
    await creaMulta({ timestamp: 1000, importo: 0.55, motivo: 'sgarro' });
    await creaMulta({ timestamp: 2000, importo: 0.55, motivo: 'sgarro' });
    const da = await multeDaVersare();
    expect(da).toHaveLength(2);
    expect(da[0].stato).toBe('da_versare');
  });

  test('segnaMulteVersate marca tutte le pendenti con la data', async () => {
    await creaMulta({ timestamp: 1000, importo: 0.55, motivo: 'sgarro' });
    await segnaMulteVersate(9999);
    expect(await multeDaVersare()).toEqual([]);
    const tutte = await db.penalties.toArray();
    expect(tutte[0].stato).toBe('versata');
    expect(tutte[0].dataVersamento).toBe(9999);
  });
});
