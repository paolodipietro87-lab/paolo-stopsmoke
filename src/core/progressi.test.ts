import { describe, expect, test } from 'vitest';
import { valutaSigarette, type ConfigPiano } from './engine';
import { FINESTRA_DEFAULT } from './nightWindow';
import {
  giorniNelPiano,
  giorniPulitiDopoSgarroPesante,
  mediaSigaretteGiorniChiusi,
  notteIntera,
  timerRispettatiDiFila,
} from './progressi';

const INIZIO = new Date('2026-07-01T00:00:00').getTime();

const CFG: ConfigPiano = {
  intervalloBaseMin: 60,
  incrementoGiornalieroMin: 10,
  notte: FINESTRA_DEFAULT,
  multaPerSgarro: 0.55,
  inizioPiano: INIZIO,
  pause: [],
};

const t = (iso: string) => new Date(iso).getTime();

describe('timerRispettatiDiFila', () => {
  test('conta le sigarette regolari consecutive dalla fine', () => {
    const stato = valutaSigarette(
      [
        t('2026-07-01T08:00:00'),
        t('2026-07-01T08:30:00'), // sgarro: 30 min invece di 60
        t('2026-07-01T10:00:00'),
        t('2026-07-01T12:00:00'),
      ],
      CFG,
    );
    expect(timerRispettatiDiFila(stato)).toBe(2);
  });

  test('lo sgarro in coda azzera il conteggio', () => {
    const stato = valutaSigarette([t('2026-07-01T08:00:00'), t('2026-07-01T08:10:00')], CFG);
    expect(timerRispettatiDiFila(stato)).toBe(0);
  });

  test('zero sigarette, zero timer rispettati', () => {
    expect(timerRispettatiDiFila(valutaSigarette([], CFG))).toBe(0);
  });
});

describe('notteIntera', () => {
  test('vera se una notte fra due giorni fumati e pulita', () => {
    const stato = valutaSigarette([t('2026-07-01T22:00:00'), t('2026-07-02T09:00:00')], CFG);
    expect(notteIntera(stato, CFG)).toBe(true);
  });

  test('falsa se ha fumato alle 3 di notte', () => {
    const stato = valutaSigarette(
      [t('2026-07-01T22:00:00'), t('2026-07-02T03:00:00'), t('2026-07-02T09:00:00')],
      CFG,
    );
    expect(notteIntera(stato, CFG)).toBe(false);
  });

  test('falsa con una sola giornata di dati', () => {
    const stato = valutaSigarette([t('2026-07-01T22:00:00')], CFG);
    expect(notteIntera(stato, CFG)).toBe(false);
  });

  test('falsa se fra i due giorni fumati c e un buco di tracciamento', () => {
    // 1 luglio e 10 luglio: nessuna sigaretta nei giorni intermedi, quindi il
    // 10 non e adiacente al giorno fumato precedente e non conta come notte
    // "attraversata senza fumare fra due giorni consecutivi fumati".
    const stato = valutaSigarette([t('2026-07-01T22:00:00'), t('2026-07-10T08:00:00')], CFG);
    expect(notteIntera(stato, CFG)).toBe(false);
  });
});

describe('giorniPulitiDopoSgarroPesante', () => {
  test('conta i giorni senza sgarri dopo l ultimo sgarro pesante', () => {
    const stato = valutaSigarette(
      [
        t('2026-07-01T08:00:00'),
        t('2026-07-01T08:05:00'), // 55 min di anticipo: pesante
        t('2026-07-02T12:00:00'),
        t('2026-07-03T12:00:00'),
      ],
      CFG,
    );
    // Giorno corrente = 3 (04/07): puliti i giorni 1, 2 e 3.
    expect(giorniPulitiDopoSgarroPesante(stato, 3)).toBe(3);
  });

  test('zero senza sgarri pesanti nello storico', () => {
    const stato = valutaSigarette([t('2026-07-01T08:00:00'), t('2026-07-01T09:00:00')], CFG);
    expect(giorniPulitiDopoSgarroPesante(stato, 3)).toBe(0);
  });

  test('uno sgarro dopo quello pesante riazzera', () => {
    const stato = valutaSigarette(
      [
        t('2026-07-01T22:30:00'),
        t('2026-07-01T23:05:00'), // 25 min di anticipo su 60: pesante, debito 25
        // scadenza successiva = 23:05 + (60 + 25) = 00:30 del 2/7 (giorno 1 frozen)
        t('2026-07-02T00:15:00'), // 15 min di anticipo: sgarro lieve (< soglia pesante), giorno 1
      ],
      CFG,
    );
    expect(giorniPulitiDopoSgarroPesante(stato, 2)).toBe(0);
  });
});

