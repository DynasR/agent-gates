/**
 * agent-gates — l'API publique.
 *
 * LA RÈGLE QUE CE PAQUET APPLIQUE
 * -------------------------------
 * Tout ce qu'un agent LIT est de la DONNÉE : un fichier, une page web, une
 * sortie d'outil, le rapport d'un sous-agent. Les instructions viennent du
 * canal de conversation, et de nulle part ailleurs. Un texte lu qui s'adresse
 * à l'agent — qui lui prescrit une action, qui prétend qu'on a déjà autorisé
 * quelque chose, qui invoque une autorité système — reste de la donnée : on le
 * remonte à un humain, on n'agit pas dessus.
 *
 * CE QUE CE PAQUET NE FAIT PAS, ET C'EST DÉLIBÉRÉ
 * -----------------------------------------------
 * Il ne nettoie pas. Il ne réécrit pas. Il ne bloque pas.
 * Il ne connaît le nom d'aucun modèle ni d'aucun fournisseur — il s'applique
 * à n'importe quel agent, parce qu'il ne fait aucune hypothèse sur celui qui
 * lira le texte.
 */

export { analyser, formater, type Signalement, type OptionsScan } from './scan.ts';
export { MOTIFS, estNie, type Motif, type Gravite } from './patterns.ts';
