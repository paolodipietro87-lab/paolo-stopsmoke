import type { SigarettaValutata } from './engine';

/** Mezzanotte locale del giorno che contiene `t`. */
export function inizioGiornoLocale(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Chiave stabile YYYY-MM-DD nel fuso del dispositivo. */
export function chiaveGiorno(t: number): string {
  const d = new Date(t);
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
}

/**
 * Mezzogiorno locale del giorno indicato. Ancorare a mezzogiorno anziche a
 * mezzanotte rende l'aritmetica sui giorni immune al cambio di ora legale:
 * sommare 24 ore a mezzogiorno non fa mai scavallare il giorno sbagliato.
 */
function mezzogiornoDi(giorno: string): Date {
  const [a, m, g] = giorno.split('-').map(Number);
  return new Date(a, m - 1, g, 12, 0, 0, 0);
}

export function giornoPrecedente(giorno: string): string {
  const d = mezzogiornoDi(giorno);
  d.setDate(d.getDate() - 1);
  return chiaveGiorno(d.getTime());
}

export function giornoSuccessivo(giorno: string): string {
  const d = mezzogiornoDi(giorno);
  d.setDate(d.getDate() + 1);
  return chiaveGiorno(d.getTime());
}

export interface RiepilogoGiorno {
  /** Ordinate dalla piu recente. */
  sigarette: SigarettaValutata[];
  fumate: number;
  sgarri: number;
  crediti: number;
}

export function sigaretteDelGiorno(
  sigarette: readonly SigarettaValutata[],
  giorno: string,
): RiepilogoGiorno {
  const delGiorno = sigarette
    .filter((s) => chiaveGiorno(s.timestamp) === giorno)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    sigarette: delGiorno,
    fumate: delGiorno.length,
    sgarri: delGiorno.filter((s) => s.sgarro).length,
    crediti: delGiorno.filter((s) => s.usaCredito).length,
  };
}

/** "ven 10 luglio 2026". */
export function etichettaGiorno(giorno: string): string {
  return mezzogiornoDi(giorno).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
