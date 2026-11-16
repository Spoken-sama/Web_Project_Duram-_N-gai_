const JSON_URL = "../Json/planning.json";
const STORAGE_AJOUTS = "2bis-planning-ajouts"; // Les mêmes clés que agenda.js
const STORAGE_MODIFS = "2bis-planning-modifs"; // pour lire ce qui a été ajouté/modifié dans l'agenda

// PLANNING_SECOURS est dans js/planning_secours.js

const JOURS_FR = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche"
};
const ORDRE_JOURS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Un tableau par service : on range chaque créneau selon son lieu (ou son titre)
const SERVICES = {
    menage: document.getElementById("liste-menage"),
    cantine: document.getElementById("liste-cantine"),
    autre: document.getElementById("liste-autre")
};

let donnees = { planning: [] };

//Lecture des données

function lire(cle, defaut) {
    try {
        return JSON.parse(localStorage.getItem(cle)) || defaut;
    } catch (e) {
        return defaut;
    }
}

function valide(item) {
    return item && typeof item.titre === "string" && Array.isArray(item.personnes);
}

function lireAjouts() {
    const ajouts = lire(STORAGE_AJOUTS, []);
    return Array.isArray(ajouts) ? ajouts.filter(valide) : [];
}

function ecrireAjouts(ajouts) {
    try {
        localStorage.setItem(STORAGE_AJOUTS, JSON.stringify(ajouts));
    } catch (e) {
        // stockage plein ou désactivé
    }
}

// Même logique que l'agenda : le JSON (remplacé par les versions modifiées) + les ajouts
function tousLesElements() {
    const ajouts = lireAjouts();
    let modifs = lire(STORAGE_MODIFS, {});
    if (typeof modifs !== "object" || Array.isArray(modifs)) modifs = {};

    const json = donnees.planning.map((i) => (valide(modifs[i.id]) ? modifs[i.id] : i));
    return [...json, ...ajouts].filter(valide);
}

//Rangement par service

function normaliser(texte) {
    return String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function serviceDe(item) {
    if (SERVICES[item.service]) return item.service; // ajouté depuis la page Team
    const texte = normaliser(item.lieu + " " + item.titre);
    if (texte.includes("cantine") || texte.includes("cuisine") || texte.includes("midi")) return "cantine";
    if (texte.includes("chambre") || texte.includes("menage") || texte.includes("nettoyage")) return "menage";
    return "autre";
}

// "Benjamin Durame" -> prénom "Benjamin", nom "Durame"
function separerNom(personne) {
    const morceaux = personne.trim().split(/\s+/);
    return {
        prenom: morceaux[0] || "",
        nom: morceaux.slice(1).join(" ") || "—"
    };
}

function ordre(item) {
    return ORDRE_JOURS.indexOf(item.jour) * 10000 + Number(item.heure.replace(":", ""));
}

//Affichage des tableaux

function creerLigne(item, personne, estAjout) {
    const { prenom, nom } = separerNom(personne);
    const tr = document.createElement("tr");
    tr.title = item.titre + (item.lieu ? " · " + item.lieu : "");

    [nom, prenom, (JOURS_FR[item.jour] || item.jour) + " " + item.heure, item.titre].forEach((valeur) => {
        const td = document.createElement("td");
        td.textContent = valeur;
        tr.append(td);
    });

    // On peut supprimer seulement ce qui a été ajouté (comme dans l'agenda)
    const actions = document.createElement("td");
    actions.className = "col-actions";
    if (estAjout) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "action delete";
        btn.textContent = "×";
        btn.title = "Retirer " + personne;
        btn.setAttribute("aria-label", "Retirer " + personne);
        btn.addEventListener("click", () => retirer(item.id, personne));
        actions.append(btn);
    }
    tr.append(actions);
    return tr;
}

function ligneVide(texte) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "vide";
    td.textContent = texte;
    tr.append(td);
    return tr;
}

