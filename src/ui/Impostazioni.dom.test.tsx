// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import App from '../App';
import { db } from '../data/db';
import { pausaAttiva } from '../data/pauseActions';
import { VERSIONE } from '../version';

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

describe('Impostazioni', () => {
  test('si raggiunge dalla navigazione e mostra la pausa', async () => {
    const utente = userEvent.setup();
    render(<App />);
    await screen.findByText('Ciao Paolo.');

    await utente.click(screen.getByRole('button', { name: 'Impostazioni' }));
    expect(await screen.findByRole('button', { name: 'Metti in pausa' })).toBeTruthy();
  });

  test('mettere in pausa registra la pausa e cambia il pulsante', async () => {
    const utente = userEvent.setup();
    render(<App />);
    await screen.findByText('Ciao Paolo.');
    await utente.click(screen.getByRole('button', { name: 'Impostazioni' }));

    await utente.click(await screen.findByRole('button', { name: 'Metti in pausa' }));

    await waitFor(async () => expect(await pausaAttiva(Date.now())).not.toBeNull());
    expect(await screen.findByRole('button', { name: 'Riprendi il piano' })).toBeTruthy();
    expect(screen.getByText(/Piano in pausa da 0 giorni/)).toBeTruthy();
  });

  test('mostra la versione installata, per capire se il deploy e arrivato', async () => {
    const utente = userEvent.setup();
    render(<App />);
    await screen.findByText('Ciao Paolo.');
    await utente.click(screen.getByRole('button', { name: 'Impostazioni' }));

    expect(await screen.findByText(new RegExp(`Versione ${VERSIONE}`))).toBeTruthy();
  });

  test('riprendere il piano chiude la pausa', async () => {
    const utente = userEvent.setup();
    render(<App />);
    await screen.findByText('Ciao Paolo.');
    await utente.click(screen.getByRole('button', { name: 'Impostazioni' }));

    await utente.click(await screen.findByRole('button', { name: 'Metti in pausa' }));
    await utente.click(await screen.findByRole('button', { name: 'Riprendi il piano' }));

    await waitFor(async () => expect(await pausaAttiva(Date.now())).toBeNull());
  });
});
