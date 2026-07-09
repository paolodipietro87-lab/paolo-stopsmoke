// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BannerAggiornamento } from './BannerAggiornamento';

afterEach(cleanup);

describe('BannerAggiornamento', () => {
  test('senza aggiornamento non mostra nulla', () => {
    const { container } = render(<BannerAggiornamento visibile={false} onAggiorna={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  test('con aggiornamento pronto mostra il banner', () => {
    render(<BannerAggiornamento visibile onAggiorna={() => {}} />);
    expect(screen.getByText(/nuova versione/i)).toBeTruthy();
  });

  test('il pulsante ricarica applica l aggiornamento', async () => {
    const utente = userEvent.setup();
    const onAggiorna = vi.fn();
    render(<BannerAggiornamento visibile onAggiorna={onAggiorna} />);

    await utente.click(screen.getByRole('button', { name: /aggiorna/i }));

    expect(onAggiorna).toHaveBeenCalledTimes(1);
  });
});
