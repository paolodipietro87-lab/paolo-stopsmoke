import { db, type Acquisto, type Multa, type PausaRecord, type Profilo, type Sigaretta } from './db';

export const VERSIONE_BACKUP = 1;

export interface Backup {
  versione: number;
  esportatoIl: number;
  profile: Profilo[];
  smokes: Sigaretta[];
  purchases: Acquisto[];
  penalties: Multa[];
  pauses: PausaRecord[];
}

/** Dump completo: e lo stesso file che finisce su Drive (appDataFolder). */
export async function esportaJson(): Promise<string> {
  const [profile, smokes, purchases, penalties, pauses] = await Promise.all([
    db.profile.toArray(),
    db.smokes.toArray(),
    db.purchases.toArray(),
    db.penalties.toArray(),
    db.pauses.toArray(),
  ]);

  const backup: Backup = {
    versione: VERSIONE_BACKUP,
    esportatoIl: Date.now(),
    profile,
    smokes,
    purchases,
    penalties,
    pauses,
  };
  return JSON.stringify(backup);
}

/** Ripristino: i dati locali vengono sostituiti, non fusi. */
export async function importaJson(testo: string): Promise<void> {
  let dump: Partial<Backup>;
  try {
    dump = JSON.parse(testo);
  } catch {
    throw new Error('Backup non valido: non e un file JSON.');
  }

  if (typeof dump?.versione !== 'number') throw new Error('Backup non valido: manca la versione.');
  if (dump.versione > VERSIONE_BACKUP) {
    throw new Error(`Versione ${dump.versione} non supportata: aggiorna l'app.`);
  }

  await db.transaction('rw', db.profile, db.smokes, db.purchases, db.penalties, db.pauses, async () => {
    await Promise.all([db.profile.clear(), db.smokes.clear(), db.purchases.clear(), db.penalties.clear(), db.pauses.clear()]);
    await Promise.all([
      db.profile.bulkAdd(dump.profile ?? []),
      db.smokes.bulkAdd(dump.smokes ?? []),
      db.purchases.bulkAdd(dump.purchases ?? []),
      db.penalties.bulkAdd(dump.penalties ?? []),
      db.pauses.bulkAdd(dump.pauses ?? []),
    ]);
  });
}