function afficherTeam() {
    const lignes = { menage: [], cantine: [], autre: [] };

    const idsAjouts = new Set(lireAjouts().map((a) => a.id));

    tousLesElements()
        .sort((a, b) => ordre(a) - ordre(b))
        .forEach((item) => {
            item.personnes.forEach((personne) => {
                lignes[serviceDe(item)].push(creerLigne(item, personne, idsAjouts.has(item.id)));
            });
        });

    Object.keys(SERVICES).forEach((service) => {
        const tbody = SERVICES[service];
        if (!tbody) return;
        tbody.replaceChildren(...lignes[service]);
        if (lignes[service].length === 0) {
            tbody.append(ligneVide("Personne n'est programmé. Cliquez sur « Programmer »."));
        }
    });
}

//Ajout depuis la page Team

const overlay = document.getElementById("overlay");
const form = document.getElementById("form-team");
const formError = document.getElementById("form-error");

// Lieu proposé selon le service choisi (c'est ce que l'agenda affichera)
const LIEUX = {
    menage: "Chambres",
    cantine: "Cantine",
    autre: ""
};

let dernierFocus = null;

function remplirSelects() {
    const jours = donnees.jours && donnees.jours.length ? donnees.jours : ORDRE_JOURS.slice(0, 5);
    const heures = donnees.heures && donnees.heures.length ? donnees.heures : ["08:00", "12:00", "16:00"];
    form.elements.jour.replaceChildren(...jours.map((j) => new Option(JOURS_FR[j] || j, j)));
    form.elements.heure.replaceChildren(...heures.map((h) => new Option(h, h)));
}

function ouvrirFormulaire(service) {
    dernierFocus = document.activeElement;
    form.reset();
    formError.textContent = "";
    form.elements.service.value = service;
    form.elements.lieu.value = LIEUX[service];
    overlay.hidden = false;
    form.elements.prenom.focus();
}

function fermerBulle() {
    overlay.hidden = true;
    if (dernierFocus) dernierFocus.focus();
}

form.elements.service.addEventListener("change", () => {
    form.elements.lieu.value = LIEUX[form.elements.service.value];
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const prenom = data.get("prenom").trim();
    const nom = data.get("nom").trim();
    const lieu = data.get("lieu").trim();
    const forfait = data.get("forfait").trim();

    if (!prenom || !nom) {
        formError.textContent = "Ajoute le prénom et le nom.";
        return;
    }
    if (!lieu) {
        formError.textContent = "Indique le lieu (ex : Réception, Piscine…).";
        return;
    }
    if (!forfait) {
        formError.textContent = "Ajoute un forfait.";
        return;
    }

    // Même format qu'un ajout de l'agenda : il apparaît donc aussi dans l'agenda
    const element = {
        id: Date.now(),
        type: "tache",
        titre: forfait,
        description: "",
        jour: data.get("jour"),
        heure: data.get("heure"),
        lieu: lieu,
        personnes: [prenom + " " + nom],
        service: data.get("service")
    };

    const ajouts = lireAjouts();
    ajouts.push(element);
    ecrireAjouts(ajouts);
    afficherTeam();
    fermerBulle();
});

function retirer(id, personne) {
    let ajouts = lireAjouts();
    ajouts = ajouts
        .map((a) => (a.id === id ? { ...a, personnes: a.personnes.filter((p) => p !== personne) } : a))
        .filter((a) => a.personnes.length > 0); // créneau vide = supprimé
    ecrireAjouts(ajouts);
    afficherTeam();
}

document.querySelectorAll(".programmer").forEach((btn) => {
    btn.addEventListener("click", () => ouvrirFormulaire(btn.dataset.service));
});
form.querySelector(".bubble-close").addEventListener("click", fermerBulle);
overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fermerBulle();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) fermerBulle();
});

// Si l'agenda est ouvert dans un autre onglet, Team se met à jour tout seul
window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_AJOUTS || e.key === STORAGE_MODIFS) afficherTeam();
});

async function init() {
    try {
        // Page ouverte en double-cliquant (file://) : fetch est bloqué, on prend la copie de secours
        if (location.protocol === "file:") throw new Error("file://");
        const reponse = await fetch(JSON_URL);
        if (!reponse.ok) throw new Error(reponse.status);
        donnees = await reponse.json();
    } catch (err) {
        if (location.protocol !== "file:") console.warn("planning.json non chargé, copie de secours utilisée :", err);
        donnees = PLANNING_SECOURS;
    }
    remplirSelects();
    afficherTeam();
}

init();
