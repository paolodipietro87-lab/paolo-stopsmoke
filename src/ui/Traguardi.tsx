import { useState } from 'react';
import { BADGE } from '../core/badge';
import { messaggio } from '../core/messages';
import { TIMELINE_SALUTE, beneficiSbloccati, prossimoBeneficio } from '../core/salute';
import { formattaEuro } from './format';
import { usePiano } from './usePiano';

export function Traguardi() {
  const v = usePiano();
  const [sos, setSos] = useState('');

  if (v.caricamento || !v.profilo) return null;

  const dati = {
    giorniPuliti: v.streak,
    streakMax: v.streakMax,
    risparmioEuro: v.risparmioEuro,
    sigaretteOggi: v.sigaretteOggi,
    sigaretteAlGiornoIniziali: v.profilo.sigaretteAlGiornoIniziali,
    oreSmokeFree: v.oreSmokeFree,
  };

  const sbloccati = new Set(BADGE.filter((b) => b.raggiunto(dati)).map((b) => b.id));
  const beneficiOk = new Set(beneficiSbloccati(v.oreSmokeFree).map((b) => b.id));
  const prossimo = prossimoBeneficio(v.oreSmokeFree);

  function craving() {
    setSos(
      `${messaggio('milestone', Date.now())} ${Math.floor(v.oreSmokeFree)} ore pulite. ` +
        `${formattaEuro(v.risparmioEuro)} risparmiati. Una sigaretta ora butta via tutto questo.`,
    );
  }

  return (
    <main>
      <h1 className="saluto">Traguardi</h1>
      <p className="sottotitolo">
        Streak record: {v.streakMax} giorni. Ore senza fumare: {Math.floor(v.oreSmokeFree)}.
      </p>

      <button className="pulsante-primario" onClick={craving}>
        SOS CRAVING
      </button>
      {sos && <div className="riepilogo" style={{ marginTop: '1rem' }}>{sos}</div>}

      <h2 style={{ marginTop: '1.5rem' }}>Badge</h2>
      <ul>
        {BADGE.map((b) => (
          <li key={b.id} style={{ color: sbloccati.has(b.id) ? 'var(--testo)' : undefined }}>
            {sbloccati.has(b.id) ? '✓' : '·'} <strong>{b.titolo}</strong> — {b.descrizione}
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: '1.5rem' }}>Salute</h2>
      <p className="sottotitolo">
        {prossimo
          ? `Prossimo beneficio a ${prossimo.quando} senza fumare: ${prossimo.testo}`
          : 'Timeline completa. Un anno pulito.'}
      </p>
      <ul>
        {TIMELINE_SALUTE.map((b) => (
          <li key={b.id} style={{ color: beneficiOk.has(b.id) ? 'var(--verde)' : undefined }}>
            {beneficiOk.has(b.id) ? '✓' : '·'} <strong>{b.quando}</strong> — {b.testo}
          </li>
        ))}
      </ul>
    </main>
  );
}
