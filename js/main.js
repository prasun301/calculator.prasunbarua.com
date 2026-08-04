/* =====================================
   Engineering Calculator Website
   Main JavaScript
   Author: Prasun Barua
===================================== */

console.log(
    "%c⚡ Engineering Calculator %c\nSystem Initialized. Built by Prasun Barua.",
    "color:#1565c0;font-size:20px;font-weight:bold;",
    "color:#4b5563;font-size:12px;"
);

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================
       CALCULATOR DATABASE
    ===================================== */

    const calculators = [
    {
        id: "cable-size",
        title: "Cable Size Calculator",
        desc: "Calculate cable size based on current, cable length, installation method, and allowable voltage drop.",
        icon: "⚡",
        url: "/calculators/cable-size/"
    },
    {
        id: "voltage-drop",
        title: "Voltage Drop Calculator",
        desc: "Calculate AC/DC cable voltage drop based on current, cable size, and distance.",
        icon: "⚡",
        url: "/calculators/voltage-drop/"
    },
    {
        id: "solar-panel",
        title: "Solar Panel Calculator",
        desc: "Estimate solar PV system size, panel quantity, and expected daily energy generation.",
        icon: "☀️",
        url: "/calculators/solar-panel/"
    },

    /* Future calculators (currently unavailable) */

    {
        id: "battery-backup",
        title: "Battery Backup Calculator",
        desc: "Coming Soon",
        icon: "🔋",
        url: "#"
    },
    {
        id: "ohms-law",
        title: "Ohm's Law Calculator",
        desc: "Coming Soon",
        icon: "💡",
        url: "#"
    },
    {
        id: "inverter-sizing",
        title: "Inverter Sizing Calculator",
        desc: "Coming Soon",
        icon: "🔌",
        url: "#"
    }
];


    /* =====================================
       RENDER CALCULATOR CARDS
    ===================================== */

    const gridContainer = document.getElementById("calculator-grid");
    const noResultsMsg = document.getElementById("no-results");

    function renderCards(data) {

    if (!gridContainer) return;

    gridContainer.innerHTML = data.map(calc => `
        <a href="${calc.url}"
           class="card fade-in-scroll ${calc.url === '#' ? 'disabled-card' : ''}">

            <span class="icon">${calc.icon}</span>

            <h3>${calc.title}</h3>

            <p>${calc.desc}</p>

            ${calc.url === '#'
                ? '<span class="coming-soon">Coming Soon</span>'
                : ''
            }

        </a>
    `).join("");

    if (noResultsMsg) {
        if (data.length === 0) {
            noResultsMsg.classList.remove("hidden");
        } else {
            noResultsMsg.classList.add("hidden");
        }
    }

    // Observe newly created cards
    document.querySelectorAll(".fade-in-scroll").forEach(card => {
        observer.observe(card);
    });
}

renderCards(calculators);


    /* =====================================
       LIVE SEARCH
    ===================================== */

    const searchInput = document.getElementById("searchInput");

    if (searchInput) {

        searchInput.addEventListener("input", (e) => {

            const keyword = e.target.value.toLowerCase().trim();

            const filtered = calculators.filter(calc =>
                calc.title.toLowerCase().includes(keyword) ||
                calc.desc.toLowerCase().includes(keyword)
            );

            renderCards(filtered);

        });

    }


    /* =====================================
       MOBILE MENU
    ===================================== */

    const menuBtn = document.querySelector(".menu-btn");
    const nav = document.getElementById("main-nav");

    if (menuBtn && nav) {

        menuBtn.addEventListener("click", () => {

            nav.classList.toggle("nav-open");

            const expanded = nav.classList.contains("nav-open");

            menuBtn.setAttribute("aria-expanded", expanded);

            menuBtn.innerHTML = expanded ? "✕" : "☰";

        });

    }


    /* =====================================
       DARK MODE
    ===================================== */

    const themeToggle = document.getElementById("theme-toggle");
    const html = document.documentElement;

    if (themeToggle) {

        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {

            html.setAttribute("data-theme", "dark");
            themeToggle.textContent = "☀️";

        }

        themeToggle.addEventListener("click", () => {

            const current = html.getAttribute("data-theme");

            if (current === "dark") {

                html.setAttribute("data-theme", "light");
                localStorage.setItem("theme", "light");
                themeToggle.textContent = "🌙";

            } else {

                html.setAttribute("data-theme", "dark");
                localStorage.setItem("theme", "dark");
                themeToggle.textContent = "☀️";

            }

        });

    }


    /* =====================================
       SCROLL ANIMATION
    ===================================== */

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.1
    });

    document.querySelectorAll(".fade-in-scroll").forEach(card => {
        observer.observe(card);
    });

});
