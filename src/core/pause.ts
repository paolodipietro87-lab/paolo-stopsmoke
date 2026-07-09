import { giornoDiPiano } from './engine';

export const DURATA_MAX_PAUSA_GG = 7;
const GIORNO_MS = 1440 * 60_000;

export interface Pausa {
  dataInizio: number;
  /** Assente = pausa ancora attiva. */
  dataFine?: number;
}

/** Fine della pausa, comunque non oltre 7 giorni dall'inizio. */
export function fineEffettivaPausa(p: Pausa): number {
  const limite = p.dataInizio + DURATA_MAX_PAUSA_GG * GIORNO_MS;
  return p.dataFine === undefined ? limite : Math.min(p.dataFine, limite);
}

/**
 * Indici dei giorni di piano (0..orizzonte) toccati da una pausa: in quei giorni
 * l'intervallo target resta fermo al valore precedente.
 */
export function giorniCongelatiDaPause(
  pause: readonly Pausa[],
  inizioPiano: number,
  orizzonteGiorni: number,
): number[] {
  const congelati = new Set<number>();
  for (const p of pause) {
    const primo = giornoDiPiano(p.dataInizio, inizioPiano);
    const ultimo = giornoDiPiano(fineEffettivaPausa(p), inizioPiano);
    for (let g = Math.max(0, primo); g <= Math.min(ultimo, orizzonteGiorni); g++) {
      congelati.add(g);
    }
  }
  return [...congelati].sort((a, b) => a - b);
}
