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

// Même logique que l'agenda : le JSON (remplacé par les versions modifiées) + les ajouts
function tousLesElements() {
    let ajouts = lire(STORAGE_AJOUTS, []);
    let modifs = lire(STORAGE_MODIFS, {});
    if (!Array.isArray(ajouts)) ajouts = [];
    if (typeof modifs !== "object" || Array.isArray(modifs)) modifs = {};

    const json = donnees.planning.map((i) => (valide(modifs[i.id]) ? modifs[i.id] : i));
    return [...json, ...ajouts].filter(valide);
}

//Rangement par service

function normaliser(texte) {
    return String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function serviceDe(item) {
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

function creerLigne(item, personne) {
    const { prenom, nom } = separerNom(personne);
    const tr = document.createElement("tr");
    tr.title = item.titre + (item.lieu ? " · " + item.lieu : "");

    [nom, prenom, (JOURS_FR[item.jour] || item.jour) + " " + item.heure, item.titre].forEach((valeur) => {
        const td = document.createElement("td");
        td.textContent = valeur;
        tr.append(td);
    });
    return tr;
}

function ligneVide(texte) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "vide";
    td.textContent = texte;
    tr.append(td);
    return tr;
}

function afficherTeam() {
    const lignes = { menage: [], cantine: [], autre: [] };

    tousLesElements()
        .sort((a, b) => ordre(a) - ordre(b))
        .forEach((item) => {
            item.personnes.forEach((personne) => {
                lignes[serviceDe(item)].push(creerLigne(item, personne));
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
    afficherTeam();
}

init();
