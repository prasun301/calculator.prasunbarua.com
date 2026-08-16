"use strict";

/**
 * =============================================================================
 * Engineering Calculator Website — Core Client Script
 * =============================================================================
 *
 * Responsibilities:
 *   1. Google-style instant search across calculator cards (with ranking,
 *      highlighting, keyboard navigation, metadata indexing, and ARIA autocomplete).
 *   2. Global keyboard shortcuts (Ctrl+K / Cmd+K or '/') to focus search.
 *   3. Mobile navigation menu toggling.
 *   4. Persisted light/dark theme switching with OS preference auto-detection.
 *
 * Design notes:
 *   - No frameworks or external libraries. Pure ES6+.
 *   - No untrusted string is ever passed to innerHTML. All dynamic markup
 *     (including <mark> highlighting) is built with DOM APIs
 *     (createElement / textContent) to eliminate XSS risk.
 *   - Every DOM lookup is defensive: missing elements degrade gracefully.
 *
 * Expected markup contract (already provided by the page):
 *   #search-box        — <input> search field
 *   #search-results    — autocomplete dropdown container
 *   .calc-card         — calculator card links (title = h3, desc = p, url = href,
 *                        optional data-keywords, data-category)
 *   #menu-btn / #main-nav — mobile navigation toggle
 *   #theme-toggle      — optional theme switch button (data-theme aware)
 * =============================================================================
 */

