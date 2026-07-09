/** Intervallo di partenza in minuti: la giornata (1440 min) divisa per le sigarette abituali. */
export function intervalloBase(sigaretteAlGiorno: number): number {
  return Math.round(1440 / sigaretteAlGiorno);
}

/**
 * Intervallo target del giorno `giorno` (0 = primo giorno del piano).
 * Cresce di `incremento` minuti al giorno, tranne nei giorni congelati
 * (indici presenti in `giorniCongelati`), dove resta al valore del giorno prima.
 */
export function intervalloGiorno(
  giorno: number,
  base: number,
  incremento: number,
  giorniCongelati: readonly number[],
): number {
  const congelati = giorniCongelati.filter((g) => g >= 1 && g <= giorno).length;
  return base + (giorno - congelati) * incremento;
}
