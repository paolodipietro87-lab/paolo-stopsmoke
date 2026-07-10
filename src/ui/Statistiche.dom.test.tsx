// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { db } from '../data/db';
import { Statistiche } from './Statistiche';

const OGGI = new Date('2026-07-10T12:00:00').getTime();
const GIORNO = 24 * 60 * 60_000;

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(OGGI);
  await db.delete();
  await db.open();
  await db.profile.add({
    nome: 'Paolo',
    dataInizio: OGGI - 2 * GIORNO,
    sigaretteAlGiornoIniziali: 20,
    prezzoPacchetto: 5.5,
    incrementoGiornalieroMin: 10,
  });
  // Due sigarette ieri, una oggi.
  await db.smokes.add({ timestamp: new Date('2026-07-09T09:00:00').getTime() });
  await db.smokes.add({ timestamp: new Date('2026-07-09T18:00:00').getTime() });
  await db.smokes.add({ timestamp: new Date('2026-07-10T08:00:00').getTime() });
});

afterEach(async () => {
  cleanup();
  await db.close();
  vi.useRealTimers();
});

describe('storico del giorno', () => {
  test('di default mostra solo il giorno corrente', async () => {
    render(<Statistiche />);
    expect(await screen.findByText('ven 10 luglio 2026')).toBeTruthy();
    expect(screen.getByText('1 fumata, nessuno sgarro')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Elimina' })).toHaveLength(1);
  });

  test('la freccia indietro mostra il giorno prima', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Giorno precedente' }));

    expect(screen.getByText('gio 9 luglio 2026')).toBeTruthy();
    expect(screen.getByText('2 fumate, nessuno sgarro')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Elimina' })).toHaveLength(2);
  });

  test('non si puo sfogliare il futuro', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');
    const avanti = screen.getByRole('button', { name: 'Giorno successivo' });
    expect(avanti.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Giorno precedente' }));
    expect(screen.getByRole('button', { name: 'Giorno successivo' }).hasAttribute('disabled')).toBe(false);
  });

  test('il date picker salta a una data qualsiasi', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');

    fireEvent.change(screen.getByLabelText('Vai al giorno'), { target: { value: '2026-07-09' } });

    expect(screen.getByText('gio 9 luglio 2026')).toBeTruthy();
  });

  test('un giorno senza sigarette lo dice', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');

    fireEvent.change(screen.getByLabelText('Vai al giorno'), { target: { value: '2026-07-08' } });

    expect(screen.getByText('Nessuna sigaretta. Giornata pulita.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Elimina' })).toBeNull();
  });
});
