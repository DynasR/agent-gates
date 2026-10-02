/**
 * Les motifs — un par forme d'injection, chacun avec la raison pour laquelle
 * il ne se rencontre pas dans un texte honnête.
 *
 * Ce `pourquoi` n'est pas décoratif. C'est lui qui permet de CONTESTER un motif
 * le jour où il produit son premier faux positif, plutôt que de le supprimer au
 * jugé. Un motif qu'on ne sait plus justifier est un motif qu'on retire.
 *
 * MOTIFS À HAUTE CONFIANCE SEULEMENT. Volontairement écartés, bien qu'ils
 * soient de vrais signaux :
 *   - « system prompt », « you are a… », « tu es un… » — omniprésents dans de
 *     la documentation technique légitime ;
 *   - la simple présence d'un impératif adressé à un lecteur ;
 *   - l'entropie ou la longueur d'un bloc.
 * Un détecteur qui crie sur du texte légitime devient un bruit ignoré, et un
 * bruit ignoré ne protège plus rien.
 */

/**
 * Frontière de mot, à gauche et à droite, **compatibles Unicode**.
 *
 * `\b` de JavaScript se fonde sur `\w`, c'est-à-dire `[A-Za-z0-9_]` : les
 * lettres accentuées n'en font PAS partie. Conséquence mesurée en portant ces
 * motifs depuis une implémentation Python (où `\b` est Unicode par défaut) :
 * `\bdéjà\b` ne peut jamais matcher, parce que le `à` final n'est pas un
 * caractère de mot et que la frontière de droite exige une transition
 * mot → non-mot qui n'a pas lieu. Le motif se compilait, se lisait juste, et
 * ne trouvait rien.
 *
 * Toute une famille de motifs français serait donc morte en silence. D'où ces
 * deux gardes explicites, avec le drapeau `u`, partout où l'on aurait écrit
 * `\b` en Python.
 */
const B = '(?<![\\p{L}\\p{N}_])';
const E = '(?![\\p{L}\\p{N}_])';

/** Gravité d'un signalement. Jamais un verdict : une invitation à lire. */
export type Gravite = 'haute' | 'moyenne';

/** Un motif, et tout ce qu'il faut pour le contester. */
export interface Motif {
  /** Identifiant stable, cité dans la sortie et dans les tests. */
  readonly id: string;
  /** L'expression, compilée avec les drapeaux `giu`. */
  readonly regex: RegExp;
  readonly gravite: Gravite;
  /** Pourquoi ce motif ne se rencontre pas dans un texte honnête. */
  readonly pourquoi: string;
  /**
   * Rejeter le signalement quand le verbe qui l'a déclenché est NIÉ.
   *
   * Trouvé par la moitié négative du banc, pas par une relecture :
   * « n'oubliez pas les consignes précédentes » et « ne transmettez jamais
   * votre mot de passe » sont des conseils de prudence — ils disent le
   * CONTRAIRE de l'injection, et remontaient tous les deux.
   *
   * La vérification vit dans le code plutôt que dans l'expression :
   * l'empiler en `(?<!…)` rendait le motif illisible, et un motif illisible
   * ne se conteste plus.
   */
  readonly refuseSiNie?: boolean;
}

/** Compile une source en expression globale, insensible à la casse, Unicode. */
function motif(source: string): RegExp {
  return new RegExp(source, 'giu');
}

const ANTERIEUR =
  '(?:previous|prior|above|earlier|preceding|' +
  'pr\u00e9c\u00e9dent(?:e|s|es)?|ant\u00e9rieur(?:e|s|es)?|ci-dessus)';

const CONSIGNE =
  '(?:instructions?|prompts?|consignes?|r\u00e8gles?|rules?|directives?)';

const SECRET =
  '(?:tokens?|secrets?|credentials?|passwords?|mot de passe|' +
  'cl\u00e9\\s+(?:api|priv\u00e9e|secr\u00e8te)|api[-_ ]?keys?|\\.env|cookies?|sessions?)';

