import { useEffect, useState } from 'react';
import { intervalloGiorno } from '../core/interval';
import { categoriaSgarro, messaggio } from '../core/messages';
import { annullaFumata, fuma } from '../data/actions';
import { salvaProfilo } from '../data/db';
import { Anello } from './Anello';
import { formattaEuro } from './format';
import { usePiano } from './usePiano';

const SECONDI_UNDO = 10;

export function Dashboard() {
  const v = usePiano();
  const [ultimaId, setUltimaId] = useState<number | null>(null);
  const [secondiUndo, setSecondiUndo] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (secondiUndo <= 0) return;
    const id = setTimeout(() => setSecondiUndo((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondiUndo]);

  if (v.caricamento || !v.profilo || !v.cfg || !v.stato || !v.prossima) return null;

  const { profilo, cfg, stato, prossima } = v;

  const intervalloOggi = intervalloGiorno(
    v.giornoCorrente,
    cfg.intervalloBaseMin,
    cfg.incrementoGiornalieroMin,
    stato.giorniCongelati,
  );
  const secondiMancanti = prossima.secondiMancanti;
  const progresso = prossima.scadenza === null ? 1 : 1 - secondiMancanti / (intervalloOggi * 60);
  const targetOggi = Math.max(0, Math.floor(1440 / intervalloOggi));

  async function haFumato() {
    const ora = Date.now();
    const esito = await fuma(ora, cfg);
    setUltimaId(esito.id);
    setSecondiUndo(SECONDI_UNDO);

    if (profilo.mantenimento) {
      // Ricaduta: niente azzeramento dello storico, il contatore riparte da solo.
      setFeedback(
        `Ricaduta registrata dopo ${Math.floor(v.oreSmokeFree)} ore pulite. Non cancella quello che hai fatto. Ricomincia adesso.`,
      );
      return;
    }

    setFeedback(
      esito.valutazione.sgarro
        ? `${messaggio(categoriaSgarro(esito.valutazione.minutiAnticipo), ora)} ${esito.valutazione.minutiAnticipo} minuti in anticipo. Multa: ${formattaEuro(esito.valutazione.multa)}.`
        : messaggio('timerRispettato', ora),
    );
  }

  const puoPassareAMantenimento = !profilo.mantenimento && intervalloOggi > 1440 && v.oreSmokeFree >= 24;

  async function annulla() {
    if (ultimaId === null) return;
    await annullaFumata(ultimaId);
    setUltimaId(null);
    setSecondiUndo(0);
    setFeedback('Registrazione annullata.');
  }

  if (profilo.mantenimento) {
    return (
      <main>
        <h1 className="saluto">Ciao {profilo.nome}.</h1>
        <p className="sottotitolo">{feedback || 'Mantenimento. Zero sigarette e la regola, non un traguardo.'}</p>
        <div className="griglia">
          <Scheda etichetta="Ore pulite" valore={String(Math.floor(v.oreSmokeFree))} />
          <Scheda etichetta="Giorni puliti" valore={String(Math.floor(v.oreSmokeFree / 24))} />
          <Scheda etichetta="Risparmiati" valore={formattaEuro(v.risparmioEuro)} />
          <Scheda
            etichetta="Multe da versare"
            valore={formattaEuro(v.multeDaVersareEuro)}
            allarme={v.multeDaVersareEuro > 0}
          />
        </div>
        <br />
        <button className="pulsante-secondario" onClick={haFumato}>
          Ho avuto una ricaduta
        </button>
        {secondiUndo > 0 && (
          <div className="barra-undo">
            <span>Registrata. Annulli entro {secondiUndo}s?</span>
            <button className="pulsante-secondario" onClick={annulla}>
              Annulla
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1 className="saluto">Ciao {profilo.nome}.</h1>
      <p className="sottotitolo">{feedback || riepilogoGiornata(v.sigaretteOggi, v.sgarriOggi, targetOggi)}</p>

      {puoPassareAMantenimento && (
        <div className="riepilogo">
          Intervallo oltre le 24 ore e un giorno intero senza fumare. Il piano di riduzione e finito.
          <br />
          <button className="pulsante-secondario" onClick={() => salvaProfilo({ ...profilo, mantenimento: true })}>
            Passa al mantenimento
          </button>
        </div>
      )}

      <Anello
        progresso={progresso}
        secondiMancanti={secondiMancanti}
        puoiFumare={prossima.puoiFumare}
        credito={prossima.credito}
        sgarroOggi={v.sgarriOggi > 0}
      />

      <button className="pulsante-primario" onClick={haFumato}>
        HO FUMATO
      </button>

      {secondiUndo > 0 && (
        <div className="barra-undo">
          <span>Registrata. Annulli entro {secondiUndo}s?</span>
          <button className="pulsante-secondario" onClick={annulla}>
            Annulla
          </button>
        </div>
      )}

      <div className="griglia">
        <Scheda etichetta="Oggi" valore={`${v.sigaretteOggi} / ${targetOggi}`} />
        <Scheda etichetta="Sgarri oggi" valore={String(v.sgarriOggi)} allarme={v.sgarriOggi > 0} />
        <Scheda etichetta="Streak pulita" valore={`${v.streak} gg`} />
        <Scheda etichetta="Intervallo" valore={`${intervalloOggi} min`} />
        <Scheda etichetta="Risparmiati" valore={formattaEuro(v.risparmioEuro)} />
        <Scheda
          etichetta="Multe da versare"
          valore={formattaEuro(v.multeDaVersareEuro)}
          allarme={v.multeDaVersareEuro > 0}
        />
        <Scheda etichetta="Scorta" valore={`${v.scorta} sig.`} />
        <Scheda etichetta="Credito" valore={`${prossima.credito} / 2`} />
      </div>
    </main>
  );
}

function Scheda({ etichetta, valore, allarme }: { etichetta: string; valore: string; allarme?: boolean }) {
  return (
    <div className={allarme ? 'scheda scheda--allarme' : 'scheda'}>
      <div className="scheda__etichetta">{etichetta}</div>
      <div className="scheda__valore">{valore}</div>
    </div>
  );
}

function riepilogoGiornata(fumate: number, sgarri: number, target: number): string {
  if (fumate === 0) return 'Nessuna sigaretta oggi. Tienila cosi.';
  if (sgarri === 0) return `${fumate} sigarette su ${target} previste. Nessuno sgarro.`;
  return `${fumate} sigarette, ${sgarri} ${sgarri === 1 ? 'sgarro' : 'sgarri'}. Domani il piano non cresce.`;
}
