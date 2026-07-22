/* ============================================================================
   data.js — Study Hub
   ----------------------------------------------------------------------------
   Rôle : la "source unique de vérité" de l'application (voir Partie 3 de la
   note d'architecture). Ce fichier ne touche JAMAIS au HTML. Il se contente :
     1. de définir la forme des données (matières > modules > tâches, sessions)
     2. de les charger/sauvegarder dans le localStorage du navigateur
     3. d'exposer des fonctions pour les lire et les modifier
     4. de recalculer automatiquement les pourcentages de progression

   Tous les autres fichiers (render.js, app.js, pomodoro.js, calendrier.js)
   passent par les fonctions exportées ici — aucun ne modifie l'état directement.
   ============================================================================ */

const STORAGE_KEY = "studyhub";

/* ----------------------------------------------------------------------------
   1. DONNÉES DE DÉPART
   Utilisées seulement la toute première fois, quand rien n'existe encore
   dans le localStorage. Servent aussi d'exemple pour voir l'app fonctionner
   immédiatement pendant le développement.
   ---------------------------------------------------------------------------- */

const donneesInitiales = {
  matieres: [
    {
      id: "mat-1",
      code: "CS-101",
      nom: "Maîtrise de JavaScript",
      description: "Structures de données avancées, closures et programmation asynchrone.",
      progres: 0, // recalculé automatiquement au premier chargement, voir plus bas
      modules: [
        {
          id: "mod-1-1",
          titre: "Module 1 : Fondamentaux ES6+",
          description: "Arrow functions, destructuring, spread operators, et syntaxe moderne.",
          progres: 0,
          taches: [
            { id: "t-1-1-1", titre: "1.1 Fonctions Fléchées en Profondeur", statut: "faite" },
            { id: "t-1-1-2", titre: "1.2 Déstructuration d'Objets & Tableaux", statut: "faite" },
            { id: "t-1-1-3", titre: "1.3 Promesses & Async/Await", statut: "a_faire" },
            { id: "t-1-1-4", titre: "1.4 Modules & Imports", statut: "a_faire" },
          ],
        },
        {
          id: "mod-1-2",
          titre: "Module 2 : Manipulation Avancée du DOM",
          description: "Événements, délégation et concepts du DOM virtuel.",
          progres: 0,
          taches: [
            { id: "t-1-2-1", titre: "2.1 Délégation d'Événements", statut: "a_faire" },
            { id: "t-1-2-2", titre: "2.2 Observer les Mutations du DOM", statut: "a_faire" },
          ],
        },
      ],
    },
    {
      id: "mat-2",
      code: "MATH-302",
      nom: "Calcul Avancé",
      description: "Intégrales multiples, théorèmes de Green, Stokes et divergence.",
      progres: 0,
      modules: [
        {
          id: "mod-2-1",
          titre: "Module 1 : Intégrales Multiples",
          description: "Intégrales doubles et triples, changement de variables.",
          progres: 0,
          taches: [
            { id: "t-2-1-1", titre: "1.1 Intégrales Doubles", statut: "faite" },
            { id: "t-2-1-2", titre: "1.2 Coordonnées Polaires", statut: "a_faire" },
            { id: "t-2-1-3", titre: "1.3 Intégrales Triples", statut: "a_faire" },
          ],
        },
      ],
    },
    {
      id: "mat-3",
      code: "CHEM-210",
      nom: "Chimie Organique",
      description: "Mécanismes de réaction, stéréochimie et synthèse moléculaire.",
      progres: 0,
      modules: [
        {
          id: "mod-3-1",
          titre: "Module 1 : Mécanismes Réactionnels",
          description: "Substitutions, additions et éliminations.",
          progres: 0,
          taches: [
            { id: "t-3-1-1", titre: "1.1 Substitution Nucléophile", statut: "a_faire" },
            { id: "t-3-1-2", titre: "1.2 Élimination E1 / E2", statut: "a_faire" },
          ],
        },
      ],
    },
  ],
  sessions: [], // { id, date: "YYYY-MM-DD", duree, type, matiereId, tacheId, label }
};

