/* =====================================
   Engineering Calculator Website
   Main JavaScript Architecture
===================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. CALCULATOR DATABASE (Easy to scale to 500+)
    // ==========================================
    const calculators = [
        { 
            id: 'cable-size',
            title: "Cable Size Calculator", 
            desc: "Calculate cable size based on current, length, and allowable voltage drop.", 
            icon: "⚡",
            url: "#cable-size"
        },
        { 
            id: 'voltage-drop',
            title: "Voltage Drop Calculator", 
            desc: "Calculate voltage loss in AC/DC electrical cables over distance.", 
            icon: "⚡",
            url: "#voltage-drop"
        },
        { 
            id: 'solar-panel',
            title: "Solar Panel Calculator", 
            desc: "Estimate solar PV system size, array output, and energy generation.", 
            icon: "☀️",
            url: "#solar-panel"
        },
        { 
            id: 'battery-backup',
            title: "Battery Calculator", 
            desc: "Calculate required battery capacity (Ah) for off-grid backup systems.", 
            icon: "🔋",
            url: "#battery-backup"
        },
        { 
            id: 'ohms-law',
            title: "Ohm's Law Calculator", 
            desc: "Calculate Voltage, Current, Resistance, or Power instantly.", 
            icon: "💡",
            url: "#ohms-law"
        },
        { 
            id: 'inverter-sizing',
            title: "Inverter Sizing Calculator", 
            desc: "Determine the correct inverter size for your peak load requirements.", 
            icon: "☀️",
            url: "#inverter-sizing"
        }
        // Add hundreds more here...
    ];

    // ==========================================
    // 2. RENDER CALCULATORS TO DOM
    // ==========================================
    const gridContainer = document.getElementById('calculator-grid');
    const noResultsMsg = document.getElementById('no-results');

    function renderCards(data) {
        gridContainer.innerHTML = data.map(calc => `
            <a href="${calc.url}" class="card fade-in-scroll visible">
                <span class="icon">${calc.icon}</span>
                <h3>${calc.title}</h3>
                <p>${calc.desc}</p>
            </a>
        `).join('');

        // Toggle "No Results" message
        if(data.length === 0) {
            noResultsMsg.classList.remove('hidden');
        } else {
            noResultsMsg.classList.add('hidden');
        }
    }

    // Initial load
    renderCards(calculators);


    // ==========================================
    // 3. LIVE SEARCH FILTER
    // ==========================================
    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        const filteredData = calculators.filter(calc => 
            calc.title.toLowerCase().includes(searchTerm) || 
            calc.desc.toLowerCase().includes(searchTerm)
        );
        
        renderCards(filteredData);
    });


    // ==========================================
    // 4. MOBILE MENU TOGGLE
    // ==========================================
    const menuBtn = document.querySelector('.menu-btn');
    const nav = document.getElementById('main-nav');

    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('nav-open');
        const isExpanded = nav.classList.contains('nav-open');
        menuBtn.setAttribute('aria-expanded', isExpanded);
        // Change icon to X when open
        menuBtn.innerHTML = isExpanded ? '✕' : '☰'; 
    });


    // ==========================================
    // 5. DARK / LIGHT MODE TOGGLE
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Check LocalStorage first, then OS preference
    const savedTheme = localStorage.getItem('theme');
    const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && osPrefersDark)) {
        htmlElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '☀️';
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'light') {
            htmlElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = '☀️';
        } else {
            htmlElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = '🌙';
        }
    });


    // ==========================================
    // 6. SCROLL ANIMATION (Intersection Observer)
    // ==========================================
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // Observe category cards
    document.querySelectorAll('.fade-in-scroll').forEach(el => {
        observer.observe(el);
    });

});
