import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test } from 'vitest';
import { VERSIONE_BACKUP, esportaJson, importaJson } from './backup';
import { db, registraSigaretta, salvaProfilo } from './db';

const profilo = {
  nome: 'Paolo',
  dataInizio: 1000,
  sigaretteAlGiornoIniziali: 20,
  prezzoPacchetto: 5.5,
  incrementoGiornalieroMin: 10,
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('esportaJson', () => {
  test('contiene versione e tutte le tabelle', async () => {
    await salvaProfilo(profilo);
    await registraSigaretta(2000);
    const dump = JSON.parse(await esportaJson());
    expect(dump.versione).toBe(VERSIONE_BACKUP);
    expect(dump.profile[0].nome).toBe('Paolo');
    expect(dump.smokes).toHaveLength(1);
    expect(dump.purchases).toEqual([]);
  });
});

describe('importaJson', () => {
  test('sostituisce i dati locali col backup', async () => {
    await salvaProfilo(profilo);
    await registraSigaretta(2000);
    const dump = await esportaJson();

    await db.smokes.clear();
    await importaJson(dump);

    expect(await db.smokes.count()).toBe(1);
    expect((await db.profile.toArray())[0].nome).toBe('Paolo');
  });

  test('non lascia dati vecchi in giro', async () => {
    await salvaProfilo(profilo);
    const dump = await esportaJson();
    await registraSigaretta(9999);

    await importaJson(dump);
    expect(await db.smokes.count()).toBe(0);
  });

  test('rifiuta un JSON senza versione', async () => {
    await expect(importaJson('{"smokes":[]}')).rejects.toThrow(/backup non valido/i);
  });

  test('rifiuta una versione futura', async () => {
    await expect(importaJson(JSON.stringify({ versione: 99 }))).rejects.toThrow(/versione/i);
  });

  test('rifiuta testo non JSON', async () => {
    await expect(importaJson('non sono json')).rejects.toThrow(/backup non valido/i);
  });
});
