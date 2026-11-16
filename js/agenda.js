const JSON_URL = "../Json/planning.json";
const STORAGE_AJOUTS = "2bis-planning-ajouts"; // C'est les élémeents de la page
const STORAGE_MODIFS = "2bis-planning-modifs"; // C'est les élémeents du JSON

// PLANNING_SECOURS est dans js/planning_secours.js (partagé avec la page Team)

const NOMS_JOURS = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday"
};

// Données en mémoire
let donnees = { personnel: [], jours: [], heures: [], planning: [] };
let ajouts = [];
let modifs = {};

let elementAffiche = null; // élément montré dans la bulle de détails
let enEdition = null;      // élément en cours de modif
let dernierFocus = null;

// Éléments de la page
const planningEl = document.getElementById("planning");
const upcomingEl = document.getElementById("upcoming");
const overlay = document.getElementById("overlay");
const form = document.getElementById("form-ajout");
const details = document.getElementById("details");
const btnAdd = document.getElementById("btn-add");
const btnModifier = document.getElementById("btn-modifier");
const btnSubmit = document.getElementById("btn-submit");
const formTitle = document.getElementById("bubble-title");
const selectJour = document.getElementById("select-jour");
const selectHeure = document.getElementById("select-heure");
const peopleList = document.getElementById("people-list");
const inputPersonne = document.getElementById("input-personne");
const btnPersonne = document.getElementById("btn-personne");
const formError = document.getElementById("form-error");

//Sauvegarde

function lire(cle, defaut) {
    try {
        return JSON.parse(localStorage.getItem(cle)) || defaut;
    } catch (e) {
        return defaut;
    }
}

function ecrire(cle, valeur) {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur));
    } catch (e) {
    }
}

function sauvegarder() {
    ecrire(STORAGE_AJOUTS, ajouts);
    ecrire(STORAGE_MODIFS, modifs);
}

function estAjout(id) {
    return ajouts.some((a) => a.id === id);
}

//Planning

function libelleType(type) {
    return type === "evenement" ? "Événement" : "Tâche";
}

function creerCarte(item) {
    const carte = document.createElement("article");
    carte.className = "shift " + item.type;
    carte.tabIndex = 0;
    carte.setAttribute("role", "button");
    carte.setAttribute("aria-label", libelleType(item.type) + " : " + item.titre + ", voir les détails");

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = item.heure + " · " + libelleType(item.type);

    const nom = document.createElement("p");
    nom.className = "name";
    nom.textContent = item.personnes.join(", ");

    const titre = document.createElement("p");
    titre.className = "titre";
    titre.textContent = item.titre;

    carte.append(meta, nom, titre);

    if (item.lieu) {
        const lieu = document.createElement("p");
        lieu.className = "place";
        lieu.textContent = "Lieu : " + item.lieu;
        carte.append(lieu);
    }

    if (estAjout(item.id)) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "delete";
        del.setAttribute("aria-label", "Supprimer " + item.titre);
        del.textContent = "×";
        del.addEventListener("click", (e) => {
            e.stopPropagation();
            ajouts = ajouts.filter((a) => a.id !== item.id);
            sauvegarder();
            afficherPlanning();
        });
        del.addEventListener("keydown", (e) => e.stopPropagation());
        carte.append(del);
    }

    carte.addEventListener("click", () => ouvrirDetails(item));
    carte.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            ouvrirDetails(item);
        }
    });

    return carte;
}
//Modif le Json par les version modifié
function tousLesElements() {
    return [...donnees.planning.map((i) => modifs[i.id] || i), ...ajouts];
}

function afficherPlanning() {
    planningEl.innerHTML = "";
    const tous = tousLesElements();

    donnees.jours.forEach((jour) => {
        const colonne = document.createElement("div");
        colonne.className = "day";

        const h2 = document.createElement("h2");
        h2.textContent = NOMS_JOURS[jour] || jour;
        colonne.append(h2);

        donnees.heures.forEach((heure) => {
            const slot = document.createElement("div");
            slot.className = "slot";
            tous
                .filter((item) => item.jour === jour && item.heure === heure)
                .forEach((item) => slot.append(creerCarte(item)));
            colonne.append(slot);
        });

        planningEl.append(colonne);
    });

    afficherProchains();
}

//Prochains événements

const NB_PROCHAINS = 5;
const MINUTES_SEMAINE = 7 * 24 * 60;
const ORDRE_JOURS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function minutesDansSemaine(jour, heure) {
    const [h, m] = heure.split(":").map(Number);
    return ORDRE_JOURS.indexOf(jour) * 1440 + h * 60 + m;
}

