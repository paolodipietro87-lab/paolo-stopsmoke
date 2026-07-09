import { describe, expect, test } from 'vitest';
import { valutaSigarette } from './engine';
import { FINESTRA_DEFAULT } from './nightWindow';
import {
  costoSigaretta,
  giorniAZero,
  prossimaSigaretta,
  reportEconomico,
  risparmio,
  streakMassima,
  streakSenzaSgarri,
} from './stats';

const d = (s: string) => new Date(s).getTime();
const cfg = {
  intervalloBaseMin: 60,
  incrementoGiornalieroMin: 10,
  notte: FINESTRA_DEFAULT,
  multaPerSgarro: 0.55,
  inizioPiano: d('2026-07-09T00:00'),
};

describe('costoSigaretta', () => {
  test('e il prezzo del pacchetto diviso 20', () => {
    expect(costoSigaretta(5.5)).toBeCloseTo(0.275);
  });
});

describe('giorniAZero', () => {
  test('quando l intervallo supera 1440 min si e a zero sigarette', () => {
    // base 72, +10/gg: serve superare 1440 -> (1440-72)/10 = 136.8 -> 137 giorni
    expect(giorniAZero(72, 10)).toBe(137);
  });

  test('incrementi piu grandi accorciano il piano', () => {
    expect(giorniAZero(72, 15)).toBe(92);
  });

  test('incremento zero non porta mai a zero', () => {
    expect(giorniAZero(72, 0)).toBe(Infinity);
  });
});

describe('prossimaSigaretta', () => {
  test('senza sigarette registrate si puo fumare subito', () => {
    const stato = valutaSigarette([], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T08:00'));
    expect(p.puoiFumare).toBe(true);
    expect(p.scadenza).toBeNull();
  });

  test('durante il countdown non si puo fumare', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00')], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T08:30'));
    expect(p.puoiFumare).toBe(false);
    expect(p.secondiMancanti).toBe(30 * 60);
    expect(p.scadenza).toBe(d('2026-07-09T09:00'));
  });

  test('il countdown scala al secondo, non al minuto', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00')], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T08:30') + 25_000);
    expect(p.secondiMancanti).toBe(29 * 60 + 35);
  });

  test('i millisecondi non fanno sparire un secondo intero', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00')], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T08:59:59') + 500);
    expect(p.secondiMancanti).toBe(1);
  });

  test('a countdown scaduto si puo fumare', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00')], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T09:10'));
    expect(p.puoiFumare).toBe(true);
    expect(p.secondiMancanti).toBe(0);
  });

  test('il debito da sgarro maggiora la scadenza', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00'), d('2026-07-09T08:38')], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T09:00'));
    expect(p.scadenza).toBe(d('2026-07-09T10:00')); // 08:38 + 60 + 22
    expect(p.secondiMancanti).toBe(60 * 60);
  });

  test('col credito si puo fumare anche prima della scadenza', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00')], cfg);
    const p = prossimaSigaretta(stato, cfg, d('2026-07-09T10:30'));
    expect(p.credito).toBe(1);
    expect(p.puoiFumare).toBe(true);
  });
});

describe('streakSenzaSgarri', () => {
  test('giorni consecutivi puliti fino a oggi', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00'), d('2026-07-10T09:30')], cfg);
    expect(streakSenzaSgarri(stato, 2)).toBe(3); // giorni 0, 1, 2
  });

  test('lo sgarro di oggi azzera la streak', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00'), d('2026-07-09T08:30')], cfg);
    expect(streakSenzaSgarri(stato, 0)).toBe(0);
  });

  test('la streak riparte dal giorno dopo l ultimo sgarro', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00'), d('2026-07-09T08:30')], cfg);
    expect(streakSenzaSgarri(stato, 3)).toBe(3); // giorni 1, 2, 3
  });
});

describe('streakMassima', () => {
  test('senza sgarri e tutto il piano', () => {
    const stato = valutaSigarette([d('2026-07-09T08:00')], cfg);
    expect(streakMassima(stato, 4)).toBe(5);
  });

  test('trova la sequenza pulita piu lunga tra due sgarri', () => {
    const smokes = [
      d('2026-07-09T08:00'),
      d('2026-07-09T08:30'), // sgarro giorno 0
      d('2026-07-13T08:00'), // credito maturato in 4 giorni
      d('2026-07-13T08:01'), // secondo credito
      d('2026-07-13T08:02'), // crediti finiti: regolare, il timer riparte
      d('2026-07-13T08:30'), // sgarro giorno 4
    ];
    const stato = valutaSigarette(smokes, cfg);
    // giorni 1,2,3 puliti = 3; dopo il giorno 4 restano 5,6 = 2
    expect(streakMassima(stato, 6)).toBe(3);
  });

  test('zero giorni di piano, zero streak', () => {
    const stato = valutaSigarette([], cfg);
    expect(streakMassima(stato, -1)).toBe(0);
  });
});

describe('risparmio', () => {
  test('fumare meno del consumo iniziale genera risparmio', () => {
    // 2 giorni pieni, 20 sig/giorno attese = 40; fumate 10 => 30 risparmiate
    expect(risparmio({ sigaretteFumate: 10, giorniTrascorsi: 2, sigaretteAlGiornoIniziali: 20, prezzoPacchetto: 5.5 })).toBeCloseTo(8.25);
  });

  test('mai negativo se si fuma piu del previsto', () => {
    expect(risparmio({ sigaretteFumate: 50, giorniTrascorsi: 2, sigaretteAlGiornoIniziali: 20, prezzoPacchetto: 5.5 })).toBe(0);
  });
});

describe('reportEconomico', () => {
  test('tiene distinte spesa sigarette, multe versate e da versare', () => {
    const r = reportEconomico({
      acquisti: [{ timestamp: 1, numeroPacchetti: 2, prezzoTotale: 11 }],
      multe: [
        { timestamp: 1, importo: 0.55, motivo: 'sgarro', stato: 'versata' as const, dataVersamento: 2 },
        { timestamp: 2, importo: 0.55, motivo: 'sgarro', stato: 'da_versare' as const },
      ],
      risparmio: 8.25,
    });
    expect(r.spesaSigarette).toBeCloseTo(11);
    expect(r.multeVersate).toBeCloseTo(0.55);
    expect(r.multeDaVersare).toBeCloseTo(0.55);
    expect(r.risparmio).toBeCloseTo(8.25);
  });
});