/* ----------------------------------------------------------------------------
   2. CHARGEMENT / SAUVEGARDE (localStorage)
   ---------------------------------------------------------------------------- */

let etat = null; // l'état vit en mémoire une fois chargé, pour éviter de relire
                  // le localStorage à chaque fonction

/** Charge l'état depuis le localStorage, ou utilise les données de départ
 *  si c'est la toute première visite. À appeler une fois, au démarrage. */
export function charger() {
  const brut = window.localStorage.getItem(STORAGE_KEY);
  if (brut) {
    try {
      etat = JSON.parse(brut);
    } catch {
      etat = structuredClone(donneesInitiales);
    }
  } else {
    etat = structuredClone(donneesInitiales);
  }
  // s'assure que les % affichés au premier lancement sont corrects
  etat.matieres.forEach(recalculerProgres);
  sauvegarder();
  return etat;
}

/** Réécrit l'état entier dans le localStorage. Appelée après chaque
 *  modification des données (voir toutes les fonctions d'écriture plus bas). */
function sauvegarder() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(etat));
}

/** Efface tout et repart des données d'exemple. Pratique pendant le
 *  développement ou pour un bouton "réinitialiser" côté utilisateur. */
export function reinitialiser() {
  etat = structuredClone(donneesInitiales);
  etat.matieres.forEach(recalculerProgres);
  sauvegarder();
  return etat;
}

/* ----------------------------------------------------------------------------
   3. CALCUL DES POURCENTAGES (la "remontée en cascade")
   Règle : tâche cochée → % du module recalculé → % de la matière recalculé.
   ---------------------------------------------------------------------------- */

function calculerProgresModule(module) {
  if (module.taches.length === 0) return 0;
  const faites = module.taches.filter((t) => t.statut === "faite").length;
  return Math.round((faites / module.taches.length) * 100);
}

function calculerProgresMatiere(matiere) {
  if (matiere.modules.length === 0) return 0;
  const somme = matiere.modules.reduce((acc, m) => acc + m.progres, 0);
  return Math.round(somme / matiere.modules.length);
}

/** Recalcule le % de chaque module d'une matière, puis celui de la matière
 *  elle-même. À appeler après toute modification d'une tâche ou d'un module. */
function recalculerProgres(matiere) {
  matiere.modules.forEach((m) => (m.progres = calculerProgresModule(m))); // recalcule le % de chaque module
  matiere.progres = calculerProgresMatiere(matiere); // recalcule le % de la matière
}

/* ----------------------------------------------------------------------------
   4. GÉNÉRATION D'IDENTIFIANTS
   ---------------------------------------------------------------------------- */

