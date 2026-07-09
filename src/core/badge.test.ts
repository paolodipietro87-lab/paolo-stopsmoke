import { describe, expect, test } from 'vitest';
import { BADGE, badgeSbloccati } from './badge';

const base = {
  giorniPuliti: 0,
  streakMax: 0,
  risparmioEuro: 0,
  sigaretteOggi: 10,
  sigaretteAlGiornoIniziali: 20,
  oreSmokeFree: 0,
};

describe('badgeSbloccati', () => {
  test('all inizio nessun badge', () => {
    expect(badgeSbloccati({ ...base, sigaretteOggi: 20 })).toEqual([]);
  });

  test('prima giornata senza sgarri', () => {
    const id = badgeSbloccati({ ...base, giorniPuliti: 1, sigaretteOggi: 20 }).map((b) => b.id);
    expect(id).toContain('primo-giorno-pulito');
  });

  test('riduzione del 50 percento', () => {
    const id = badgeSbloccati({ ...base, sigaretteOggi: 10 }).map((b) => b.id);
    expect(id).toContain('meno-25');
    expect(id).toContain('meno-50');
    expect(id).not.toContain('meno-75');
  });

  test('una settimana di streak', () => {
    const id = badgeSbloccati({ ...base, streakMax: 7, sigaretteOggi: 20 }).map((b) => b.id);
    expect(id).toContain('settimana-pulita');
  });

  test('soglie di risparmio', () => {
    const id = badgeSbloccati({ ...base, risparmioEuro: 100, sigaretteOggi: 20 }).map((b) => b.id);
    expect(id).toContain('risparmio-50');
    expect(id).toContain('risparmio-100');
    expect(id).not.toContain('risparmio-500');
  });

  test('primo giorno a zero sigarette', () => {
    const id = badgeSbloccati({ ...base, sigaretteOggi: 0, oreSmokeFree: 24 }).map((b) => b.id);
    expect(id).toContain('primo-giorno-zero');
  });

  test('un mese smoke free', () => {
    const id = badgeSbloccati({ ...base, sigaretteOggi: 0, oreSmokeFree: 24 * 30 }).map((b) => b.id);
    expect(id).toContain('mese-smoke-free');
  });

  test('ogni badge ha id univoco e titolo', () => {
    expect(new Set(BADGE.map((b) => b.id)).size).toBe(BADGE.length);
    expect(BADGE.every((b) => b.titolo.length > 0)).toBe(true);
  });
});