function libelleQuand(item, maintenant) {
    const ecartJours = (ORDRE_JOURS.indexOf(item.jour) - ORDRE_JOURS.indexOf(maintenant.jour) + 7) % 7;
    if (ecartJours === 0) {
        return item.attente < 1440 ? "Aujourd'hui" : "Next " + NOMS_JOURS[item.jour];
    }
    if (ecartJours === 1) return "Demain";
    return NOMS_JOURS[item.jour] || item.jour;
}

function afficherProchains() {
    const date = new Date();
    const maintenant = {
        jour: ORDRE_JOURS[(date.getDay() + 6) % 7],
        minutes: ((date.getDay() + 6) % 7) * 1440 + date.getHours() * 60 + date.getMinutes()
    };

    const prochains = tousLesElements()
        .map((item) => {
            let attente = minutesDansSemaine(item.jour, item.heure) - maintenant.minutes;
            if (attente < 0) attente += MINUTES_SEMAINE;
            return { ...item, attente };
        })
        .sort((a, b) => a.attente - b.attente)
        .slice(0, NB_PROCHAINS);

    upcomingEl.innerHTML = "";

    if (prochains.length === 0) {
        const vide = document.createElement("li");
        vide.className = "upcoming-empty";
        vide.textContent = "Aucun événement prévu.";
        upcomingEl.append(vide);
        return;
    }

    prochains.forEach((item) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "upcoming-item";

        const quand = document.createElement("div");
        quand.className = "upcoming-when";
        const jour = document.createElement("span");
        jour.className = "upcoming-day";
        jour.textContent = libelleQuand(item, maintenant);
        const heure = document.createElement("span");
        heure.className = "upcoming-hour";
        heure.textContent = item.heure;
        quand.append(jour, heure);

        const info = document.createElement("div");
        info.className = "upcoming-info";
        const titre = document.createElement("p");
        titre.className = "upcoming-titre";
        titre.textContent = item.titre;
        const sous = document.createElement("p");
        sous.className = "upcoming-sub";
        sous.textContent = item.personnes.join(", ") + (item.lieu ? " · " + item.lieu : "");
        info.append(titre, sous);

        const badge = document.createElement("span");
        badge.className = "badge " + item.type;
        badge.textContent = libelleType(item.type);

        btn.append(quand, info, badge);
        const { attente, ...original } = item;
        btn.addEventListener("click", () => ouvrirDetails(original));

        li.append(btn);
        upcomingEl.append(li);
    });
}

//Ouverture et fermeture des bulles 

function montrer(bulle) {
    if (overlay.hidden) dernierFocus = document.activeElement;
    form.hidden = bulle !== form;
    details.hidden = bulle !== details;
    overlay.hidden = false;
}

function fermerBulle() {
    overlay.hidden = true;
    form.hidden = true;
    details.hidden = true;
    enEdition = null;
    elementAffiche = null;
    if (dernierFocus && document.body.contains(dernierFocus)) dernierFocus.focus();
}

// Bulle (pas les modification, juste les detail)

function ouvrirDetails(item) {
    elementAffiche = item;

    const badge = document.getElementById("details-type");
    badge.textContent = libelleType(item.type);
    badge.className = "badge " + item.type;

    document.getElementById("details-titre").textContent = item.titre;

    const desc = document.getElementById("details-desc");
    desc.textContent = item.description || "Aucune description.";
    desc.classList.toggle("vide", !item.description);

    document.getElementById("details-jour").textContent = NOMS_JOURS[item.jour] || item.jour;
    document.getElementById("details-heure").textContent = item.heure;
    document.getElementById("details-lieu").textContent = item.lieu || "—";

    const personnes = document.getElementById("details-personnes");
    personnes.innerHTML = "";
    item.personnes.forEach((nom) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = nom;
        personnes.append(chip);
    });

    montrer(details);
    btnModifier.focus();
}

//Bulle ajout et modif)

function remplirSelects() {
    selectJour.innerHTML = "";
    donnees.jours.forEach((jour) => selectJour.add(new Option(NOMS_JOURS[jour] || jour, jour)));

    selectHeure.innerHTML = "";
    donnees.heures.forEach((heure) => selectHeure.add(new Option(heure, heure)));
}

function trouverChip(nom) {
    return [...peopleList.querySelectorAll("input")].find(
        (input) => input.value.toLowerCase() === nom.toLowerCase()
    );
}

function ajouterChip(nom, coche) {
    const existant = trouverChip(nom);
    if (existant) {
        if (coche) existant.checked = true;
        return;
    }

    const label = document.createElement("label");
    label.className = "chip";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "personnes";
    input.value = nom;
    input.checked = coche;

    label.append(input, document.createTextNode(nom));
    peopleList.append(label);
}

