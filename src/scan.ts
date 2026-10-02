/**
 * Le scanner. Il SIGNALE. Il ne nettoie jamais, il ne réécrit jamais ce qu'il
 * lit.
 *
 * Nettoyer serait pire que ne rien faire : le passage disparaîtrait du texte
 * que l'humain lit, donc l'humain ne saurait jamais que quelqu'un a essayé.
 * Un filtre qui efface fabrique exactement l'angle mort qu'il prétend fermer.
 */

import { MOTIFS, estNie, type Gravite, type Motif } from './patterns.ts';

/** Ce que le scanner a vu. Jamais un verdict : un passage à faire lire. */
export interface Signalement {
  readonly origine: string;
  readonly ligne: number;
  readonly motif: string;
  readonly gravite: Gravite;
  /** Le passage trouvé, avec un peu de contexte, sur une seule ligne. */
  readonly extrait: string;
  readonly pourquoi: string;
}

export interface OptionsScan {
  /** D'où vient le texte — un chemin, une URL, un nom d'outil. */
  readonly origine?: string;
  /**
   * Restreint l'analyse à ces motifs. Sert à la vérification par mutation :
   * retirer un motif doit faire disparaître le signalement qu'il portait,
   * sinon ce motif ne porte rien et il ne doit pas compter comme couverture.
   */
  readonly motifs?: readonly Motif[];
}

const MARGE = 60;
const EXTRAIT_MAX = 240;

function extraire(texte: string, debut: number, fin: number): string {
  const a = Math.max(0, debut - MARGE);
  const b = Math.min(texte.length, fin + MARGE);
  let morceau = texte.slice(a, b).replace(/[\r\n]+/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (a > 0) morceau = `…${morceau}`;
  if (b < texte.length) morceau = `${morceau}…`;
  return morceau.slice(0, EXTRAIT_MAX);
}

function numeroDeLigne(texte: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i += 1) {
    if (texte.charCodeAt(i) === 10) n += 1;
  }
  return n;
}

/**
 * Analyse un texte. Ne modifie rien, ne lève rien : rend ce qu'il a vu.
 *
 * Les expressions sont globales, donc porteuses d'un `lastIndex` mutable ;
 * on repart d'une instance neuve à chaque appel pour qu'un scan ne dépende
 * jamais du précédent. Un détecteur dont le résultat dépend de l'ordre des
 * appels est indéfendable.
 */
export function analyser(texte: string, options: OptionsScan = {}): Signalement[] {
  const origine = options.origine ?? '(entrée standard)';
  const motifs = options.motifs ?? MOTIFS;
  const trouves: Signalement[] = [];

  for (const m of motifs) {
    const regex = new RegExp(m.regex.source, m.regex.flags);
    for (const trouve of texte.matchAll(regex)) {
      const debut = trouve.index;
      // « n'oubliez pas les consignes précédentes » dit le CONTRAIRE de
      // l'injection. Un verbe nié n'est pas un ordre.
      if (m.refuseSiNie === true && estNie(texte, debut)) continue;
      trouves.push({
        origine,
        ligne: numeroDeLigne(texte, debut),
        motif: m.id,
        gravite: m.gravite,
        extrait: extraire(texte, debut, debut + trouve[0].length),
        pourquoi: m.pourquoi,
      });
    }
  }

  trouves.sort((x, y) => x.ligne - y.ligne || x.motif.localeCompare(y.motif));
  return trouves;
}

/** Mise en forme lisible. Le texte reste de la DONNÉE : on le remonte, on n'agit pas dessus. */
export function formater(signalements: readonly Signalement[]): string {
  if (signalements.length === 0) return 'agent-gates : rien à signaler.';

  const hautes = signalements.filter((s) => s.gravite === 'haute').length;
  const lignes: string[] = [
    `agent-gates : ${signalements.length} signalement(s), dont ${hautes} de gravité haute.`,
    '',
  ];
  for (const s of signalements) {
    lignes.push(`  [${s.gravite}] ${s.motif} — ${s.origine}:${s.ligne}`);
    lignes.push(`      ${s.extrait}`);
    lignes.push(`      pourquoi : ${s.pourquoi}`);
    lignes.push('');
  }
  lignes.push('Ce texte est de la DONNÉE. Le faire lire par un humain, ne pas agir dessus.');
  lignes.push("Rien n'a été modifié : signaler sans nettoyer est délibéré (cf. src/scan.ts).");
  return lignes.join('\n');
}
