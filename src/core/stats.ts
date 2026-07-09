import { creditAt } from './credit';
import { giornoDiPiano, type ConfigPiano, type StatoPiano } from './engine';
import { intervalloGiorno } from './interval';

const MIN = 60_000;
const SIGARETTE_PER_PACCHETTO = 20;

export function costoSigaretta(prezzoPacchetto: number): number {
  return prezzoPacchetto / SIGARETTE_PER_PACCHETTO;
}

/** Giorni di piano necessari perche l'intervallo superi le 24 ore (meno di 1 sigaretta/giorno). */
export function giorniAZero(intervalloBaseMin: number, incrementoGiornalieroMin: number): number {
  if (incrementoGiornalieroMin <= 0) return Infinity;
  return Math.ceil((1440 - intervalloBaseMin) / incrementoGiornalieroMin);
}

export interface ProssimaSigaretta {
  /** null quando non c'e ancora nessuna sigaretta registrata. */
  scadenza: number | null;
  /** Arrotondati per eccesso: il countdown mostra 1 finche l'ultimo secondo non e finito. */
  secondiMancanti: number;
  credito: number;
  puoiFumare: boolean;
}

/** Stato del countdown all'istante `ora`, derivato dai soli timestamp persistiti. */
export function prossimaSigaretta(stato: StatoPiano, cfg: ConfigPiano, ora: number): ProssimaSigaretta {
  if (stato.riferimentoTimer === null) {
    return { scadenza: null, secondiMancanti: 0, credito: 0, puoiFumare: true };
  }

  const giorno = giornoDiPiano(ora, cfg.inizioPiano);
  const intervallo = intervalloGiorno(
    giorno,
    cfg.intervalloBaseMin,
    cfg.incrementoGiornalieroMin,
    stato.giorniCongelati,
  );

  const credito = Math.max(
    0,
    creditAt(stato.riferimentoTimer, ora, { intervalloMin: intervallo, notte: cfg.notte }) -
      stato.creditiConsumati,
  );

  const scadenza = stato.riferimentoTimer + (intervallo + stato.debitoResiduoMin) * MIN;
  const secondiMancanti = Math.max(0, Math.ceil((scadenza - ora) / 1000));

  return { scadenza, secondiMancanti, credito, puoiFumare: credito > 0 || ora >= scadenza };
}

/** Giorni consecutivi senza sgarri fino a `giornoCorrente` incluso. */
export function streakSenzaSgarri(stato: StatoPiano, giornoCorrente: number): number {
  const giorniSporchi = new Set(stato.sigarette.filter((s) => s.sgarro).map((s) => s.giorno));
  let streak = 0;
  for (let g = giornoCorrente; g >= 0; g--) {
    if (giorniSporchi.has(g)) break;
    streak++;
  }
  return streak;
}

/** La sequenza pulita piu lunga mai raggiunta, fino a `giornoCorrente`. */
export function streakMassima(stato: StatoPiano, giornoCorrente: number): number {
  const giorniSporchi = new Set(stato.sigarette.filter((s) => s.sgarro).map((s) => s.giorno));
  let migliore = 0;
  let corrente = 0;
  for (let g = 0; g <= giornoCorrente; g++) {
    corrente = giorniSporchi.has(g) ? 0 : corrente + 1;
    migliore = Math.max(migliore, corrente);
  }
  return migliore;
}

export interface DatiRisparmio {
  sigaretteFumate: number;
  giorniTrascorsi: number;
  sigaretteAlGiornoIniziali: number;
  prezzoPacchetto: number;
}

/** Soldi non spesi rispetto al consumo di partenza. Mai negativo. */
export function risparmio(d: DatiRisparmio): number {
  const attese = d.giorniTrascorsi * d.sigaretteAlGiornoIniziali;
  const evitate = Math.max(0, attese - d.sigaretteFumate);
  return evitate * costoSigaretta(d.prezzoPacchetto);
}

export interface ReportEconomico {
  spesaSigarette: number;
  multeVersate: number;
  multeDaVersare: number;
  risparmio: number;
}

/** Le tre voci restano sempre distinte: spesa, multe (versate / da versare), risparmio. */
export function reportEconomico<
  A extends { prezzoTotale: number },
  M extends { importo: number; stato: 'da_versare' | 'versata' },
>(input: { acquisti: readonly A[]; multe: readonly M[]; risparmio: number }): ReportEconomico {
  const somma = (stato: 'da_versare' | 'versata') =>
    input.multe.filter((m) => m.stato === stato).reduce((n, m) => n + m.importo, 0);

  return {
    spesaSigarette: input.acquisti.reduce((n, a) => n + a.prezzoTotale, 0),
    multeVersate: somma('versata'),
    multeDaVersare: somma('da_versare'),
    risparmio: input.risparmio,
  };
}
