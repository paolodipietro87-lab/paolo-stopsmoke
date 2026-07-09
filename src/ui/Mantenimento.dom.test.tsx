// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import App from '../App';
import { db } from '../data/db';

const GIORNO = 1440 * 60_000;

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  cleanup();
  await db.close();
});

describe('modalita mantenimento', () => {
  test('mostra le ore pulite e non il countdown', async () => {
    await db.profile.add({
      nome: 'Paolo',
      dataInizio: Date.now() - 200 * GIORNO,
      sigaretteAlGiornoIniziali: 20,
      prezzoPacchetto: 5.5,
      incrementoGiornalieroMin: 10,
      mantenimento: true,
    });
    await db.smokes.add({ timestamp: Date.now() - 3 * GIORNO });

    render(<App />);
    await screen.findByText('Ciao Paolo.');

    expect(screen.getByText('Ore pulite')).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'HO FUMATO' })).toBeNull();
  });

  test('la ricaduta si registra senza cancellare lo storico', async () => {
    const utente = userEvent.setup();
    await db.profile.add({
      nome: 'Paolo',
      dataInizio: Date.now() - 200 * GIORNO,
      sigaretteAlGiornoIniziali: 20,
      prezzoPacchetto: 5.5,
      incrementoGiornalieroMin: 10,
      mantenimento: true,
    });
    await db.smokes.add({ timestamp: Date.now() - 3 * GIORNO });

    render(<App />);
    await screen.findByText('Ciao Paolo.');

    await utente.click(screen.getByRole('button', { name: 'Ho avuto una ricaduta' }));

    await waitFor(() => expect(screen.getByText(/Ricaduta registrata dopo 72 ore pulite/)).toBeTruthy());
    expect(await db.smokes.count()).toBe(2); // lo storico resta
  });
});
