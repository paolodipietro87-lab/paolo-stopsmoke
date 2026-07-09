import { fineEffettivaPausa } from '../core/pause';
import { db, type PausaRecord } from './db';

const GIORNO = 1440 * 60_000;

/** La pausa in corso a `ora`, o null. Allo scadere dei 7 giorni si spegne da sola. */
export async function pausaAttiva(ora: number): Promise<PausaRecord | null> {
  const pause = await db.pauses.toArray();
  return pause.find((p) => p.dataInizio <= ora && ora < fineEffettivaPausa(p)) ?? null;
}

/** Al massimo una pausa alla volta. */
export async function iniziaPausa(ora: number): Promise<number> {
  if (await pausaAttiva(ora)) throw new Error('Sei gia in pausa.');
  return (await db.pauses.add({ dataInizio: ora })) as number;
}

export async function terminaPausa(ora: number): Promise<void> {
  const attiva = await pausaAttiva(ora);
  if (!attiva?.id) return;
  await db.pauses.update(attiva.id, { dataFine: ora });
}

/** Giorni interi trascorsi dall'inizio della pausa in corso. */
export async function giorniInPausa(ora: number): Promise<number> {
  const attiva = await pausaAttiva(ora);
  return attiva ? Math.floor((ora - attiva.dataInizio) / GIORNO) : 0;
}
