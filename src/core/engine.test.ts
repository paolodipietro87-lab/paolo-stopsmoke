import { describe, expect, test } from 'vitest';
import { valutaSigarette } from './engine';
import { FINESTRA_DEFAULT } from './nightWindow';

const d = (s: string) => new Date(s).getTime();

const cfg = {
  intervalloBaseMin: 60,
  incrementoGiornalieroMin: 10,
  notte: FINESTRA_DEFAULT,
  multaPerSgarro: 0.55,
  inizioPiano: d('2026-07-09T00:00'),
};

describe('valutaSigarette', () => {
  test('la prima sigaretta non e mai uno sgarro', () => {
    const r = valutaSigarette([d('2026-07-09T08:00')], cfg);
    expect(r.sigarette[0].sgarro).toBe(false);
    expect(r.multeTotali).toBe(0);
  });

  test('sigaretta dopo l intervallo pieno e regolare', () => {
    const r = valutaSigarette([d('2026-07-09T08:00'), d('2026-07-09T09:05')], cfg);
    expect(r.sigarette[1].sgarro).toBe(false);
    expect(r.sigarette[1].minutiAnticipo).toBe(0);
  });

  test('sigaretta anticipata e sgarro con multa e minuti rubati', () => {
    const r = valutaSigarette([d('2026-07-09T08:00'), d('2026-07-09T08:38')], cfg);
    expect(r.sigarette[1].sgarro).toBe(true);
    expect(r.sigarette[1].minutiAnticipo).toBe(22);
    expect(r.multeTotali).toBeCloseTo(0.55);
  });

  test('il debito si somma e maggiora il timer successivo', () => {
    const smokes = [
      d('2026-07-09T08:00'),
      d('2026-07-09T08:38'), // sgarro, ruba 22 min -> debito 22
      d('2026-07-09T09:20'), // scadenza 08:38 + 60 + 22 = 10:00 -> sgarro, ruba 40 -> debito 62
    ];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[2].sgarro).toBe(true);
    expect(r.sigarette[2].minutiAnticipo).toBe(40);
    expect(r.debitoResiduoMin).toBe(62);
    expect(r.multeTotali).toBeCloseTo(1.1);
  });

  test('rispettare il timer maggiorato azzera il debito', () => {
    const smokes = [
      d('2026-07-09T08:00'),
      d('2026-07-09T08:38'), // sgarro, debito 22
      d('2026-07-09T10:01'), // scadenza 08:38 + 60 + 22 = 10:00 -> rispettata
    ];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[2].sgarro).toBe(false);
    expect(r.debitoResiduoMin).toBe(0);
  });

  test('fumare con credito non e sgarro e non fa ripartire il timer', () => {
    const smokes = [
      d('2026-07-09T08:00'),
      d('2026-07-09T10:00'), // 2 intervalli -> 1 credito, consumato
      d('2026-07-09T10:01'), // credito esaurito, timer riferito alle 08:00 gia scaduto
    ];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[1].sgarro).toBe(false);
    expect(r.sigarette[1].usaCredito).toBe(true);
    expect(r.sigarette[2].sgarro).toBe(false);
    expect(r.sigarette[2].usaCredito).toBe(false);
    expect(r.multeTotali).toBe(0);
  });

  test('due crediti permettono due sigarette di fila senza sgarro', () => {
    const smokes = [
      d('2026-07-09T08:00'),
      d('2026-07-09T11:00'), // 3 intervalli -> 2 crediti
      d('2026-07-09T11:01'),
      d('2026-07-09T11:02'), // crediti finiti, ma timer da 08:00 e scaduto -> regolare, rif = 11:02
      d('2026-07-09T11:30'), // sgarro: scadenza 12:02
    ];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette.map((s) => s.usaCredito)).toEqual([false, true, true, false, false]);
    expect(r.sigarette[4].sgarro).toBe(true);
    expect(r.sigarette[4].minutiAnticipo).toBe(32);
  });

  test('un giorno con sgarro congela la progressione del giorno dopo', () => {
    const smokes = [d('2026-07-09T08:00'), d('2026-07-09T08:38')];
    const r = valutaSigarette(smokes, cfg);
    expect(r.giorniCongelati).toEqual([1]);
  });

  test('piu sgarri nello stesso giorno congelano un solo giorno', () => {
    const smokes = [d('2026-07-09T08:00'), d('2026-07-09T08:38'), d('2026-07-09T09:20')];
    const r = valutaSigarette(smokes, cfg);
    expect(r.giorniCongelati).toEqual([1]);
  });

  test('sgarri in giorni diversi congelano un giorno ciascuno', () => {
    const smokes = [
      d('2026-07-09T08:00'),
      d('2026-07-09T08:30'), // sgarro giorno 0
      d('2026-07-10T08:00'), // giorno 1: 2 crediti maturati durante la notte (tagliati e rimaturati)
      d('2026-07-10T08:01'), // secondo credito
      d('2026-07-10T08:02'), // crediti finiti, timer scaduto da un pezzo -> regolare
      d('2026-07-10T08:30'), // sgarro giorno 1 (intervallo congelato = 60, scadenza 09:02)
    ];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[5].sgarro).toBe(true);
    expect(r.sigarette[5].minutiAnticipo).toBe(32);
    expect(r.giorniCongelati).toEqual([1, 2]);
  });

  test('un giorno intero senza sigarette non rompe il calcolo', () => {
    const smokes = [d('2026-07-09T08:00'), d('2026-07-11T08:00')];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[1].sgarro).toBe(false);
    expect(r.giorniCongelati).toEqual([]);
  });

  test('l intervallo cresce col giorno del piano', () => {
    const smokes = [
      d('2026-07-10T08:00'), // giorno 1 -> intervallo 70
      d('2026-07-10T09:05'), // 65 min: sgarro di 5
    ];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[1].sgarro).toBe(true);
    expect(r.sigarette[1].minutiAnticipo).toBe(5);
  });

  test('una pausa attiva congela la progressione: nessuno sgarro al vecchio intervallo', () => {
    const pause = [{ dataInizio: d('2026-07-09T00:00'), dataFine: d('2026-07-11T00:00') }];
    const smokes = [
      d('2026-07-10T08:00'), // giorno 1: senza pausa intervallo 70, con pausa resta 60
      d('2026-07-10T09:01'), // 61 min: regolare solo se l intervallo e congelato a 60
    ];
    const r = valutaSigarette(smokes, { ...cfg, pause });
    expect(r.sigarette[1].sgarro).toBe(false);
  });

  test('senza pausa lo stesso scenario e uno sgarro', () => {
    const smokes = [d('2026-07-10T08:00'), d('2026-07-10T09:01')];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[1].sgarro).toBe(true);
    expect(r.sigarette[1].minutiAnticipo).toBe(9);
  });

  test('le sigarette vengono ordinate: registrazione retroattiva ricalcola', () => {
    const smokes = [d('2026-07-09T09:05'), d('2026-07-09T08:00')];
    const r = valutaSigarette(smokes, cfg);
    expect(r.sigarette[0].timestamp).toBe(d('2026-07-09T08:00'));
    expect(r.sigarette[1].sgarro).toBe(false);
  });
});
