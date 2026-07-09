import { valutaSigarette, type ConfigPiano, type SigarettaValutata } from '../core/engine';
import { db } from './db';

export interface EsitoFumata {
  id: number;
  valutazione: SigarettaValutata;
}

/**
 * Registra una sigaretta e, se e uno sgarro, la multa collegata.
 * Ricalcola sempre l'intero piano dai timestamp: vale anche per una data passata.
 */
export async function fuma(timestamp: number, cfg: ConfigPiano): Promise<EsitoFumata> {
  return db.transaction('rw', db.smokes, db.penalties, async () => {
    const id = (await db.smokes.add({ timestamp })) as number;

    const timestamps = (await db.smokes.toArray()).map((s) => s.timestamp);
    const stato = valutaSigarette(timestamps, cfg);
    const valutazione = stato.sigarette.find((s) => s.timestamp === timestamp)!;

    if (valutazione.sgarro) {
      await db.penalties.add({
        timestamp,
        importo: valutazione.multa,
        motivo: `Sgarro: ${valutazione.minutiAnticipo} minuti di anticipo`,
        stato: 'da_versare',
        sigarettaId: id,
      });
    }
    return { id, valutazione };
  });
}

/** Undo entro 10 secondi, o cancellazione dallo storico. */
export async function annullaFumata(id: number): Promise<void> {
  await db.transaction('rw', db.smokes, db.penalties, async () => {
    await db.smokes.delete(id);
    await db.penalties.where('sigarettaId').equals(id).delete();
  });
}