describe('giorniNelPiano', () => {
  test('il primo giorno vale 1', () => {
    expect(giorniNelPiano(CFG, t('2026-07-01T23:00:00'))).toBe(1);
  });
  test('cresce di uno al giorno', () => {
    expect(giorniNelPiano(CFG, t('2026-07-10T00:30:00'))).toBe(10);
  });
});

describe('mediaSigaretteGiorniChiusi', () => {
  test('nessun giorno chiuso: solo sigarette di oggi', () => {
    const stato = valutaSigarette(
      [t('2026-07-05T08:00:00'), t('2026-07-05T09:00:00')],
      CFG,
    );
    expect(mediaSigaretteGiorniChiusi(stato, t('2026-07-05T10:00:00'), 7)).toBeNull();
  });

  test('media su tre giorni chiusi con 10, 14 e 12 sigarette', () => {
    const timestamps = [
      ...Array.from({ length: 10 }, (_, i) => t('2026-07-01T00:00:00') + i * 30 * 60_000),
      ...Array.from({ length: 14 }, (_, i) => t('2026-07-02T00:00:00') + i * 30 * 60_000),
      ...Array.from({ length: 12 }, (_, i) => t('2026-07-03T00:00:00') + i * 30 * 60_000),
    ];
    const stato = valutaSigarette(timestamps, CFG);
    expect(mediaSigaretteGiorniChiusi(stato, t('2026-07-04T10:00:00'), 7)).toBe(12);
  });

  test('un giorno chiuso senza sigarette in mezzo abbassa la media', () => {
    const timestamps = [
      t('2026-07-01T08:00:00'),
      t('2026-07-01T09:00:00'), // giorno 1: 2 sigarette
      // giorno 2 (02/07): nessuna sigaretta, conta come zero
      t('2026-07-03T08:00:00'), // giorno 3: 1 sigaretta
    ];
    const stato = valutaSigarette(timestamps, CFG);
    // (2 + 0 + 1) / 3 = 1
    expect(mediaSigaretteGiorniChiusi(stato, t('2026-07-04T10:00:00'), 7)).toBe(1);
  });

  test('la finestra si ferma a giorni: i piu vecchi non incidono', () => {
    // 10 giorni chiusi di dati (25/06..04/07), giorni = 7: contano solo gli
    // ultimi 7 (28/06..04/07), 1 sigaretta ciascuno; i 3 piu vecchi hanno 100
    // sigarette ciascuno e non devono influenzare la media.
    const timestamps: number[] = [];
    for (let i = 0; i < 10; i++) {
      const giorno = t('2026-06-25T08:00:00') + i * 24 * 60 * 60_000;
      const n = i < 3 ? 100 : 1;
      for (let k = 0; k < n; k++) timestamps.push(giorno + k * 60_000);
    }
    const stato = valutaSigarette(timestamps, CFG);
    expect(mediaSigaretteGiorniChiusi(stato, t('2026-07-05T10:00:00'), 7)).toBe(1);
  });

  test('non conta giorni anteriori alla prima sigaretta mai registrata', () => {
    const stato = valutaSigarette(
      [t('2026-07-03T08:00:00'), t('2026-07-03T09:00:00')],
      CFG,
    );
    // Oggi = 05/07: giorni chiusi richiesti 7, ma la prima sigaretta e del 03/07,
    // quindi solo il 03/07 e il 04/07 (senza sigarette) contano.
    expect(mediaSigaretteGiorniChiusi(stato, t('2026-07-05T10:00:00'), 7)).toBe(1);
  });
});
