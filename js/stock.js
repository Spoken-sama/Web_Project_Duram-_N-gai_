const STOCK_URL = "../Json/stock.json";
const STORAGE_STOCK = "2bis-stock"; // tout le stock (lignes du JSON + ajouts + modifs)

// Copie de secours de Json/stock.json : utilisée seulement si fetch échoue
// (page ouverte en double-cliquant, en file://, le navigateur bloque fetch).
const STOCK_SECOURS = {
    zones: ["Chambres", "Réception", "Cantine", "Piscine", "Spa"],
    stock: [
        { id: 1, item: "Coussin", quantite: 20, zone: "Chambres", date: "2025-10-20" }
    ]
};

let stock = [];
let zones = [];
let filtre = "";
let tri = { cle: null, sens: 1 };
let enEdition = null;
let derniereSuppression = null; // { ligne, position } pour "Annuler"
let timerToast = null;
let dernierFocus = null;

// Éléments de la page
const tbody = document.getElementById("stock-body");
const compteur = document.getElementById("stock-count");
const inputFiltre = document.getElementById("filtre");
const overlay = document.getElementById("overlay");
const form = document.getElementById("form-stock");
const formTitle = document.getElementById("bubble-title");
const formError = document.getElementById("form-error");
const btnSubmit = document.getElementById("btn-submit");
const datalistZones = document.getElementById("liste-zones");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");

// Sauvegarde

function lireStock() {
    try {
        const brut = localStorage.getItem(STORAGE_STOCK);
        if (!brut) return null;
        const data = JSON.parse(brut);
        return Array.isArray(data) ? data : null;
    } catch (e) {
        return null;
    }
}

function sauvegarder() {
    try {
        localStorage.setItem(STORAGE_STOCK, JSON.stringify(stock));
    } catch (e) {
        // stockage plein ou désactivé : le tableau reste utilisable pendant la session
    }
}

// Outils

function normaliser(texte) {
    return String(texte).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "—";
    const [a, m, j] = iso.split("-");
    return j + "/" + m + "/" + a;
}

function aujourdhui() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function correspond(ligne) {
    if (!filtre) return true;
    const texte = normaliser([ligne.item, "x" + ligne.quantite, ligne.quantite, ligne.zone, formatDate(ligne.date)].join(" "));
    return filtre.split(/\s+/).every((mot) => texte.includes(mot));
}

function lignesAffichees() {
    const lignes = stock.filter(correspond);
    if (tri.cle) {
        lignes.sort((a, b) => {
            const va = a[tri.cle];
            const vb = b[tri.cle];
            if (typeof va === "number") return (va - vb) * tri.sens;
            return String(va).localeCompare(String(vb), "fr", { sensitivity: "base" }) * tri.sens;
        });
    }
    return lignes;
}

// Tableau

function creerBouton(classe, label, texte, action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = classe;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.textContent = texte;
    btn.addEventListener("click", action);
    return btn;
}

function creerLigne(ligne) {
    const tr = document.createElement("tr");
    tr.className = "objet";

    const cellules = [ligne.item, "x" + ligne.quantite, ligne.zone, formatDate(ligne.date)];
    cellules.forEach((valeur, i) => {
        const td = document.createElement("td");
        td.textContent = valeur;
        if (i === 1 && ligne.quantite === 0) td.classList.add("rupture");
        tr.append(td);
    });

    const actions = document.createElement("td");
    actions.className = "col-actions";
    actions.append(
        creerBouton("action", "Modifier " + ligne.item, "✎", () => ouvrirFormulaire(ligne)),
        creerBouton("action delete", "Supprimer " + ligne.item, "×", () => supprimer(ligne))
    );
    tr.append(actions);
    return tr;
}

function afficherStock() {
    const lignes = lignesAffichees();
    const fragment = document.createDocumentFragment();

    if (lignes.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "vide";
        td.textContent = stock.length === 0
            ? "Aucun article. Cliquez sur + pour en ajouter."
            : "Aucun article ne correspond au filtre.";
        tr.append(td);
        fragment.append(tr);
    } else {
        lignes.forEach((l) => fragment.append(creerLigne(l)));
    }

    tbody.replaceChildren(fragment);
    compteur.textContent = filtre
        ? lignes.length + " / " + stock.length + " article(s)"
        : stock.length + " article(s)";

    document.querySelectorAll(".sort").forEach((btn) => {
        const actif = btn.dataset.cle === tri.cle;
        btn.classList.toggle("actif", actif);
        btn.dataset.sens = actif ? (tri.sens === 1 ? "▲" : "▼") : "";
        btn.closest("th").setAttribute("aria-sort", actif ? (tri.sens === 1 ? "ascending" : "descending") : "none");
    });
}

function remplirZones() {
    const toutes = new Set(zones);
    stock.forEach((l) => l.zone && toutes.add(l.zone));
    datalistZones.replaceChildren(...[...toutes].map((z) => new Option(z, z)));
}

// Suppression + annulation

