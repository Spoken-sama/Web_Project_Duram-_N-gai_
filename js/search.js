// Barre de recherche commune à toutes les pages.
// 1. Si le texte correspond au nom d'une page (stock, agenda, team...), on y va.
// 2. Sinon la page peut gérer la recherche elle-même (événement "site-search", ex. stock.js).
// 3. Sinon on surligne et on fait défiler jusqu'au premier texte trouvé dans la page.
(function () {
    const PAGES = {
        "Home.html": ["home", "accueil", "offre", "offres", "hotel"],
        "stock.html": ["stock", "stocks", "inventaire"],
        "agenda.html": ["agenda", "planning", "horaire", "horaires", "staff"],
        "team.html": ["team", "equipe", "menage", "cantine", "personnel"],
        "about.html": ["about", "a propos", "apropos", "profil", "profile"]
    };

    const style = document.createElement("style");
    style.textContent =
        ".search-hit{outline:2px solid #8fd6ff;outline-offset:3px;border-radius:6px;animation:search-hit 1.6s ease}" +
        "@keyframes search-hit{0%,40%{background:rgba(143,214,255,.35)}100%{background:transparent}}" +
        ".search.no-result{box-shadow:0 0 0 2px #ffb4c0,0 4px 10px rgba(0,0,0,.35)}";
    document.head.append(style);

    function normaliser(texte) {
        return String(texte).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    }

    function pageActuelle() {
        return decodeURIComponent(location.pathname.split("/").pop() || "");
    }

    function trouverPage(q) {
        for (const [page, mots] of Object.entries(PAGES)) {
            if (mots.includes(q)) return page;
        }
        return null;
    }

    function surligner(q) {
        const main = document.querySelector("main");
        if (!main) return false;
        // éléments "feuilles" visibles dont le texte contient la recherche
        const candidats = [...main.querySelectorAll("h1,h2,h3,p,li,td,th,dd,span,article")]
            .filter((el) => el.offsetParent !== null && normaliser(el.textContent).includes(q))
            .filter((el, _, tous) => !tous.some((autre) => autre !== el && el.contains(autre)));
        if (candidats.length === 0) return false;

        document.querySelectorAll(".search-hit").forEach((el) => el.classList.remove("search-hit"));
        candidats.forEach((el) => {
            void el.offsetWidth; // relance l'animation si on recherche deux fois la même chose
            el.classList.add("search-hit");
        });
        candidats[0].scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => candidats.forEach((el) => el.classList.remove("search-hit")), 2500);
        return true;
    }

    document.querySelectorAll("form.search").forEach((form) => {
        const input = form.querySelector("input");
        if (!input) return;

        input.addEventListener("input", () => form.classList.remove("no-result"));

        form.addEventListener("submit", (e) => {
            e.preventDefault(); // sinon la page se recharge avec ?
            const brut = input.value.trim();
            const q = normaliser(brut);
            form.classList.remove("no-result");
            if (!q) return;

            const page = trouverPage(q);
            if (page) {
                if (page !== pageActuelle()) location.href = page;
                else window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }

            const evt = new CustomEvent("site-search", { detail: { texte: brut }, cancelable: true });
            if (!document.dispatchEvent(evt)) return; // la page a géré la recherche

            if (!surligner(q)) {
                form.classList.add("no-result");
                input.select();
            }
        });
    });
})();
