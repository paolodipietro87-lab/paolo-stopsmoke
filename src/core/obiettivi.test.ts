import { describe, expect, test } from 'vitest';
import type { SigarettaValutata } from './engine';
import { obiettiviDelGiorno, POOL_OBIETTIVI, type StatoGiorno } from './obiettivi';

function sig(iso: string, extra: Partial<SigarettaValutata> = {}): SigarettaValutata {
  return {
    timestamp: new Date(iso).getTime(),
    giorno: 0,
    sgarro: false,
    usaCredito: false,
    minutiAnticipo: 0,
    multa: 0,
    ...extra,
  };
}

function stato(p: Partial<StatoGiorno> = {}): StatoGiorno {
  return { sigarette: [], targetOggi: 10, credito: 0, fineNotteOra: 7, giorno: '2026-07-10', ...p };
}

const ORA_MATTINA = new Date('2026-07-10T09:00:00').getTime();
const ORA_SERA = new Date('2026-07-10T23:30:00').getTime();

describe('obiettiviDelGiorno', () => {
  test('e deterministica: stesso giorno, stessi obiettivi', () => {
    const a = obiettiviDelGiorno('2026-07-10');
    const b = obiettiviDelGiorno('2026-07-10');
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
  });

  test('i due obiettivi di un giorno sono distinti', () => {
    for (const g of ['2026-07-10', '2026-07-11', '2026-01-01', '2026-12-31']) {
      const [x, y] = obiettiviDelGiorno(g);
      expect(x.id).not.toBe(y.id);
    }
  });

  test('non e costante: giorni diversi danno coppie diverse', () => {
    const coppie = new Set(
      ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'].map((g) =>
        obiettiviDelGiorno(g)
          .map((o) => o.id)
          .join('+'),
      ),
    );
    expect(coppie.size).toBeGreaterThan(1);
  });

  test('il pool ha almeno 10 obiettivi con id univoci', () => {
    expect(POOL_OBIETTIVI.length).toBeGreaterThanOrEqual(10);
    expect(new Set(POOL_OBIETTIVI.map((o) => o.id)).size).toBe(POOL_OBIETTIVI.length);
  });
});

function esitoDi(id: string, g: StatoGiorno, ora: number) {
  const o = POOL_OBIETTIVI.find((x) => x.id === id);
  if (!o) throw new Error(`obiettivo ${id} assente dal pool`);
  return o.esito(g, ora);
}

describe('niente-sgarri-prima-di-mezzogiorno', () => {
  const id = 'niente-sgarri-mattina';
  test('fallito appena arriva uno sgarro mattutino', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { sgarro: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso finche e mattina e non ci sono sgarri', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito dopo mezzogiorno senza sgarri mattutini', () => {
    const g = stato({ sigarette: [sig('2026-07-10T14:00:00', { sgarro: true })] });
    expect(esitoDi(id, g, ORA_SERA)).toBe('riuscito');
  });
});

describe('giornata-senza-sgarri', () => {
  const id = 'giornata-senza-sgarri';
  test('fallito al primo sgarro', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { sgarro: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso a giornata aperta', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a giornata finita', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('riuscito');
  });
});

describe('matura-un-credito', () => {
  const id = 'matura-un-credito';
  test('riuscito col credito disponibile', () => {
    expect(esitoDi(id, stato({ credito: 1 }), ORA_MATTINA)).toBe('riuscito');
  });
  test('riuscito anche se il credito e gia stato speso', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { usaCredito: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('riuscito');
  });
  test('in corso senza credito, a giornata aperta', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('fallito a giornata finita senza credito', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('fallito');
  });
});

describe('sotto-il-target', () => {
  const id = 'sotto-il-target';
  test('fallito appena si supera il target', () => {
    const g = stato({ targetOggi: 2, sigarette: [sig('2026-07-10T08:00:00'), sig('2026-07-10T09:00:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso sotto il target a giornata aperta', () => {
    expect(esitoDi(id, stato({ targetOggi: 5 }), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a giornata finita sotto il target', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato({ targetOggi: 5 }), mezzanotte)).toBe('riuscito');
  });
});

describe('niente-fumo-prima-delle-nove', () => {
  const id = 'niente-fumo-prima-delle-nove';
  test('fallito con una sigaretta alle 8', () => {
    const g = stato({ sigarette: [sig('2026-07-10T08:00:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('riuscito dalle 9 in poi se nessuna prima', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('riuscito');
  });
  test('in corso prima delle 9', () => {
    const alba = new Date('2026-07-10T07:30:00').getTime();
    expect(esitoDi(id, stato(), alba)).toBe('in-corso');
  });
});

describe('niente-fumo-dopo-le-22', () => {
  const id = 'niente-fumo-dopo-le-22';
  test('fallito con una sigaretta alle 23', () => {
    const g = stato({ sigarette: [sig('2026-07-10T23:00:00')] });
    expect(esitoDi(id, g, ORA_SERA)).toBe('fallito');
  });
  test('in corso durante il giorno', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a mezzanotte senza sigarette serali', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('riuscito');
  });
});

describe('meta-del-target', () => {
  const id = 'meta-del-target';
  test('fallito superata la meta del target', () => {
    const g = stato({ targetOggi: 4, sigarette: [sig('2026-07-10T08:00:00'), sig('2026-07-10T09:00:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso sotto la meta', () => {
    expect(esitoDi(id, stato({ targetOggi: 4 }), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a giornata finita', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato({ targetOggi: 4 }), mezzanotte)).toBe('riuscito');
  });
});

describe('nessuna-sigaretta-col-credito', () => {
  const id = 'nessuna-sigaretta-col-credito';
  test('fallito se una sigaretta consuma il credito', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { usaCredito: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso a giornata aperta', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a mezzanotte', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('riuscito');
  });
});

describe('prima-ora-sveglio-pulita', () => {
  const id = 'prima-ora-sveglio-pulita';
  test('fallito fumando entro un ora dalla fine della notte', () => {
    const g = stato({ sigarette: [sig('2026-07-10T07:30:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('riuscito passata quell ora', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('riuscito');
  });
  test('in corso dentro la finestra', () => {
    const presto = new Date('2026-07-10T07:20:00').getTime();
    expect(esitoDi(id, stato(), presto)).toBe('in-corso');
  });
});

describe('regressione: giornoFinito non dipende dal millisecondo esatto', () => {
  test('daDifendere non violato e riuscito a qualunque ora del giorno dopo', () => {
    const orarioQualunque = new Date('2026-07-11T09:37:14.123').getTime();
    expect(esitoDi('giornata-senza-sgarri', stato(), orarioQualunque)).toBe('riuscito');
  });
  test('daConquistare non raggiunto e fallito a qualunque ora del giorno dopo', () => {
    const orarioQualunque = new Date('2026-07-11T09:37:14.123').getTime();
    expect(esitoDi('matura-un-credito', stato(), orarioQualunque)).toBe('fallito');
  });
});

describe('credito-pieno-a-fine-giornata', () => {
  const id = 'credito-pieno-a-fine-giornata';
  test('riuscito col credito a 2', () => {
    expect(esitoDi(id, stato({ credito: 2 }), ORA_SERA)).toBe('riuscito');
  });
  test('in corso col credito basso a giornata aperta', () => {
    expect(esitoDi(id, stato({ credito: 0 }), ORA_MATTINA)).toBe('in-corso');
  });
  test('fallito a mezzanotte col credito basso', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato({ credito: 1 }), mezzanotte)).toBe('fallito');
  });
});
