// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '../App';
import { db } from '../data/db';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(async () => {
  cleanup(); // senza globals:true l'auto-cleanup non parte
  await db.close();
});

describe('flusso reale onboarding -> dashboard', () => {
  test('un nuovo utente completa l onboarding e vede il countdown', async () => {
    const utente = userEvent.setup();
    render(<App />);

    // Passo 1: nome
    await screen.findByText('Smoke Timer');
    await utente.type(screen.getByLabelText(/Come ti chiami/i), 'Paolo');
    await utente.click(screen.getByRole('button', { name: 'AVANTI' }));

    // Passo 2: consumo e prezzo (i default vanno bene)
    await utente.click(screen.getByRole('button', { name: 'AVANTI' }));

    // Passo 3: incremento
    expect(screen.getByText(/1 sigaretta ogni 72 minuti/)).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: 'AVANTI' }));

    // Passo 4: riepilogo e via
    expect(screen.getByText(/Si comincia/)).toBeTruthy();
    await utente.click(screen.getByRole('button', { name: 'INIZIA' }));

    // Dashboard: saluto e countdown avviato dall ultima sigaretta (adesso)
    await waitFor(() => expect(screen.getByText('Ciao Paolo.')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'HO FUMATO' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Mancano .* alla prossima sigaretta/ })).toBeTruthy();
    expect(await db.smokes.count()).toBe(1);
  });

  test('HO FUMATO subito dopo l inizio e uno sgarro con multa e undo', async () => {
    const utente = userEvent.setup();
    await db.profile.add({
      nome: 'Paolo',
      dataInizio: Date.now(),
      sigaretteAlGiornoIniziali: 20,
      prezzoPacchetto: 5.5,
      incrementoGiornalieroMin: 10,
    });
    await db.smokes.add({ timestamp: Date.now() - 10 * 60_000 }); // fumata 10 min fa

    render(<App />);
    await screen.findByText('Ciao Paolo.');

    await utente.click(screen.getByRole('button', { name: 'HO FUMATO' }));

    // Anticipo di ~62 minuti: sgarro pesante, multa = 2 sigarette = 0,55 EUR
    await waitFor(() => expect(screen.getByText(/Multa: 0,55 €/)).toBeTruthy());
    expect(await db.penalties.count()).toBe(1);

    await utente.click(screen.getByRole('button', { name: 'Annulla' }));
    await waitFor(async () => expect(await db.penalties.count()).toBe(0));
    expect(await db.smokes.count()).toBe(1);
  });
});

describe('spazio riservato alla barra di navigazione', () => {
  beforeEach(async () => {
    await db.profile.add({
      nome: 'Paolo',
      dataInizio: Date.now(),
      sigaretteAlGiornoIniziali: 20,
      prezzoPacchetto: 5.5,
      incrementoGiornalieroMin: 10,
    });
    await db.smokes.add({ timestamp: Date.now() - 10 * 60_000 });
  });

  test('pubblica l altezza reale della barra come variabile CSS', async () => {
    // La barra e fixed e va a capo su schermi stretti: la sua altezza non e nota
    // a priori. Senza questa misura, il fondo delle sezioni finisce sotto la barra.
    const nav = { offsetHeight: 117 };
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(nav.offsetHeight);

    render(<App />);
    await screen.findByText('Ciao Paolo.');

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--altezza-nav')).toBe('117px'),
    );
  });

  test('non esplode dove ResizeObserver non esiste', async () => {
    const originale = globalThis.ResizeObserver;
    // @ts-expect-error: simuliamo un ambiente senza ResizeObserver
    delete globalThis.ResizeObserver;

    render(<App />);
    expect(await screen.findByText('Ciao Paolo.')).toBeTruthy();

    globalThis.ResizeObserver = originale;
  });
});