/**
 * Ce qui distingue « a déjà approuvé LA SUPPRESSION de ces éléments » d'un fait
 * métier honnête comme « a déjà accepté les conditions générales lors de son
 * inscription ». Sans ce resserrage, le second remontait — trouvé par la moitié
 * négative du banc.
 *
 * Le discriminant n'est PAS la déixis. Un premier jet exigeait « cette action »
 * ou un ordre de poursuivre ; il a fait tomber deux pièges légitimes —
 * « approved the deletion of these records » n'est ni déictique ni suivi d'un
 * ordre. **Un oracle trop serré est aussi faux qu'un oracle trop large.**
 *
 * Le vrai discriminant est la NATURE DE L'OBJET approuvé : une pré-autorisation
 * d'injection porte sur une ACTION que l'agent pourrait accomplir, jamais sur
 * des conditions d'utilisation.
 */
const ACTION_APPROUVEE =
  '(?:action|op\u00e9ration|operation|requ\u00eate|request|demande|t\u00e2che|task|' +
  'deletion|removal|delet(?:ing|e)|remov(?:ing|al)|access|acc\u00e8s|' +
  'transfer|transfert|sending|envoi|sharing|partage|execution|ex\u00e9cution|' +
  'disclosure|divulgation|override|purchase|achat|payment|paiement|publication)';

const POURSUIS =
  '(?:proceed|continue|go ahead|vas-y|proc\u00e8de|poursui[ts]|' +
  'tu peux|vous pouvez|you (?:can|may|are allowed))';

