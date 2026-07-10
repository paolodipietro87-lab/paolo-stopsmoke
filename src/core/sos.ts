export type ScenarioSos =
  | 'mantenimento'
  | 'quasi'
  | 'rimprovero'
  | 'contabile'
  | 'orgoglio'
  | 'incoraggiamento';

/** Tutto cio che serve al SOS, gia derivato dai timestamp da `usePiano`. */
export interface StatoSos {
  mantenimento: boolean;
  secondiMancanti: number;
  puoiFumare: boolean;
  sgarriOggi: number;
  multeDaVersareEuro: number;
  streak: number;
  oreSmokeFree: number;
  risparmioEuro: number;
}

/** Sotto questa soglia il craving si combatte aspettando, non ragionando. */
export const SOGLIA_QUASI_SEC = 600;
export const SOGLIA_ORGOGLIO_GG = 3;

/**
 * Primo che matcha vince. `quasi` precede `rimprovero` di proposito: a nove
 * minuti dalla scadenza la cosa utile e far aspettare nove minuti, non
 * processare l'utente per uno sgarro gia commesso.
 */
export function scenarioSos(s: StatoSos): ScenarioSos {
  if (s.mantenimento) return 'mantenimento';
  if (!s.puoiFumare && s.secondiMancanti > 0 && s.secondiMancanti <= SOGLIA_QUASI_SEC) return 'quasi';
  if (s.sgarriOggi > 0) return 'rimprovero';
  if (s.multeDaVersareEuro > 0) return 'contabile';
  if (s.streak >= SOGLIA_ORGOGLIO_GG) return 'orgoglio';
  return 'incoraggiamento';
}
