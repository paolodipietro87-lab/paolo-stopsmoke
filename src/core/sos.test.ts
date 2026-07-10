import { describe, expect, test } from 'vitest';
import { scenarioSos, type StatoSos } from './sos';

const BASE: StatoSos = {
  mantenimento: false,
  secondiMancanti: 3600,
  puoiFumare: false,
  sgarriOggi: 0,
  multeDaVersareEuro: 0,
  streak: 0,
  oreSmokeFree: 5,
  risparmioEuro: 12.5,
};

describe('scenarioSos', () => {
  test('mantenimento vince su tutto', () => {
    expect(scenarioSos({ ...BASE, mantenimento: true, sgarriOggi: 3, secondiMancanti: 60 })).toBe('mantenimento');
  });

  test('quasi quando mancano 10 minuti o meno', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 600 })).toBe('quasi');
    expect(scenarioSos({ ...BASE, secondiMancanti: 601 })).toBe('incoraggiamento');
  });

  test('quasi batte rimprovero: a nove minuti serve aspettare, non essere processati', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 540, sgarriOggi: 2 })).toBe('quasi');
  });

  test('a timer scaduto non e piu quasi: non c e nulla da aspettare', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 0, puoiFumare: true })).toBe('incoraggiamento');
  });

  test('rimprovero con almeno uno sgarro oggi', () => {
    expect(scenarioSos({ ...BASE, sgarriOggi: 1, multeDaVersareEuro: 5, streak: 9 })).toBe('rimprovero');
  });

  test('contabile con multe in sospeso e nessuno sgarro oggi', () => {
    expect(scenarioSos({ ...BASE, multeDaVersareEuro: 4.4, streak: 9 })).toBe('contabile');
  });

  test('orgoglio con streak di almeno 3 giorni', () => {
    expect(scenarioSos({ ...BASE, streak: 3 })).toBe('orgoglio');
    expect(scenarioSos({ ...BASE, streak: 2 })).toBe('incoraggiamento');
  });

  test('incoraggiamento come fallback', () => {
    expect(scenarioSos(BASE)).toBe('incoraggiamento');
  });
});