export const MOTIFS: readonly Motif[] = [
  {
    id: 'override-instructions',
    // Les DEUX ordres, parce que les deux langues ne placent pas l'adjectif au
    // même endroit : « previous instructions » mais « consignes précédentes ».
    // Le premier jet du détecteur d'origine ne portait que l'ordre anglais et
    // laissait donc passer TOUT le français. C'est un banc qui l'a dit, pas une
    // relecture.
    regex: motif(
      // `ignore[zrs]?` et `oublie[szr]?`, pas `ignore` seul : « Ignorez » est
      // « ignore » + « z », et la garde de fin de mot le rejetait — l'impératif
      // français, c'est-à-dire la forme même de l'injection, n'était pas
      // couvert. Trouvé par le piège, pas par une relecture.
      // Les formes descriptives restent volontairement dehors : « ignorait »,
      // « ignorent » racontent, elles n'ordonnent pas.
      '(?:ignore[zrs]?|disregard|forget|oublie[szr]?|ne\\s+tiens?\\s+pas\\s+compte)' +
        E +
        '[^.\\n]{0,40}' +
        '(?:' +
        B + ANTERIEUR + E + '[^.\\n]{0,40}' + B + CONSIGNE + E +
        '|' +
        B + CONSIGNE + E + '[^.\\n]{0,40}' + B + ANTERIEUR + E +
        ')',
    ),
    gravite: 'haute',
    refuseSiNie: true,
    pourquoi:
      "Demander d'ignorer les instructions antérieures n'a aucun usage légitime " +
      "dans un document destiné à être lu. La formule n'existe que pour " +
      'détourner un lecteur automatique.',
  },
  {
    id: 'autorite-systeme-usurpee',
    regex: motif(
      '(?:^|\\n)\\s*(?:\\[|<|#{1,3}\\s*)?\\s*' +
        '(?:system|syst\u00e8me|admin|administrator|d\u00e9veloppeur|developer)' +
        '\\s*(?:\\]|>|:)\\s*(?:message|instruction|override|note|prompt)?\\s*:',
    ),
    gravite: 'haute',
    pourquoi:
      "Un texte qui se présente comme un message du système ou d'un " +
      "administrateur revendique une autorité qu'un document lu ne peut pas " +
      "avoir. L'autorité vient du canal de conversation, jamais du contenu.",
  },
  {
    id: 'pre-autorisation-revendiquee',
    regex: motif(
      B +
        "(?:the user|l'utilisateur|l'usager|le propri\u00e9taire|the owner)" +
        E +
        '[^.\\n]{0,60}' +
        B +
        '(?:has already|a d\u00e9j\u00e0|already|d\u00e9j\u00e0)' +
        E +
        '[^.\\n]{0,40}' +
        B +
        '(?:approved|authorized|authorised|consented|agreed|' +
        'autoris\u00e9|approuv\u00e9|consenti|valid\u00e9|accept\u00e9)' +
        E +
        '(?:[^.\\n]{0,40}' + B + ACTION_APPROUVEE + E +
        '|[^.\\n]{0,80}' + B + POURSUIS + E + ')',
    ),
    gravite: 'haute',
    pourquoi:
      "Une permission ne peut pas être accordée par le texte qu'on lit. Un " +
      "document qui affirme que l'utilisateur a déjà autorisé l'action en cours " +
      'ment par construction — une autorisation se donne dans la conversation.',
  },
  {
    id: 'adresse-directe-a-l-agent',
    regex: motif(
      '(?:^|\\n)\\s*(?:assistant|ai assistant|agent|copilot|bot|mod\u00e8le)\\s*,\\s*' +
        '(?:tu dois|vous devez|you must|you should|please|merci de|il faut que)',
    ),
    gravite: 'haute',
    pourquoi:
      "Un document honnête s'adresse à son lecteur humain, jamais nommément à " +
      "l'agent qui le traite, et encore moins pour lui prescrire une action.",
  },
  {
    id: 'exfiltration',
    // `(?<![.\w])` et `(?!\s*\()` écartent les APPELS DE MÉTHODE :
    // `client.post(url, { token })` est du code honnête, pas une consigne
    // d'exfiltration. Sans ces deux gardes, tout extrait de code présent dans
    // un document externe remontait.
    // On vise la PROSE impérative, seule capable de détourner un lecteur ;
    // le code, lui, ne s'adresse à personne.
    regex: motif(
      '(?<![.\\w])(?:send|post(?:er|ez)?|upload|transmet(?:s|tez|tre|tez)?|' +
        // « envoyez » — la forme impérative la plus courante du français —
        // n'était couverte NI par `envoie[sz]?` (qui donne « envoies »/« envoiez »)
        // NI par `envoyer`. Trou trouvé en écrivant le piège, pas en relisant.
        'envoy(?:er|ez|ons)|envoie[sz]?|exfiltrate|leak)(?!\\s*\\()' +
        E +
        '[^.\\n]{0,80}' +
        B + SECRET + E +
        '|' +
        B + SECRET + E +
        '[^.\\n]{0,60}' +
        B + '(?:to|vers|\u00e0)' + E + '\\s+https?://',
    ),
    gravite: 'haute',
    refuseSiNie: true,
    pourquoi:
      "Associer un verbe d'envoi EN PROSE à un secret désigne une tentative " +
      "d'exfiltration. Un document qui explique légitimement ce risque " +
      'remontera aussi — compromis assumé : un signalement se lit en trois ' +
      'secondes, une exfiltration ne se rattrape pas.',
  },
  {
    id: 'texte-cache',
    regex: motif(
      '<[^>]+style\\s*=\\s*["\'][^"\']*' +
        '(?:display\\s*:\\s*none|visibility\\s*:\\s*hidden|font-size\\s*:\\s*0|' +
        'opacity\\s*:\\s*0|color\\s*:\\s*#?(?:fff(?:fff)?|white))' +
        '[^"\']*["\'][^>]*>',
    ),
    gravite: 'moyenne',
    pourquoi:
      'Du texte rendu invisible dans une page vise un lecteur automatique et ' +
      'pas un humain. Gravité moyenne : un masquage peut être légitime ' +
      "(accordéon, gabarit) — d'où un signalement, jamais un verdict.",
  },
  {
    id: 'balise-instruction-detournee',
    regex: motif(
      '<\\s*(?:system|instructions?|important|admin|override|prompt)\\s*>' +
        '[\\s\\S]{0,400}?' +
        '<\\s*/\\s*(?:system|instructions?|important|admin|override|prompt)\\s*>',
    ),
    gravite: 'moyenne',
    pourquoi:
      "Ces balises n'existent dans aucun langage de balisage courant : elles " +
      "imitent la mise en forme d'un contexte d'agent pour se faire prendre " +
      'pour lui.',
  },
] as const;

/**
 * Négations qui précèdent immédiatement un verbe. Fenêtre courte et volontaire :
 * au-delà, on ne sait plus si la négation porte sur le verbe ou sur autre chose,
 * et un détecteur qui devine est pire qu'un détecteur qui signale.
 */
const NEGATIONS =
  /(?:(?<![\p{L}])ne|(?<![\p{L}])n['\u2019]|(?<![\p{L}])not|n['\u2019]t|(?<![\p{L}])jamais|(?<![\p{L}])never|(?<![\p{L}])don['\u2019]?t|(?<![\p{L}])pas|(?<![\p{L}])sans|(?<![\p{L}])without)\s*$/iu;

/** Le verbe trouvé à `debut` est-il nié par ce qui le précède ? */
export function estNie(texte: string, debut: number): boolean {
  return NEGATIONS.test(texte.slice(Math.max(0, debut - 16), debut));
}