(function () {
  /** ---------------------------------------------------------------------
   * Configuration constants
   * --------------------------------------------------------------------- */
  const CONFIG = Object.freeze({
    DEBOUNCE_DELAY_MS: 150,
    MAX_RESULTS: 8,
    THEME_STORAGE_KEY: "theme",
    THEME_LIGHT: "light",
    THEME_DARK: "dark",
  });

  /** Relative ranking weights — lower is better (sorted ascending). */
  const RANK = Object.freeze({
    EXACT_TITLE: 0,
    TITLE_STARTS_WITH: 1,
    TITLE_CONTAINS_PHRASE: 2,
    TITLE_CONTAINS_ALL_WORDS: 2.5,
    KEYWORD_EXACT_MATCH: 2.8,
    DESCRIPTION_CONTAINS_PHRASE: 3,
    DESCRIPTION_CONTAINS_ALL_WORDS: 3.5,
    KEYWORD_OR_CATEGORY_CONTAINS: 4,
    NO_MATCH: -1,
  });

  /** ---------------------------------------------------------------------
   * Module state
   * --------------------------------------------------------------------- */
  const state = {
    searchBox: null,
    resultsContainer: null,
    calcCards: [],
    searchIndex: [],
    lastResults: [],
    lastQuery: "",
    activeIndex: -1,
    isOpen: false,
  };

  /** =========================================================================
   * Utility helpers
   * ========================================================================= */

  /**
   * Creates a debounced version of a function.
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay) {
    let timerId = null;
    return function debounced(...args) {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        fn.apply(this, args);
      }, delay);
    };
  }

  /**
   * Escapes characters with special meaning in regular expressions.
   * @param {string} str
   * @returns {string}
   */
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Splits a raw query string into normalized, non-empty lowercase words.
   * @param {string} query
   * @returns {string[]}
   */
  function tokenize(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);
  }

  /**
   * Safely builds a DocumentFragment where every occurrence of any word in
   * `words` is wrapped in a <mark> element.
   *
   * @param {string} text - The source text to highlight.
   * @param {string[]} words - Lowercased search terms to highlight.
   * @returns {DocumentFragment}
   */
  function highlightText(text, words) {
    const fragment = document.createDocumentFragment();

    const cleanWords = (words || [])
      .map(escapeRegExp)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (cleanWords.length === 0) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }

    const regex = new RegExp(`(${cleanWords.join("|")})`, "gi");
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const mark = document.createElement("mark");
      mark.textContent = match[0];
      fragment.appendChild(mark);

      lastIndex = regex.lastIndex;

      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    return fragment;
  }

  /** =========================================================================
   * Search index
   * ========================================================================= */

  /** Reads all .calc-card elements and caches normalized metadata. */
  function buildSearchIndex() {
    state.calcCards = Array.from(document.querySelectorAll(".calc-card"));

    state.searchIndex = state.calcCards
      .map((card) => {
        const titleEl = card.querySelector("h3");
        const descEl = card.querySelector("p");

        const title = titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
        const description = descEl && descEl.textContent ? descEl.textContent.trim() : "";
        const url = card.getAttribute("href") || card.dataset.href || "";
        const keywords = card.dataset.keywords || "";
        const category = card.dataset.category || "";

        return {
          title,
          description,
          url,
          keywords,
          category,
          titleLower: title.toLowerCase(),
          descLower: description.toLowerCase(),
          keywordsLower: keywords.toLowerCase(),
          categoryLower: category.toLowerCase(),
          card,
        };
      })
      .filter((entry) => entry.title.length > 0);
  }

  /** Scores a single index entry against a query. Lower scores rank higher. */
  function scoreEntry(entry, queryLower, words) {
    const { titleLower, descLower, keywordsLower, categoryLower } = entry;

    if (titleLower === queryLower) return RANK.EXACT_TITLE;
    if (titleLower.startsWith(queryLower)) return RANK.TITLE_STARTS_WITH;
    if (titleLower.includes(queryLower)) return RANK.TITLE_CONTAINS_PHRASE;
    if (words.every((word) => titleLower.includes(word))) return RANK.TITLE_CONTAINS_ALL_WORDS;
    
    if (keywordsLower && keywordsLower.split(",").map((k) => k.trim()).includes(queryLower)) {
      return RANK.KEYWORD_EXACT_MATCH;
    }

    if (descLower.includes(queryLower)) return RANK.DESCRIPTION_CONTAINS_PHRASE;
    if (words.every((word) => descLower.includes(word))) return RANK.DESCRIPTION_CONTAINS_ALL_WORDS;

    if (
      words.every(
        (word) =>
          keywordsLower.includes(word) ||
          categoryLower.includes(word) ||
          titleLower.includes(word) ||
          descLower.includes(word)
      )
    ) {
      return RANK.KEYWORD_OR_CATEGORY_CONTAINS;
    }

    return RANK.NO_MATCH;
  }

  /** Searches the cached index and returns matching entries, ranked. */
  function searchCalculators(query) {
    const queryLower = query.trim().toLowerCase();
    if (!queryLower) return [];

    const words = tokenize(queryLower);
    const scored = [];

    for (const entry of state.searchIndex) {
      const score = scoreEntry(entry, queryLower, words);
      if (score !== RANK.NO_MATCH) {
        scored.push({ entry, score });
      }
    }

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.entry.title.localeCompare(b.entry.title);
    });

    return scored.map((s) => s.entry);
  }

  /** =========================================================================
   * Rendering
   * ========================================================================= */

  function openDropdown() {
    if (!state.resultsContainer || !state.searchBox) return;
    state.resultsContainer.hidden = false;
    state.searchBox.setAttribute("aria-expanded", "true");
    state.isOpen = true;
  }

  function closeDropdown() {
    if (!state.resultsContainer || !state.searchBox) return;
    state.resultsContainer.hidden = true;
    state.searchBox.setAttribute("aria-expanded", "false");
    state.searchBox.removeAttribute("aria-activedescendant");
    state.isOpen = false;
    state.activeIndex = -1;
  }

  function renderNoResults() {
    const empty = document.createElement("div");
    empty.className = "no-results";
    empty.textContent = "No calculators found";
    state.resultsContainer.appendChild(empty);
    openDropdown();
  }

  function renderResults(results, query) {
    if (!state.resultsContainer || !state.searchBox) return;

    state.resultsContainer.textContent = "";
    state.activeIndex = -1;

    if (results.length === 0) {
      renderNoResults();
      return;
    }

    const words = tokenize(query);
    const fragment = document.createDocumentFragment();
    const limited = results.slice(0, CONFIG.MAX_RESULTS);

    limited.forEach((entry, index) => {
      const option = document.createElement("div");
      option.className = "search-item";
      option.id = `search-result-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.url = entry.url;
      option.dataset.index = String(index);

      const titleEl = document.createElement("strong");
      titleEl.appendChild(highlightText(entry.title, words));

      const descEl = document.createElement("p");
      if (entry.description) {
        descEl.appendChild(highlightText(entry.description, words));
      }

      option.appendChild(titleEl);
      option.appendChild(descEl);
      fragment.appendChild(option);
    });

    state.resultsContainer.appendChild(fragment);
    openDropdown();
  }

  function filterCalcCardGrid(results) {
    if (state.calcCards.length === 0) return;

    const matchedCards = new Set(results.map((entry) => entry.card));
    state.calcCards.forEach((card) => {
      card.style.display = matchedCards.has(card) ? "" : "none";
    });
  }

  function resetCalcCardGrid() {
    state.calcCards.forEach((card) => {
      card.style.display = "";
    });
  }

  /** =========================================================================
   * Active item / keyboard & mouse interaction
   * ========================================================================= */

  function getResultItems() {
    if (!state.resultsContainer) return [];
    return Array.from(state.resultsContainer.querySelectorAll(".search-item"));
  }

  function setActiveItem(index, itemsOverride) {
    const items = itemsOverride || getResultItems();
    if (items.length === 0) return;

    items.forEach((item, i) => {
      const isActive = i === index;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    state.activeIndex = index;

    const activeItem = items[index];
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
      state.searchBox.setAttribute("aria-activedescendant", activeItem.id);
    }
  }

  function moveActiveItem(delta) {
    const items = getResultItems();
    if (items.length === 0) return;

    let nextIndex = state.activeIndex + delta;
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;

    setActiveItem(nextIndex, items);
  }

  function navigateTo(url) {
    if (typeof url === "string" && url.length > 0) {
      window.location.href = url;
    }
  }

  function activateSelection() {
    const items = getResultItems();
    if (items.length === 0) return;

    if (state.activeIndex >= 0 && items[state.activeIndex]) {
      navigateTo(items[state.activeIndex].dataset.url);
      return;
    }

    if (items.length === 1) {
      navigateTo(items[0].dataset.url);
    }
  }

  function handleSearchKeydown(event) {
    if (!state.isOpen && event.key !== "Escape" && event.key !== "ArrowDown") {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!state.isOpen) openDropdown();
        moveActiveItem(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActiveItem(-1);
        break;
      case "Home":
        if (state.isOpen && state.activeIndex >= 0) {
          event.preventDefault();
          setActiveItem(0);
        }
        break;
      case "End":
        if (state.isOpen && state.activeIndex >= 0) {
          event.preventDefault();
          const items = getResultItems();
          setActiveItem(items.length - 1, items);
        }
        break;
      case "Enter":
        if (state.isOpen) {
          event.preventDefault();
          activateSelection();
        }
        break;
      case "Escape":
        closeDropdown();
        break;
      default:
        break;
    }
  }

  function handleResultsClick(event) {
    const item = event.target.closest(".search-item");
    if (item && item.dataset.url) {
      navigateTo(item.dataset.url);
    }
  }

  function handleResultsMouseOver(event) {
    const item = event.target.closest(".search-item");
    if (!item) return;

    const items = getResultItems();
    const index = items.indexOf(item);
    if (index !== -1 && index !== state.activeIndex) {
      setActiveItem(index, items);
    }
  }

  /** Global keydown handler to focus search via '/' or 'Cmd/Ctrl + K' */
  function initGlobalHotkeys() {
    document.addEventListener("keydown", (event) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName) || activeEl.isContentEditable);

      if (
        (event.key === "/" && !isInput) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
      ) {
        if (state.searchBox) {
          event.preventDefault();
          state.searchBox.focus();
          state.searchBox.select();
        }
      }
    });
  }

  /** =========================================================================
   * Search input orchestration
   * ========================================================================= */

  function performSearch() {
    if (!state.searchBox) return;

    const query = state.searchBox.value;
    const trimmed = query.trim();
    state.lastQuery = trimmed;

    if (!trimmed) {
      closeDropdown();
      resetCalcCardGrid();
      state.lastResults = [];
      return;
    }

    const results = searchCalculators(trimmed);
    state.lastResults = results;

    renderResults(results, trimmed);
    filterCalcCardGrid(results);
  }

  function handleSearchFocus() {
    if (state.lastQuery && state.lastResults.length >= 0 && state.searchBox.value.trim()) {
      renderResults(state.lastResults, state.lastQuery);
    }
  }

  function handleDocumentClick(event) {
    if (!state.isOpen) return;
    if (!state.searchBox || !state.resultsContainer) return;

    const target = event.target;
    const clickedInsideSearch =
      state.searchBox.contains(target) || state.resultsContainer.contains(target);

    if (!clickedInsideSearch) {
      closeDropdown();
    }
  }

  function initSearch() {
    state.searchBox = document.getElementById("search-box");
    state.resultsContainer = document.getElementById("search-results");

    if (!state.searchBox || !state.resultsContainer) {
      return;
    }

    buildSearchIndex();

    state.searchBox.setAttribute("role", "combobox");
    state.searchBox.setAttribute("aria-expanded", "false");
    state.searchBox.setAttribute("aria-autocomplete", "list");
    if (!state.resultsContainer.id) {
      state.resultsContainer.id = "search-results";
    }
    state.searchBox.setAttribute("aria-controls", state.resultsContainer.id);
    state.resultsContainer.setAttribute("role", "listbox");
    state.resultsContainer.hidden = true;

    const debouncedSearch = debounce(performSearch, CONFIG.DEBOUNCE_DELAY_MS);

    state.searchBox.addEventListener("input", debouncedSearch);
    state.searchBox.addEventListener("keydown", handleSearchKeydown);
    state.searchBox.addEventListener("focus", handleSearchFocus);

    state.resultsContainer.addEventListener("click", handleResultsClick);
    state.resultsContainer.addEventListener("mouseover", handleResultsMouseOver);

    document.addEventListener("click", handleDocumentClick);
    initGlobalHotkeys();
  }

  /** =========================================================================
   * Mobile navigation menu
   * ========================================================================= */

  function initMobileMenu() {
    const menuBtn = document.getElementById("menu-btn");
    const nav = document.getElementById("main-nav");

    if (!menuBtn || !nav) return;

    menuBtn.setAttribute("aria-expanded", "false");

    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = nav.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      const isOpen = nav.classList.contains("nav-open");
      const clickedOutside = !nav.contains(event.target) && event.target !== menuBtn;

      if (isOpen && clickedOutside) {
        nav.classList.remove("nav-open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /** =========================================================================
   * Theme system
   * ========================================================================= */

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn("Unable to persist theme preference:", err);
    }
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? CONFIG.THEME_DARK
      : CONFIG.THEME_LIGHT;
  }

  function loadSavedTheme() {
    try {
      const saved = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
      if (saved === CONFIG.THEME_LIGHT || saved === CONFIG.THEME_DARK) {
        document.documentElement.dataset.theme = saved;
      } else {
        document.documentElement.dataset.theme = getSystemTheme();
      }
    } catch (err) {
      console.warn("Unable to read theme preference:", err);
      document.documentElement.dataset.theme = getSystemTheme();
    }
  }

  function watchSystemThemeChanges() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      try {
        if (!localStorage.getItem(CONFIG.THEME_STORAGE_KEY)) {
          applyTheme(e.matches ? CONFIG.THEME_DARK : CONFIG.THEME_LIGHT);
        }
      } catch (err) {
        /* Ignore storage errors */
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }
  }

  function initThemeToggle() {
    const themeBtn = document.getElementById("theme-toggle");
    if (!themeBtn) return;

    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.dataset.theme === CONFIG.THEME_DARK;
      applyTheme(isDark ? CONFIG.THEME_LIGHT : CONFIG.THEME_DARK);
    });
  }

  /** =========================================================================
   * Application bootstrap
   * ========================================================================= */

  function init() {
    try {
      loadSavedTheme();
      watchSystemThemeChanges();
    } catch (err) {
      console.error("Theme initialization failed:", err);
    }

    try {
      initThemeToggle();
    } catch (err) {
      console.error("Theme toggle initialization failed:", err);
    }

    try {
      initSearch();
    } catch (err) {
      console.error("Search initialization failed:", err);
    }

    try {
      initMobileMenu();
    } catch (err) {
      console.error("Mobile menu initialization failed:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.CalculatorSearch = Object.freeze({
    rebuildIndex: buildSearchIndex,
    performSearch: performSearch,
    setTheme: applyTheme,
  });
})();
