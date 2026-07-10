// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  test('a mezzanotte oggi avanza da solo, senza sbloccare il futuro', async () => {
    vi.setSystemTime(new Date('2026-07-10T23:59:30').getTime());
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');
    expect(screen.getByRole('button', { name: 'Giorno successivo' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Vai al giorno').getAttribute('max')).toBe('2026-07-10');

    // Attraversa la mezzanotte: v.ora (da usePiano) tocca ogni secondo, quindi
    // "oggi" deve avanzare da solo senza bisogno di un rerender esterno.
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    // Il giorno mostrato e ancora quello di ieri (l'utente non ha navigato),
    // ma "oggi" e ormai l'11: il pulsante avanti deve essersi sbloccato
    // perche il giorno mostrato non e piu quello corrente.
    expect(screen.getByText('ven 10 luglio 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Giorno successivo' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByLabelText('Vai al giorno').getAttribute('max')).toBe('2026-07-11');

    // Navigando avanti si arriva al vero giorno corrente: li il pulsante deve
    // tornare disabilitato, non trattare l'11 come se fosse ancora futuro.
    fireEvent.click(screen.getByRole('button', { name: 'Giorno successivo' }));

    expect(screen.getByText('sab 11 luglio 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Giorno successivo' }).hasAttribute('disabled')).toBe(true);
  });
});
