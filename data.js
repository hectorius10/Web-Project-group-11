const STORAGE_KEY = "studyhub"; // Stockage des données dans le localStorage

const donneesInitiales = {
  matieres: [
    {
      id: "mat-1",
      code: "CS-101",
      nom: "Maîtrise de JavaScript",
      description: "Structures de données avancées, closures et programmation asynchrone.",
      progres: 0,
      modules: [
        {
          id: "mod-1-1",
          titre: "Module 1 : Fondamentaux ES6+",
          description: "Arrow functions, destructuring, spread operators.",
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
    // ...
  ],
  sessions: [],
};

let etat = null; // État global de l'application

// Charge l'état depuis le localStorage
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
  
  etat.matieres.forEach(recalculerProgres);
  sauvegarder();
  return etat;
}

// Sauvegarde l'état actuel dans le localStorage
function sauvegarder() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(etat));
}

// Réinitialise l'état de l'application à son état initial
export function reinitialiser() {
  etat = structuredClone(donneesInitiales);
  etat.matieres.forEach(recalculerProgres);
  sauvegarder();
  return etat;
}

// === Calcul de progression (Tâche -> Module -> Matière) ===
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

function recalculerProgres(matiere) {
  matiere.modules.forEach((m) => (m.progres = calculerProgresModule(m)));
  matiere.progres = calculerProgresMatiere(matiere);
}

// Génère un ID unique pour les tâches, modules et matières
function genId(prefixe) {
  return `${prefixe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// === Getters ===
export function getEtat() { return etat; }
export function getMatieres() { return etat.matieres; }

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

export function getSessions() { return etat.sessions; }

export function getSessionsPourDate(dateISO) {
  return etat.sessions.filter((s) => s.date === dateISO);
}

// === Actions d'écriture ===
// Ajoute une matière à l'état
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

// Modifie les informations d'une matière
export function modifierMatiere(matiereId, { code, nom, description }) {
  const matiere = getMatiere(matiereId);
  if (!matiere) return null;
  if (code !== undefined) matiere.code = code;
  if (nom !== undefined) matiere.nom = nom;
  if (description !== undefined) matiere.description = description;
  sauvegarder();
  return matiere;
}

// Ajoute un module à une matière
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

// Supprime un module d'une matière
export function supprimerModule(matiereId, moduleId) {
  const matiere = getMatiere(matiereId);
  if (!matiere) return false;
  matiere.modules = matiere.modules.filter((m) => m.id !== moduleId);
  recalculerProgres(matiere);
  sauvegarder();
  return true;
}

// Ajoute une tâche à un module
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

// Bascule le statut d'une tâche entre "faite" et "à faire"
export function basculerTache(matiereId, moduleId, tacheId) {
  const matiere = getMatiere(matiereId);
  const tache = getTache(matiereId, moduleId, tacheId);
  if (!matiere || !tache) return null;
  tache.statut = tache.statut === "faite" ? "a_faire" : "faite";
  recalculerProgres(matiere);
  sauvegarder();
  return tache;
}

// Ajoute une session à l'état
export function ajouterSession({ date, duree, type = "pomodoro", matiereId = null, tacheId = null }) {
  const matiere = matiereId ? getMatiere(matiereId) : null;
  const session = {
    id: genId("sess"),
    date,
    duree,
    type,
    matiereId,
    tacheId,
    label: matiere ? matiere.nom : "Révision libre",
  };
  etat.sessions.push(session);
  sauvegarder();
  return session;
}