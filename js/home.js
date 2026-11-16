const DELAI_AUTO = 3000;
const carousel = document.getElementById("carousel");
const track = carousel.querySelector(".carousel-track");
const images = track.querySelectorAll("img");
const btnPrev = carousel.querySelector(".prev");
const btnNext = carousel.querySelector(".next");
const dotsEl = carousel.querySelector(".carousel-dots");

let index = 0;
let timer = null;

const dots = [...images].map((img, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", "Image " + (i + 1));
    dot.addEventListener("click", () => {
        allerA(i);
        relancer();
    });
    dotsEl.append(dot);
    return dot;
});

function allerA(i) {
    index = (i + images.length) % images.length;
    track.style.transform = "translateX(-" + index * 100 + "%)";
    dots.forEach((dot, j) => dot.setAttribute("aria-selected", j === index));
}

function demarrer() {
    clearInterval(timer);
    if (images.length > 1) timer = setInterval(() => allerA(index + 1), DELAI_AUTO);
}

function arreter() {
    clearInterval(timer);
}

function relancer() {
    arreter();
    demarrer();
}

btnPrev.addEventListener("click", () => {
    allerA(index - 1);
    relancer();
});

btnNext.addEventListener("click", () => {
    allerA(index + 1);
    relancer();
});
carousel.addEventListener("mouseenter", arreter);
carousel.addEventListener("mouseleave", demarrer);

carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") btnPrev.click();
    if (e.key === "ArrowRight") btnNext.click();
});

if (images.length < 2) {
    btnPrev.hidden = true;
    btnNext.hidden = true;
    dotsEl.hidden = true;
}

allerA(0);
demarrer();
