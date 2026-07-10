export type FamigliaBadge =
  | 'riduzione'
  | 'streak'
  | 'risparmio'
  | 'mantenimento'
  | 'disciplina'
  | 'resistenza'
  | 'salvadanaio'
  | 'tempo'
  | 'notturno'
  | 'redenzione'
  | 'costanza';

export const ETICHETTA_FAMIGLIA: Record<FamigliaBadge, string> = {
  riduzione: 'Riduzione',
  streak: 'Streak',
  risparmio: 'Risparmio',
  mantenimento: 'Mantenimento',
  disciplina: 'Disciplina',
  resistenza: 'Resistenza',
  salvadanaio: 'Salvadanaio',
  tempo: 'Tempo',
  notturno: 'Notte',
  redenzione: 'Redenzione',
  costanza: 'Costanza',
};

export interface DatiBadge {
  giorniPuliti: number;
  streakMax: number;
  risparmioEuro: number;
  sigaretteOggi: number;
  sigaretteAlGiornoIniziali: number;
  oreSmokeFree: number;
  /** Sigarette consecutive senza sgarro. */
  timerRispettatiDiFila: number;
  intervalloCorrenteMin: number;
  /** Massimo credito raggiunto finora. */
  creditoMax: number;
  giorniNelPiano: number;
  multeVersateEuro: number;
  multeVersateCount: number;
  notteIntera: boolean;
  giorniPulitiDopoSgarroPesante: number;
  /** Giorni di fila con entrambi i mini-obiettivi centrati. */
  obiettiviCentratiDiFila: number;
}

export interface Badge {
  id: string;
  titolo: string;
  descrizione: string;
  famiglia: FamigliaBadge;
  raggiunto: (d: DatiBadge) => boolean;
}

const riduzione = (d: DatiBadge) => 1 - d.sigaretteOggi / d.sigaretteAlGiornoIniziali;

