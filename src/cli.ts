#!/usr/bin/env node
/**
 * Entrée en ligne de commande.
 *
 * Il ne balaie PAS un dépôt : on lui DÉSIGNE des chemins, ou on lui passe du
 * texte sur l'entrée standard. C'est un filtre d'ingestion, pas un verrou de
 * pre-push. Trois raisons, et la troisième est la vraie :
 *   1. le code d'un dépôt n'est pas de la matière externe ;
 *   2. un verrou qui crie sur du texte légitime devient un bruit ignoré ;
 *   3. un détecteur de motifs CONTIENT les motifs qu'il détecte — le lâcher
 *      sur son propre dépôt le ferait se signaler lui-même, avec son banc et
 *      sa documentation. Ça ne se règle pas par une liste d'exclusions (une
 *      liste en dur se périme au premier renommage) ; ça se supprime en ne
 *      lisant que ce qu'on désigne.
 *
 * Codes de sortie : 0 = rien trouvé · 1 = au moins un signalement · 2 = usage.
 * Le code 1 n'est pas un verdict de malveillance : c'est « un humain doit lire
 * ce passage avant qu'un agent agisse dessus ».
 */

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { analyser, formater, type Signalement } from './scan.ts';

const USAGE = `agent-gates — signale, dans de la matière externe, le texte qui se fait
passer pour une instruction adressée à l'agent qui le lit.

  agent-gates <fichier> [<fichier>…]
  cat page.html | agent-gates -
  agent-gates --json <fichier>

Il signale, il ne nettoie jamais.`;

async function lireEntreeStandard(): Promise<string> {
  const morceaux: Buffer[] = [];
  for await (const bloc of process.stdin) morceaux.push(Buffer.from(bloc));
  return Buffer.concat(morceaux).toString('utf8');
}

export async function main(argv: readonly string[]): Promise<number> {
  const json = argv.includes('--json');
  const chemins = argv.filter((a) => a !== '--json');

  if (chemins.length === 0 || chemins.includes('--help') || chemins.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    return chemins.length === 0 ? 2 : 0;
  }

  const tous: Signalement[] = [];
  for (const chemin of chemins) {
    if (chemin === '-') {
      tous.push(...analyser(await lireEntreeStandard()));
      continue;
    }
    try {
      const texte = await readFile(chemin, 'utf8');
      tous.push(...analyser(texte, { origine: chemin }));
    } catch {
      process.stderr.write(`agent-gates : illisible : ${chemin}\n`);
      return 2;
    }
  }

  process.stdout.write(json ? `${JSON.stringify(tous, null, 1)}\n` : `${formater(tous)}\n`);
  return tous.length > 0 ? 1 : 0;
}

const lance = process.argv[1] !== undefined && import.meta.url.endsWith('cli.ts');
if (lance) {
  process.exitCode = await main(process.argv.slice(2));
}
