// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import App from '../App';
import { db } from '../data/db';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.profile.add({
    nome: 'Paolo',
    dataInizio: Date.now(),
    sigaretteAlGiornoIniziali: 20,
    prezzoPacchetto: 5.5,
    incrementoGiornalieroMin: 10,
  });
  await db.smokes.add({ timestamp: Date.now() - 5 * 60_000 });
});

afterEach(async () => {
  cleanup();
  await db.close();
});

describe('backup Drive senza client id', () => {
  test('l app resta usabile e spiega perche Drive e disattivato', async () => {
    const utente = userEvent.setup();
    render(<App />);
    await screen.findByText('Ciao Paolo.');
    await utente.click(screen.getByRole('button', { name: 'Impostazioni' }));

    expect(await screen.findByText(/Backup Drive non configurato/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salva su Drive' })).toBeNull();
    // Export e import restano disponibili.
    expect(screen.getByRole('button', { name: 'Esporta JSON' })).toBeTruthy();
  });
});