function supprimer(ligne) {
    const position = stock.findIndex((l) => l.id === ligne.id);
    if (position === -1) return;
    stock.splice(position, 1);
    derniereSuppression = { ligne, position };
    sauvegarder();
    afficherStock();
    montrerToast("« " + ligne.item + " » supprimé.");
}

function montrerToast(texte) {
    toastText.textContent = texte;
    toast.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(cacherToast, 5000);
}

function cacherToast() {
    toast.hidden = true;
    derniereSuppression = null;
}

document.getElementById("toast-undo").addEventListener("click", () => {
    if (!derniereSuppression) return;
    const { ligne, position } = derniereSuppression;
    stock.splice(Math.min(position, stock.length), 0, ligne);
    sauvegarder();
    afficherStock();
    clearTimeout(timerToast);
    cacherToast();
});

// Bulle ajout / modif

function ouvrirFormulaire(ligne) {
    enEdition = ligne || null;
    dernierFocus = document.activeElement;
    form.reset();
    formError.textContent = "";
    remplirZones();

    if (ligne) {
        formTitle.textContent = "Modifier l'article";
        btnSubmit.textContent = "Enregistrer";
        form.elements.article.value = ligne.item;
        form.elements.quantite.value = ligne.quantite;
        form.elements.zone.value = ligne.zone;
        form.elements.date.value = ligne.date;
    } else {
        formTitle.textContent = "Ajouter au stock";
        btnSubmit.textContent = "Ajouter au stock";
        form.elements.date.value = aujourdhui();
    }

    overlay.hidden = false;
    form.elements.article.focus();
}

function fermerBulle() {
    overlay.hidden = true;
    enEdition = null;
    if (dernierFocus && document.body.contains(dernierFocus)) dernierFocus.focus();
}

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const item = form.elements.article.value.trim();
    const zone = form.elements.zone.value.trim();
    const date = form.elements.date.value;
    const quantiteTexte = form.elements.quantite.value.trim();
    const quantite = Number(quantiteTexte);

    if (!item) {
        formError.textContent = "Ajoute un nom d'article.";
        form.elements.article.focus();
        return;
    }
    if (quantiteTexte === "" || !Number.isInteger(quantite) || quantite < 0 || quantite > 99999) {
        formError.textContent = "La quantité doit être un nombre entier entre 0 et 99999.";
        form.elements.quantite.focus();
        return;
    }
    if (!zone) {
        formError.textContent = "Indique la zone associée.";
        form.elements.zone.focus();
        return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        formError.textContent = "Choisis une date d'achat valide.";
        form.elements.date.focus();
        return;
    }

    if (enEdition) {
        const ligne = stock.find((l) => l.id === enEdition.id);
        if (ligne) Object.assign(ligne, { item, quantite, zone, date });
    } else {
        const id = Math.max(0, ...stock.map((l) => Number(l.id) || 0), Date.now());
        stock.push({ id, item, quantite, zone, date });
    }

    sauvegarder();
    afficherStock();
    fermerBulle();
});

// Événements

document.getElementById("btn-add").addEventListener("click", () => ouvrirFormulaire(null));
form.querySelector(".bubble-close").addEventListener("click", fermerBulle);

overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fermerBulle();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) fermerBulle();
});

inputFiltre.addEventListener("input", () => {
    filtre = normaliser(inputFiltre.value);
    afficherStock();
});

// La barre de recherche du haut filtre aussi le tableau
document.addEventListener("site-search", (e) => {
    inputFiltre.value = e.detail.texte;
    filtre = normaliser(e.detail.texte);
    afficherStock();
    e.preventDefault(); // indique à search.js que la page a géré la recherche
});

document.querySelectorAll(".sort").forEach((btn) => {
    btn.addEventListener("click", () => {
        if (tri.cle === btn.dataset.cle) {
            tri.sens = -tri.sens;
        } else {
            tri = { cle: btn.dataset.cle, sens: 1 };
        }
        afficherStock();
    });
});

// Démarrage

function nettoyer(liste) {
    return liste
        .filter((l) => l && typeof l.item === "string")
        .map((l, i) => ({
            id: l.id ?? i + 1,
            item: l.item,
            quantite: Math.max(0, parseInt(l.quantite, 10) || 0),
            zone: l.zone || "",
            date: l.date || ""
        }));
}

async function init() {
    let data = STOCK_SECOURS;
    try {
        // Page ouverte en double-cliquant (file://) : le navigateur bloque fetch,
        // on passe directement à la copie de secours sans erreur dans la console.
        if (location.protocol === "file:") throw new Error("file://");
        const reponse = await fetch(STOCK_URL);
        if (!reponse.ok) throw new Error(reponse.status);
        data = await reponse.json();
    } catch (err) {
        if (location.protocol !== "file:") console.warn("stock.json non chargé, copie de secours utilisée :", err);
    }
    zones = Array.isArray(data.zones) ? data.zones : [];

    const sauvegarde = lireStock();
    stock = nettoyer(sauvegarde || data.stock || []);

    afficherStock();
}

init();