export const BADGE: readonly Badge[] = [
  // Riduzione
  {
    id: 'meno-25',
    titolo: '−25%',
    descrizione: 'Un quarto delle sigarette in meno rispetto all inizio.',
    famiglia: 'riduzione',
    raggiunto: (d) => riduzione(d) >= 0.25,
  },
  {
    id: 'meno-50',
    titolo: '−50%',
    descrizione: 'Meta delle sigarette rispetto all inizio.',
    famiglia: 'riduzione',
    raggiunto: (d) => riduzione(d) >= 0.5,
  },
  {
    id: 'meno-75',
    titolo: '−75%',
    descrizione: 'Tre quarti in meno. Lo zero e vicino.',
    famiglia: 'riduzione',
    raggiunto: (d) => riduzione(d) >= 0.75,
  },

  // Streak
  {
    id: 'primo-giorno-pulito',
    titolo: 'Prima giornata senza sgarri',
    descrizione: 'Un giorno intero rispettando ogni timer.',
    famiglia: 'streak',
    raggiunto: (d) => d.giorniPuliti >= 1,
  },
  {
    id: 'settimana-pulita',
    titolo: 'Una settimana pulita',
    descrizione: '7 giorni di fila senza un solo sgarro.',
    famiglia: 'streak',
    raggiunto: (d) => d.streakMax >= 7,
  },
  {
    id: 'streak-30',
    titolo: 'Un mese pulito',
    descrizione: '30 giorni di fila senza sgarri.',
    famiglia: 'streak',
    raggiunto: (d) => d.streakMax >= 30,
  },

  // Risparmio
  {
    id: 'risparmio-50',
    titolo: '50 € risparmiati',
    descrizione: 'Soldi non bruciati.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 50,
  },
  {
    id: 'risparmio-100',
    titolo: '100 € risparmiati',
    descrizione: 'Il conto inizia a vedersi.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 100,
  },
  {
    id: 'risparmio-500',
    titolo: '500 € risparmiati',
    descrizione: 'Mezzo migliaio che era fumo.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 500,
  },
  {
    id: 'risparmio-1000',
    titolo: '1000 € risparmiati',
    descrizione: 'Quattro cifre. Non erano tue, ora si.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 1000,
  },

  // Mantenimento
  {
    id: 'primo-giorno-zero',
    titolo: 'Primo giorno a zero sigarette',
    descrizione: '24 ore senza fumare, nemmeno una.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24,
  },
  {
    id: 'settimana-smoke-free',
    titolo: 'Una settimana smoke-free',
    descrizione: '7 giorni senza fumare.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 7,
  },
  {
    id: 'mese-smoke-free',
    titolo: 'Un mese smoke-free',
    descrizione: '30 giorni senza fumare.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 30,
  },
  {
    id: 'anno-smoke-free',
    titolo: 'Un anno smoke-free',
    descrizione: '365 giorni. Il rischio cardiaco e dimezzato.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 365,
  },

  // Disciplina
  {
    id: 'disciplina-10',
    titolo: '10 timer di fila',
    descrizione: 'Dieci sigarette consecutive senza rubare un minuto.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 10,
  },
  {
    id: 'disciplina-50',
    titolo: '50 timer di fila',
    descrizione: 'Cinquanta. Non e piu fortuna.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 50,
  },
  {
    id: 'disciplina-100',
    titolo: '100 timer di fila',
    descrizione: 'Cento intervalli interi. Il piano sei tu.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 100,
  },
  {
    id: 'disciplina-500',
    titolo: '500 timer di fila',
    descrizione: 'Cinquecento. Nessuna scusa in mezzo.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 500,
  },

  // Resistenza
  {
    id: 'credito-pieno',
    titolo: 'Credito pieno',
    descrizione: 'Due sigarette in credito. Hai aspettato il doppio.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.creditoMax >= 2,
  },
  {
    id: 'intervallo-2h',
    titolo: 'Due ore di intervallo',
    descrizione: 'Il timer supera le due ore.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 120,
  },
  {
    id: 'intervallo-6h',
    titolo: 'Sei ore di intervallo',
    descrizione: 'Un quarto di giornata fra una sigaretta e l altra.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 360,
  },
  {
    id: 'intervallo-12h',
    titolo: 'Dodici ore di intervallo',
    descrizione: 'Mezza giornata. Due sigarette al giorno.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 720,
  },
  {
    id: 'intervallo-24h',
    titolo: 'Ventiquattro ore di intervallo',
    descrizione: 'Una sigaretta al giorno. Lo zero e a un passo.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 1440,
  },

  // Salvadanaio
  {
    id: 'prima-multa-versata',
    titolo: 'Prima multa versata',
    descrizione: 'Hai pagato davvero. Il salvadanaio e reale.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateCount >= 1,
  },
  {
    id: 'versati-10',
    titolo: '10 € versati',
    descrizione: 'Dieci euro di debolezza, messi da parte.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateEuro >= 10,
  },
  {
    id: 'versati-50',
    titolo: '50 € versati',
    descrizione: 'Un fondo vero, costruito sbagliando.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateEuro >= 50,
  },
  {
    id: 'versati-100',
    titolo: '100 € versati',
    descrizione: 'Cento euro. Ora falli smettere di crescere.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateEuro >= 100,
  },

  // Tempo
  {
    id: 'piano-7',
    titolo: 'Una settimana di piano',
    descrizione: 'Sette giorni dentro il programma.',
    famiglia: 'tempo',
    raggiunto: (d) => d.giorniNelPiano >= 7,
  },
  {
    id: 'piano-30',
    titolo: 'Un mese di piano',
    descrizione: 'Trenta giorni. Non hai mollato.',
    famiglia: 'tempo',
    raggiunto: (d) => d.giorniNelPiano >= 30,
  },
  {
    id: 'piano-100',
    titolo: 'Cento giorni di piano',
    descrizione: 'Cento giorni con il timer addosso.',
    famiglia: 'tempo',
    raggiunto: (d) => d.giorniNelPiano >= 100,
  },

  // Notturno
  {
    id: 'notte-intera',
    titolo: 'Notte intera',
    descrizione: 'Una notte attraversata senza accendere niente.',
    famiglia: 'notturno',
    raggiunto: (d) => d.notteIntera,
  },

  // Redenzione
  {
    id: 'redenzione',
    // Titolo diverso dall'etichetta di famiglia ('Redenzione') per evitare
    // testo duplicato a schermo (due nodi con lo stesso testo esatto
    // renderebbero ambigue le query per testo nella UI dei Traguardi).
    titolo: 'Settimana di redenzione',
    descrizione: 'Sette giorni puliti dopo uno sgarro pesante.',
    famiglia: 'redenzione',
    raggiunto: (d) => d.giorniPulitiDopoSgarroPesante >= 7,
  },

  // Costanza
  {
    id: 'costanza-7',
    titolo: 'Sette giorni di obiettivi',
    descrizione: 'Una settimana centrando entrambi i mini-obiettivi.',
    famiglia: 'costanza',
    raggiunto: (d) => d.obiettiviCentratiDiFila >= 7,
  },
];

export function badgeSbloccati(d: DatiBadge): Badge[] {
  return BADGE.filter((b) => b.raggiunto(d));
}
