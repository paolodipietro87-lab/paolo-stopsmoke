export interface BeneficioSalute {
  id: string;
  oreRichieste: number;
  quando: string;
  testo: string;
}

/**
 * Benefici della cessazione, da fonti mediche pubbliche (OMS, CDC, NHS).
 * Ordinati dal piu rapido al piu lento: la timeline si sblocca da sola.
 */
export const TIMELINE_SALUTE: readonly BeneficioSalute[] = [
  { id: 'pressione', oreRichieste: 20 / 60, quando: '20 minuti', testo: 'Pressione e battito tornano ai valori normali.' },
  { id: 'monossido', oreRichieste: 12, quando: '12 ore', testo: 'Il monossido di carbonio nel sangue scende a livelli normali.' },
  { id: 'ossigeno', oreRichieste: 24, quando: '24 ore', testo: 'Il rischio di infarto inizia a calare.' },
  { id: 'gusto-olfatto', oreRichieste: 48, quando: '2 giorni', testo: 'Gusto e olfatto tornano.' },
  { id: 'circolazione', oreRichieste: 24 * 14, quando: '2 settimane', testo: 'Circolazione migliorata, camminare costa meno fatica.' },
  { id: 'polmoni', oreRichieste: 24 * 30, quando: '1 mese', testo: 'La funzione polmonare aumenta, tosse e fiato corto calano.' },
  { id: 'infezioni', oreRichieste: 24 * 270, quando: '9 mesi', testo: 'Le ciglia polmonari si riprendono: meno infezioni.' },
  { id: 'cuore', oreRichieste: 24 * 365, quando: '1 anno', testo: 'Il rischio di malattia coronarica e dimezzato rispetto a un fumatore.' },
];

/** Benefici gia maturati dopo `ore` senza fumare. */
export function beneficiSbloccati(ore: number): BeneficioSalute[] {
  return TIMELINE_SALUTE.filter((b) => ore >= b.oreRichieste);
}

export function prossimoBeneficio(ore: number): BeneficioSalute | null {
  return TIMELINE_SALUTE.find((b) => ore < b.oreRichieste) ?? null;
}
