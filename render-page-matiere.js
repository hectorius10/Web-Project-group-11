
import { getMatiere, getModule, getTache, basculerTache, ajouterTache } from "./data.js";

let moduleOuvertId = null; // un seul module déplié à la fois

// Paramètres d'estimation de l'échéance (à ajuster / brancher sur les
// vraies sessions Pomodoro une fois la Personne 4 raccordée)
const DUREE_MOYENNE_TACHE_H = 1.5;
const HEURES_TRAVAIL_PAR_JOUR = 1.5;

/* ---------- 1. Affichage principal de la page matière ---------- */

export function afficherPageMatiere(matiereId) {
  const matiere = getMatiere(matiereId);
  const conteneur = document.getElementById("vue-matiere");
  if (!matiere || !conteneur) return;

  conteneur.innerHTML = `
    <div class="entete-matiere">
      <div>
        <span class="code-matiere">${matiere.code}</span>
        <h2>${matiere.nom}</h2>
        <p class="description-matiere">${matiere.description}</p>
      </div>
      <button id="btn-ajout-rapide" class="btn-secondaire">+ Ajouter une tâche</button>
    </div>

    <div id="resume-matiere"></div>

    <div id="liste-modules"></div>

    <div id="panneau-ajout-rapide" class="panneau cache"></div>
  `;

  afficherResumeMatiere(matiere);
  afficherModules(matiere);

  document
    .getElementById("btn-ajout-rapide")
    .addEventListener("click", () => afficherPanneauAjoutRapide(matiere));
}

/* ---------- 2. Modules dépliables ---------- */

function afficherModules(matiere) {
  const liste = document.getElementById("liste-modules");
  liste.innerHTML = matiere.modules.map((module) => creerHtmlModule(module)).join("");
  liste.addEventListener("click", (e) => gererClicModules(e, matiere), { once: true });
}

function creerHtmlModule(module) {
  const ouvert = module.id === moduleOuvertId;

  return `
    <div class="carte-module" data-module-id="${module.id}">
      <div class="entete-module" data-action="toggle-module">
        <span class="chevron">${ouvert ? "▾" : "▸"}</span>
        <div class="infos-module">
          <span class="titre-module">${module.titre}</span>
          <span class="description-module">${module.description}</span>
        </div>
        <div class="barre-progression">
          <div class="barre-progression-remplissage" style="width:${module.progres}%"></div>
        </div>
        <span class="pourcentage">${module.progres}%</span>
      </div>

      <div class="corps-module ${ouvert ? "" : "cache"}">
        ${module.taches.map((tache) => creerHtmlTache(module, tache)).join("")}
      </div>
    </div>
  `;
}

function creerHtmlTache(module, tache) {
  const faite = tache.statut === "faite";
  return `
    <label class="ligne-tache ${faite ? "tache-faite" : ""}">
      <input
        type="checkbox"
        data-action="toggle-tache"
        data-module-id="${module.id}"
        data-tache-id="${tache.id}"
        ${faite ? "checked" : ""}
      />
      <span class="titre-tache">${tache.titre}</span>
    </label>
  `;
}

/* ---------- 3. Gestion des clics (toggle module / toggle tâche) ---------- */

function gererClicModules(e, matiere) {
  const cibleModule = e.target.closest("[data-action='toggle-module']");
  const cibleTache = e.target.closest("[data-action='toggle-tache']");

  if (cibleModule) {
    const idModule = cibleModule.closest(".carte-module").dataset.moduleId;
    moduleOuvertId = moduleOuvertId === idModule ? null : idModule;
    afficherModules(matiere);
    return;
  }

  if (cibleTache) {
    const idModule = cibleTache.dataset.moduleId;
    const idTache = cibleTache.dataset.tacheId;
    gererBasculeTache(matiere, idModule, idTache);
  }
}

function gererBasculeTache(matiere, idModule, idTache) {
  basculerTache(matiere.id, idModule, idTache); // data.js recalcule + sauvegarde
  afficherResumeMatiere(matiere);
  afficherModules(matiere);
}

/* ---------- 4. Panneau "ajout rapide de tâche" ---------- */

function afficherPanneauAjoutRapide(matiere) {
  const panneau = document.getElementById("panneau-ajout-rapide");
  panneau.classList.remove("cache");

  const optionsModules = matiere.modules
    .map((m) => `<option value="${m.id}">${m.titre}</option>`)
    .join("");

  panneau.innerHTML = `
    <h3>Ajouter une tâche</h3>
    <select id="select-module-ajout">${optionsModules}</select>
    <input id="input-titre-tache" type="text" placeholder="Titre de la tâche" />
    <div class="actions-panneau">
      <button id="btn-confirmer-ajout" class="btn-principal">Ajouter</button>
      <button id="btn-annuler-ajout" class="btn-secondaire">Annuler</button>
    </div>
  `;

  document.getElementById("btn-confirmer-ajout").addEventListener("click", () => {
    ajouterTacheRapide(matiere);
  });
  document.getElementById("btn-annuler-ajout").addEventListener("click", () => {
    panneau.classList.add("cache");
    panneau.innerHTML = "";
  });
}

function ajouterTacheRapide(matiere) {
  const idModule = document.getElementById("select-module-ajout").value;
  const titre = document.getElementById("input-titre-tache").value.trim();

  if (!titre) {
    alert("Merci d'indiquer un titre pour la tâche.");
    return;
  }

  ajouterTache(matiere.id, idModule, titre); // data.js recalcule + sauvegarde

  document.getElementById("panneau-ajout-rapide").classList.add("cache");
  afficherResumeMatiere(matiere);
  afficherModules(matiere);
}

/* ---------- 5. Bloc résumé (progression, tâches restantes, échéance) ---------- */

function afficherResumeMatiere(matiere) {
  const conteneur = document.getElementById("resume-matiere");
  if (!conteneur) return;

  const matiereFraiche = getMatiere(matiere.id); // relit l'état à jour
  const tachesRestantes = compterTachesRestantes(matiereFraiche);
  const echeance = estimerDateEcheance(tachesRestantes);

  conteneur.innerHTML = `
    <div class="bloc-resume">
      <div class="resume-item">
        <span class="resume-valeur">${matiereFraiche.progres}%</span>
        <span class="resume-label">Progression globale</span>
      </div>
      <div class="resume-item">
        <span class="resume-valeur">${tachesRestantes}</span>
        <span class="resume-label">Tâche${tachesRestantes > 1 ? "s" : ""} restante${tachesRestantes > 1 ? "s" : ""}</span>
      </div>
      <div class="resume-item">
        <span class="resume-valeur">${echeance}</span>
        <span class="resume-label">Échéance estimée</span>
      </div>
    </div>
  `;
}

function compterTachesRestantes(matiere) {
  return matiere.modules.reduce(
    (total, module) => total + module.taches.filter((t) => t.statut !== "faite").length,
    0
  );
}

function estimerDateEcheance(tachesRestantes) {
  if (tachesRestantes === 0) return "Terminé";

  const heuresRestantes = tachesRestantes * DUREE_MOYENNE_TACHE_H;
  const joursNecessaires = Math.ceil(heuresRestantes / HEURES_TRAVAIL_PAR_JOUR);

  const date = new Date();
  date.setDate(date.getDate() + joursNecessaires);

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
