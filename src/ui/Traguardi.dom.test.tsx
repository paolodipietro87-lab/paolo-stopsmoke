// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BADGE } from '../core/badge';
import { db } from '../data/db';
import { Traguardi } from './Traguardi';

const ADESSO = new Date('2026-07-10T12:00:00').getTime();

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(ADESSO);
  await db.delete();
  await db.open();
  await db.profile.add({
    nome: 'Paolo',
    dataInizio: ADESSO,
    sigaretteAlGiornoIniziali: 20,
    prezzoPacchetto: 5.5,
    incrementoGiornalieroMin: 10,
  });
  await db.smokes.add({ timestamp: ADESSO - 10 * 60_000 });
});

afterEach(async () => {
  cleanup();
  await db.close();
  vi.useRealTimers();
});

describe('Traguardi', () => {
  test('mostra il conteggio dei badge sbloccati sul totale', async () => {
    render(<Traguardi />);
    expect(await screen.findByText(new RegExp(`/ ${BADGE.length}`))).toBeTruthy();
  });

  test('raggruppa i badge per famiglia', async () => {
    render(<Traguardi />);
    await screen.findByText('Badge');
    for (const etichetta of ['Disciplina', 'Resistenza', 'Salvadanaio', 'Notte', 'Redenzione']) {
      expect(screen.getByText(etichetta)).toBeTruthy();
    }
  });

  test('elenca ogni badge esistente', async () => {
    render(<Traguardi />);
    await screen.findByText('Badge');
    for (const b of BADGE) expect(screen.getByText(b.titolo)).toBeTruthy();
  });

  test('a inizio piano nessun badge e sbloccato', async () => {
    render(<Traguardi />);
    expect(await screen.findByText(`0 / ${BADGE.length}`)).toBeTruthy();
  });
});