function genId(prefixe) {
  return `${prefixe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ----------------------------------------------------------------------------
   5. LECTURE DES DONNÉES
   Fonctions "pures" : elles ne modifient jamais l'état, seulement le lire.
   ---------------------------------------------------------------------------- */

export function getEtat() {
  return etat;
}

export function getMatieres() {
  return etat.matieres;
}

export function getMatiere(matiereId) {
  return etat.matieres.find((m) => m.id === matiereId) || null;
}

export function getModule(matiereId, moduleId) {
  const matiere = getMatiere(matiereId);
  return matiere ? matiere.modules.find((m) => m.id === moduleId) || null : null;
}

export function getTache(matiereId, moduleId, tacheId) {
  const module = getModule(matiereId, moduleId);
  return module ? module.taches.find((t) => t.id === tacheId) || null : null;
}

export function getSessions() {
  return etat.sessions;
}

/** Renvoie toutes les sessions d'un jour donné, pour l'écran Calendrier.
 *  dateISO au format "YYYY-MM-DD". */
export function getSessionsPourDate(dateISO) {
  return etat.sessions.filter((s) => s.date === dateISO);
}

/* ----------------------------------------------------------------------------
   6. ÉCRITURE DES DONNÉES
   Chaque fonction modifie l'état, recalcule les % si nécessaire, puis
   sauvegarde. C'est la SEULE façon dont le reste de l'application doit
   modifier les données (jamais d'accès direct à `etat` depuis les autres
   fichiers).
   ---------------------------------------------------------------------------- */

/** Crée une nouvelle matière vide (0 module, 0 %), depuis la carte
 *  "Créer une archive" de la Bibliothèque. */
export function ajouterMatiere({ code, nom, description }) {
  const matiere = {
    id: genId("mat"),
    code: code || "",
    nom: nom || "Nouvelle matière",
    description: description || "",
    progres: 0,
    modules: [],
  };
  etat.matieres.push(matiere);
  sauvegarder();
  return matiere;
}

/** Modifie le nom/code/description d'une matière existante (bouton "Modifier"). */
export function modifierMatiere(matiereId, { code, nom, description }) {
  const matiere = getMatiere(matiereId);
  if (!matiere) return null;
  if (code !== undefined) matiere.code = code;
  if (nom !== undefined) matiere.nom = nom;
  if (description !== undefined) matiere.description = description;
  sauvegarder();
  return matiere;
}

/** Ajoute un module vide à une matière (bouton "Ajouter un module"). */
export function ajouterModule(matiereId, { titre, description }) {
  const matiere = getMatiere(matiereId);
  if (!matiere) return null;
  const module = {
    id: genId("mod"),
    titre: titre || "Nouveau module",
    description: description || "",
    progres: 0,
    taches: [],
  };
  matiere.modules.push(module);
  recalculerProgres(matiere);
  sauvegarder();
  return module;
}

/** Supprime un module (menu "⋮" > Supprimer). */
export function supprimerModule(matiereId, moduleId) {
  const matiere = getMatiere(matiereId);
  if (!matiere) return false;
  matiere.modules = matiere.modules.filter((m) => m.id !== moduleId);
  recalculerProgres(matiere);
  sauvegarder();
  return true;
}

/** Ajoute une tâche à un module, depuis le panneau "Ajout rapide de tâche"
 *  ou depuis la page d'une matière. Nouvelle tâche toujours "à faire". */
export function ajouterTache(matiereId, moduleId, titre) {
  const matiere = getMatiere(matiereId);
  const module = getModule(matiereId, moduleId);
  if (!matiere || !module || !titre) return null;
  const tache = { id: genId("t"), titre, statut: "a_faire" };
  module.taches.push(tache);
  recalculerProgres(matiere);
  sauvegarder();
  return tache;
}

/** Coche ou décoche une tâche, et fait remonter le recalcul en cascade
  jusqu'au % de la matière. */
export function basculerTache(matiereId, moduleId, tacheId) {
  const matiere = getMatiere(matiereId);
  const tache = getTache(matiereId, moduleId, tacheId);
  if (!matiere || !tache) return null;
  tache.statut = tache.statut === "faite" ? "a_faire" : "faite";
  recalculerProgres(matiere);
  sauvegarder();
  return tache;
}

/** Enregistre une session Pomodoro terminée. `matiereId` et `tacheId` sont
 *  optionnels : absents, la session est une "révision libre" (bouton
 *  "Commencer Focus" utilisé sans tâche précise). */
export function ajouterSession({ date, duree, type = "pomodoro", matiereId = null, tacheId = null }) {
  const matiere = matiereId ? getMatiere(matiereId) : null;
  const session = {
    id: genId("sess"),
    date, // format "YYYY-MM-DD"
    duree, // en minutes
    type, // "pomodoro" | "pause_courte" | "pause_longue"
    matiereId,
    tacheId,
    label: matiere ? matiere.nom : "Révision libre",
  };
  etat.sessions.push(session);
  sauvegarder();
  return session;
}