function remplirPersonnes(cochees) {
    peopleList.innerHTML = "";
    const noms = new Set(donnees.personnel);
    tousLesElements().forEach((i) => i.personnes.forEach((p) => noms.add(p)));
    noms.forEach((nom) => ajouterChip(nom, false));
    cochees.forEach((nom) => ajouterChip(nom, true));
}

function ouvrirFormulaire(item) {
    enEdition = item || null;
    form.reset();
    formError.textContent = "";

    if (item) {
        formTitle.textContent = "Modifier";
        btnSubmit.textContent = "Enregistrer";
        form.elements.type.value = item.type;
        form.elements.titre.value = item.titre;
        form.elements.description.value = item.description || "";
        form.elements.jour.value = item.jour;
        form.elements.heure.value = item.heure;
        form.elements.lieu.value = item.lieu || "";
        remplirPersonnes(item.personnes);
    } else {
        formTitle.textContent = "Ajouter au planning";
        btnSubmit.textContent = "Ajouter au planning";
        remplirPersonnes([]);
    }

    montrer(form);
    form.elements.titre.focus();
}

function ajouterPersonne() {
    const nom = inputPersonne.value.trim();
    if (!nom) return;
    ajouterChip(nom, true);
    inputPersonne.value = "";
    inputPersonne.focus();
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const titre = data.get("titre").trim();
    const personnes = data.getAll("personnes");

    if (!titre) {
        formError.textContent = "Ajoute un titre.";
        return;
    }
    if (personnes.length === 0) {
        formError.textContent = "Sélectionne au moins une personne.";
        return;
    }

    const element = {
        id: enEdition ? enEdition.id : Date.now(),
        type: data.get("type"),
        titre: titre,
        description: data.get("description").trim(),
        jour: data.get("jour"),
        heure: data.get("heure"),
        lieu: data.get("lieu").trim(),
        personnes: personnes
    };

    if (!enEdition) {
        ajouts.push(element);
    } else if (estAjout(element.id)) {
        ajouts = ajouts.map((a) => (a.id === element.id ? element : a));
    } else {
        modifs[element.id] = element;
    }

    const modifie = enEdition !== null;
    sauvegarder();
    afficherPlanning();

    if (modifie) {
        enEdition = null;
        ouvrirDetails(element);
    } else {
        fermerBulle();
    }
});

btnAdd.addEventListener("click", () => ouvrirFormulaire(null));
btnModifier.addEventListener("click", () => ouvrirFormulaire(elementAffiche));
btnPersonne.addEventListener("click", ajouterPersonne);

document.querySelectorAll(".bubble-close").forEach((btn) => btn.addEventListener("click", fermerBulle));

inputPersonne.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        ajouterPersonne();
    }
});

overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fermerBulle();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) fermerBulle();
});


//Bouton "Programmer" de la page Team : agenda.html#menage ou agenda.html#cantine
const LIEUX_TEAM = {
    "#menage": "Chambres",
    "#cantine": "Cantine"
};

function ouvrirDepuisTeam() {
    const lieu = LIEUX_TEAM[location.hash];
    if (!lieu) return;
    ouvrirFormulaire(null);
    form.elements.lieu.value = lieu;
    history.replaceState(null, "", location.pathname); // pour ne pas rouvrir la bulle au rechargement
}

async function init() {
    // On ignore les données sauvegardées abîmées (évite un planning vide ou une erreur)
    const valide = (i) => i && typeof i.titre === "string" && Array.isArray(i.personnes);
    ajouts = lire(STORAGE_AJOUTS, []);
    if (!Array.isArray(ajouts)) ajouts = [];
    ajouts = ajouts.filter(valide);
    modifs = lire(STORAGE_MODIFS, {});
    if (typeof modifs !== "object" || Array.isArray(modifs)) modifs = {};
    Object.keys(modifs).forEach((id) => { if (!valide(modifs[id])) delete modifs[id]; });
    try {
        // Page ouverte en double-cliquant (file://) : le navigateur bloque fetch,
        // on passe directement à la copie de secours sans erreur dans la console.
        if (location.protocol === "file:") throw new Error("file://");
        const reponse = await fetch(JSON_URL);
        if (!reponse.ok) throw new Error(reponse.status);
        donnees = await reponse.json();
    } catch (err) {
        // fetch bloqué (file://) : on prend la copie de secours au lieu d'afficher une erreur
        if (location.protocol !== "file:") console.warn("planning.json non chargé, copie de secours utilisée :", err);
        donnees = PLANNING_SECOURS;
    }
    remplirSelects();
    afficherPlanning();
    ouvrirDepuisTeam();
    setInterval(afficherProchains, 60 * 1000); // mise à jour chaque minute
}

init();
