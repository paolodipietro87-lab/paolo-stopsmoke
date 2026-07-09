export interface DatiBadge {
  giorniPuliti: number;
  streakMax: number;
  risparmioEuro: number;
  sigaretteOggi: number;
  sigaretteAlGiornoIniziali: number;
  oreSmokeFree: number;
}

export interface Badge {
  id: string;
  titolo: string;
  descrizione: string;
  raggiunto: (d: DatiBadge) => boolean;
}

const riduzione = (d: DatiBadge) => 1 - d.sigaretteOggi / d.sigaretteAlGiornoIniziali;

export const BADGE: readonly Badge[] = [
  {
    id: 'primo-giorno-pulito',
    titolo: 'Prima giornata senza sgarri',
    descrizione: 'Un giorno intero rispettando ogni timer.',
    raggiunto: (d) => d.giorniPuliti >= 1,
  },
  {
    id: 'settimana-pulita',
    titolo: 'Una settimana pulita',
    descrizione: '7 giorni di fila senza un solo sgarro.',
    raggiunto: (d) => d.streakMax >= 7,
  },
  {
    id: 'meno-25',
    titolo: '−25%',
    descrizione: 'Un quarto delle sigarette in meno rispetto all inizio.',
    raggiunto: (d) => riduzione(d) >= 0.25,
  },
  {
    id: 'meno-50',
    titolo: '−50%',
    descrizione: 'Meta delle sigarette rispetto all inizio.',
    raggiunto: (d) => riduzione(d) >= 0.5,
  },
  {
    id: 'meno-75',
    titolo: '−75%',
    descrizione: 'Tre quarti in meno. Lo zero e vicino.',
    raggiunto: (d) => riduzione(d) >= 0.75,
  },
  {
    id: 'risparmio-50',
    titolo: '50 € risparmiati',
    descrizione: 'Soldi non bruciati.',
    raggiunto: (d) => d.risparmioEuro >= 50,
  },
  {
    id: 'risparmio-100',
    titolo: '100 € risparmiati',
    descrizione: 'Il conto inizia a vedersi.',
    raggiunto: (d) => d.risparmioEuro >= 100,
  },
  {
    id: 'risparmio-500',
    titolo: '500 € risparmiati',
    descrizione: 'Mezzo migliaio che era fumo.',
    raggiunto: (d) => d.risparmioEuro >= 500,
  },
  {
    id: 'primo-giorno-zero',
    titolo: 'Primo giorno a zero sigarette',
    descrizione: '24 ore senza fumare, nemmeno una.',
    raggiunto: (d) => d.oreSmokeFree >= 24,
  },
  {
    id: 'mese-smoke-free',
    titolo: 'Un mese smoke-free',
    descrizione: '30 giorni senza fumare.',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 30,
  },
];

export function badgeSbloccati(d: DatiBadge): Badge[] {
  return BADGE.filter((b) => b.raggiunto(d));
}
