import { describe, expect, test } from 'vitest';
import { BADGE, badgeSbloccati, ETICHETTA_FAMIGLIA, type DatiBadge } from './badge';

const ZERO: DatiBadge = {
  giorniPuliti: 0,
  streakMax: 0,
  risparmioEuro: 0,
  sigaretteOggi: 20,
  sigaretteAlGiornoIniziali: 20,
  oreSmokeFree: 0,
  timerRispettatiDiFila: 0,
  intervalloCorrenteMin: 72,
  creditoMax: 0,
  giorniNelPiano: 1,
  multeVersateEuro: 0,
  multeVersateCount: 0,
  notteIntera: false,
  giorniPulitiDopoSgarroPesante: 0,
  obiettiviCentratiDiFila: 0,
};

function sbloccato(id: string, d: Partial<DatiBadge>): boolean {
  return badgeSbloccati({ ...ZERO, ...d }).some((b) => b.id === id);
}

describe('struttura', () => {
  test('gli id sono univoci', () => {
    expect(new Set(BADGE.map((b) => b.id)).size).toBe(BADGE.length);
  });

  test('almeno 30 badge', () => {
    expect(BADGE.length).toBeGreaterThanOrEqual(30);
  });

  test('gli id storici non sono cambiati', () => {
    const storici = [
      'primo-giorno-pulito',
      'settimana-pulita',
      'meno-25',
      'meno-50',
      'meno-75',
      'risparmio-50',
      'risparmio-100',
      'risparmio-500',
      'primo-giorno-zero',
      'mese-smoke-free',
    ];
    for (const id of storici) expect(BADGE.some((b) => b.id === id)).toBe(true);
  });

  test('ogni famiglia usata ha un etichetta', () => {
    for (const b of BADGE) expect(ETICHETTA_FAMIGLIA[b.famiglia]).toBeTruthy();
  });

  test('con dati a zero nessun badge e sbloccato', () => {
    expect(badgeSbloccati(ZERO)).toEqual([]);
  });
});

describe('disciplina', () => {
  test('scatta alla soglia esatta, non prima', () => {
    expect(sbloccato('disciplina-10', { timerRispettatiDiFila: 9 })).toBe(false);
    expect(sbloccato('disciplina-10', { timerRispettatiDiFila: 10 })).toBe(true);
    expect(sbloccato('disciplina-500', { timerRispettatiDiFila: 499 })).toBe(false);
    expect(sbloccato('disciplina-500', { timerRispettatiDiFila: 500 })).toBe(true);
  });
});

describe('resistenza', () => {
  test('credito pieno', () => {
    expect(sbloccato('credito-pieno', { creditoMax: 1 })).toBe(false);
    expect(sbloccato('credito-pieno', { creditoMax: 2 })).toBe(true);
  });

  test('intervallo oltre le soglie', () => {
    expect(sbloccato('intervallo-2h', { intervalloCorrenteMin: 119 })).toBe(false);
    expect(sbloccato('intervallo-2h', { intervalloCorrenteMin: 120 })).toBe(true);
    expect(sbloccato('intervallo-24h', { intervalloCorrenteMin: 1440 })).toBe(true);
  });
});

describe('salvadanaio', () => {
  test('prima multa versata', () => {
    expect(sbloccato('prima-multa-versata', { multeVersateCount: 1 })).toBe(true);
    expect(sbloccato('prima-multa-versata', { multeVersateCount: 0 })).toBe(false);
  });

  test('soglie in euro versati', () => {
    expect(sbloccato('versati-10', { multeVersateEuro: 9.99 })).toBe(false);
    expect(sbloccato('versati-10', { multeVersateEuro: 10 })).toBe(true);
    expect(sbloccato('versati-100', { multeVersateEuro: 100 })).toBe(true);
  });
});

describe('tempo', () => {
  test('giorni nel piano', () => {
    expect(sbloccato('piano-7', { giorniNelPiano: 6 })).toBe(false);
    expect(sbloccato('piano-7', { giorniNelPiano: 7 })).toBe(true);
    expect(sbloccato('piano-100', { giorniNelPiano: 100 })).toBe(true);
  });
});

describe('notturno e redenzione', () => {
  test('una notte intera', () => {
    expect(sbloccato('notte-intera', { notteIntera: true })).toBe(true);
  });

  test('sette giorni puliti dopo uno sgarro pesante', () => {
    expect(sbloccato('redenzione', { giorniPulitiDopoSgarroPesante: 6 })).toBe(false);
    expect(sbloccato('redenzione', { giorniPulitiDopoSgarroPesante: 7 })).toBe(true);
  });
});

describe('costanza', () => {
  test('sette giorni con entrambi gli obiettivi centrati', () => {
    expect(sbloccato('costanza-7', { obiettiviCentratiDiFila: 6 })).toBe(false);
    expect(sbloccato('costanza-7', { obiettiviCentratiDiFila: 7 })).toBe(true);
  });
});

describe('badge storici', () => {
  test('la riduzione usa le sigarette di oggi contro le iniziali', () => {
    expect(sbloccato('meno-50', { sigaretteOggi: 10, sigaretteAlGiornoIniziali: 20 })).toBe(true);
    expect(sbloccato('meno-75', { sigaretteOggi: 10, sigaretteAlGiornoIniziali: 20 })).toBe(false);
  });

  test('mese smoke free a 30 giorni', () => {
    expect(sbloccato('mese-smoke-free', { oreSmokeFree: 24 * 30 })).toBe(true);
  });
});
