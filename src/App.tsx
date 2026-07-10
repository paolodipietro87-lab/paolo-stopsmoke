import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { leggiProfilo } from './data/db';
import { Acquisti } from './ui/Acquisti';
import { Dashboard } from './ui/Dashboard';
import { Impostazioni } from './ui/Impostazioni';
import { Onboarding } from './ui/Onboarding';
import { Salvadanaio } from './ui/Salvadanaio';
import { Statistiche } from './ui/Statistiche';
import { Traguardi } from './ui/Traguardi';
import { useAltezzaNav } from './ui/useAltezzaNav';

const SEZIONI = {
  oggi: { titolo: 'Oggi', componente: Dashboard },
  statistiche: { titolo: 'Statistiche', componente: Statistiche },
  traguardi: { titolo: 'Traguardi', componente: Traguardi },
  salvadanaio: { titolo: 'Multe', componente: Salvadanaio },
  acquisti: { titolo: 'Acquisti', componente: Acquisti },
  impostazioni: { titolo: 'Impostazioni', componente: Impostazioni },
} as const;

type Sezione = keyof typeof SEZIONI;

export default function App() {
  const profilo = useLiveQuery(() => leggiProfilo(), []);
  const [sezione, setSezione] = useState<Sezione>('oggi');

  if (profilo === undefined) return null; // IndexedDB in apertura
  if (!profilo) return <Onboarding onFatto={() => setSezione('oggi')} />;

  const Corrente = SEZIONI[sezione].componente;

  return (
    <>
      <Corrente />
      <Navigazione sezione={sezione} onCambia={setSezione} />
    </>
  );
}

/** Barra fissa in fondo. Separata da App perche il suo nodo va misurato al montaggio. */
function Navigazione({ sezione, onCambia }: { sezione: Sezione; onCambia: (s: Sezione) => void }) {
  const rif = useAltezzaNav<HTMLElement>();

  return (
    <nav className="navigazione" ref={rif}>
      {(Object.keys(SEZIONI) as Sezione[]).map((chiave) => (
        <button
          key={chiave}
          className={chiave === sezione ? 'navigazione__voce navigazione__voce--attiva' : 'navigazione__voce'}
          aria-current={chiave === sezione ? 'page' : undefined}
          onClick={() => onCambia(chiave)}
        >
          {SEZIONI[chiave].titolo}
        </button>
      ))}
    </nav>
  );
}
