import { describe, expect, test } from 'vitest';
import { valutaSigarette, type ConfigPiano } from './engine';
import { FINESTRA_DEFAULT } from './nightWindow';
import {
  giorniNelPiano,
  giorniPulitiDopoSgarroPesante,
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
