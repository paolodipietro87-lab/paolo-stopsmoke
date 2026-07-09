import { minutiUtili, type FinestraNotturna } from './nightWindow';

export const CREDITO_MAX = 2;
export const CREDITO_MAX_MEZZANOTTE = 1;

export interface OpzioniCredito {
  /** Intervallo target corrente in minuti. */
  intervalloMin: number;
  notte: FinestraNotturna;
}

const MIN = 60_000;

function mezzanotteSuccessiva(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + 1440 * MIN;
}

/**
 * Credito sigarette disponibile all'istante `ora`, derivato solo dai timestamp.
 *
 * Regole:
 * - il primo intervallo dopo l'ultima sigaretta e il countdown normale, non matura credito;
 * - ogni intervallo pieno successivo matura 1 credito, fino a CREDITO_MAX;
 * - nella finestra notturna il tempo non matura credito (vedi minutiUtili);
 * - a ogni mezzanotte locale il credito residuo viene tagliato a CREDITO_MAX_MEZZANOTTE.
 */
export function creditAt(ultimaSigaretta: number, ora: number, opz: OpzioniCredito): number {
  if (ora <= ultimaSigaretta) return 0;

  let credito = 0;
  let accumulato = 0;
  let debitoPrimoIntervallo = opz.intervalloMin;

  let cursore = ultimaSigaretta;
  while (cursore < ora) {
    const fineSegmento = Math.min(ora, mezzanotteSuccessiva(cursore));
    accumulato += minutiUtili(cursore, fineSegmento, opz.notte);

    // Il primo intervallo si consuma senza maturare credito.
    const consumato = Math.min(debitoPrimoIntervallo, accumulato);
    debitoPrimoIntervallo -= consumato;
    accumulato -= consumato;

    while (credito < CREDITO_MAX && accumulato >= opz.intervalloMin) {
      credito++;
      accumulato -= opz.intervalloMin;
    }
    if (credito >= CREDITO_MAX) accumulato = 0;

    cursore = fineSegmento;
    if (cursore < ora) credito = Math.min(credito, CREDITO_MAX_MEZZANOTTE); // taglio di mezzanotte
  }

  return credito;
}
