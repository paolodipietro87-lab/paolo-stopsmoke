import { formattaDurata } from './format';

const R = 88;
const CIRCONFERENZA = 2 * Math.PI * R;

interface Props {
  /** 0 = appena fumato, 1 = countdown scaduto. */
  progresso: number;
  secondiMancanti: number;
  puoiFumare: boolean;
  credito: number;
  /** Sgarro oggi: l'anello resta rosso fino a mezzanotte. */
  sgarroOggi: boolean;
}

/** Tacche di credito: quante sigarette puoi fumare subito senza penalita. */
function TaccheCredito({ credito }: { credito: number }) {
  return (
    <>
      {[0, 1].map((i) => (
        <circle
          key={i}
          cx={100 + (i === 0 ? -9 : 9)}
          cy={148}
          r={3.5}
          className={i < credito ? 'anello__credito' : 'anello__credito--vuoto'}
        />
      ))}
    </>
  );
}

export function Anello({ progresso, secondiMancanti, puoiFumare, credito, sgarroOggi }: Props) {
  const colore = sgarroOggi ? 'var(--rosso)' : puoiFumare ? 'var(--verde)' : 'var(--ambra)';
  const quota = Math.min(1, Math.max(0, progresso));

  return (
    <svg className="anello" viewBox="0 0 200 200" role="img" aria-label={etichettaAccessibile(puoiFumare, secondiMancanti)}>
      <circle className="anello__traccia" cx="100" cy="100" r={R} />
      <circle
        className="anello__progresso"
        cx="100"
        cy="100"
        r={R}
        stroke={colore}
        strokeDasharray={CIRCONFERENZA}
        strokeDashoffset={CIRCONFERENZA * (1 - quota)}
      />
      <text className="anello__tempo" x="100" y="103" textAnchor="middle">
        {puoiFumare ? 'ORA' : formattaDurata(secondiMancanti)}
      </text>
      <text className="anello__etichetta" x="100" y="122" textAnchor="middle">
        {puoiFumare ? 'PUOI FUMARE' : 'ALLA PROSSIMA'}
      </text>
      <TaccheCredito credito={credito} />
    </svg>
  );
}

function etichettaAccessibile(puoiFumare: boolean, secondi: number): string {
  return puoiFumare ? 'Puoi fumare' : `Mancano ${formattaDurata(secondi)} alla prossima sigaretta`;
}
