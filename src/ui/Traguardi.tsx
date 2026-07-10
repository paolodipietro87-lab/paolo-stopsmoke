import { BADGE, ETICHETTA_FAMIGLIA, type FamigliaBadge } from '../core/badge';
import { TIMELINE_SALUTE, beneficiSbloccati, prossimoBeneficio } from '../core/salute';
import { usePiano } from './usePiano';

const ORDINE_FAMIGLIE: FamigliaBadge[] = [
  'streak',
  'disciplina',
  'costanza',
  'riduzione',
  'resistenza',
  'notturno',
  'redenzione',
  'risparmio',
  'salvadanaio',
  'tempo',
  'mantenimento',
];

export function Traguardi() {
  const v = usePiano();

  if (v.caricamento || !v.profilo || !v.datiBadge) return null;

  const dati = v.datiBadge;
  const sbloccati = new Set(BADGE.filter((b) => b.raggiunto(dati)).map((b) => b.id));
  const beneficiOk = new Set(beneficiSbloccati(v.oreSmokeFree).map((b) => b.id));
  const prossimo = prossimoBeneficio(v.oreSmokeFree);

  return (
    <main>
      <h1 className="saluto">Traguardi</h1>
      <p className="sottotitolo">
        Streak record: {v.streakMax} giorni. Ore senza fumare: {Math.floor(v.oreSmokeFree)}.
      </p>

      <h2 style={{ marginTop: '1.5rem' }}>Badge</h2>
      <p className="sottotitolo">
        {sbloccati.size} / {BADGE.length}
      </p>

      {ORDINE_FAMIGLIE.map((famiglia) => {
        const delGruppo = BADGE.filter((b) => b.famiglia === famiglia);
        if (delGruppo.length === 0) return null;
        return (
          <section key={famiglia}>
            <h3>{ETICHETTA_FAMIGLIA[famiglia]}</h3>
            <ul>
              {delGruppo.map((b) => (
                <li key={b.id} style={{ color: sbloccati.has(b.id) ? 'var(--verde)' : undefined }}>
                  {sbloccati.has(b.id) ? '✓' : '·'} <strong>{b.titolo}</strong> — {b.descrizione}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

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
