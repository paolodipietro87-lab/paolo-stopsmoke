// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App';
import { db } from '../data/db';

const ADESSO = new Date('2026-07-09T12:00:00').getTime();

beforeEach(async () => {
  // shouldAdvanceTime: le promise di Dexie devono comunque risolversi.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(ADESSO);
  await db.delete();
  await db.open();
  await db.profile.add({
    nome: 'Paolo',
    dataInizio: ADESSO,
    sigaretteAlGiornoIniziali: 20, // intervallo base: 72 min
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

describe('countdown della dashboard', () => {
  test('mostra i secondi, non solo i minuti', async () => {
    render(<App />);
    // 72 min di intervallo, 10 gia trascorsi: mancano 1:02:00 esatti.
    expect(await screen.findByLabelText('Mancano 1:02:00 alla prossima sigaretta')).toBeTruthy();
  });

  test('scala di un secondo alla volta', async () => {
    render(<App />);
    await screen.findByLabelText('Mancano 1:02:00 alla prossima sigaretta');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText('Mancano 1:01:59 alla prossima sigaretta')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByLabelText('Mancano 1:01:58 alla prossima sigaretta')).toBeTruthy();
  });
});

describe('SOS in dashboard', () => {
  test('la card Risparmiati non esiste piu', async () => {
    render(<App />);
    await screen.findByText('Scorta');
    expect(screen.queryByText('Risparmiati')).toBeNull();
  });

  test('il pulsante SOS e rosso ed evidente', async () => {
    render(<App />);
    const sos = await screen.findByRole('button', { name: 'SOS' });
    expect(sos.className).toContain('pulsante-sos');
  });

  test('SOS mostra i numeri crudi invece di registrare qualcosa', async () => {
    render(<App />);
    const primaDelClick = await db.smokes.count();

    fireEvent.click(await screen.findByRole('button', { name: 'SOS' }));

    expect(await screen.findByText(/risparmiati/i)).toBeTruthy();
    expect(screen.getByText(/ore pulite/i)).toBeTruthy();
    expect(await db.smokes.count()).toBe(primaDelClick);
  });
});
