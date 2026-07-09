type Props = {
  /** Un nuovo service worker e installato e in attesa. */
  visibile: boolean;
  onAggiorna: () => void;
};

export function BannerAggiornamento({ visibile, onAggiorna }: Props) {
  if (!visibile) return null;

  return (
    <div className="banner-aggiornamento" role="status">
      <span>Nuova versione pronta.</span>
      <button className="pulsante-secondario" onClick={onAggiorna}>
        Aggiorna
      </button>
    </div>
  );
}
