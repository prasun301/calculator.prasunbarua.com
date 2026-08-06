"use strict";

/**
 * =============================================================================
 * Engineering Calculator Website — Core Client Script
 * =============================================================================
 *
 * Responsibilities:
 *   1. Google-style instant search across calculator cards (with ranking,
 *      highlighting, keyboard navigation, and ARIA-compliant autocomplete).
 *   2. Mobile navigation menu toggling.
 *   3. Persisted light/dark theme switching.
 *
 * Design notes:
 *   - No frameworks or external libraries. Pure ES6+.
 *   - No untrusted string is ever passed to innerHTML. All dynamic markup
 *     (including <mark> highlighting) is built with DOM APIs
 *     (createElement / textContent) to eliminate XSS risk.
 *   - Every DOM lookup is defensive: missing elements degrade gracefully
 *     instead of throwing.
 *
 * Expected markup contract (already provided by the page):
 *   #search-box        — <input> search field
 *   #search-results    — autocomplete dropdown container
 *   .calc-card         — calculator card links (title = h3, desc = p, url = href)
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
    DESCRIPTION_CONTAINS_PHRASE: 3,
    DESCRIPTION_CONTAINS_ALL_WORDS: 3.5,
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
   * `words` is wrapped in a <mark> element. Never uses innerHTML — every
   * fragment of text (including the untrusted query) is inserted via
   * textContent / createTextNode, so no markup injection is possible.
   *
   * @param {string} text - The source text to highlight (title or description).
   * @param {string[]} words - Lowercased search terms to highlight.
   * @returns {DocumentFragment}
   */
  function highlightText(text, words) {
    const fragment = document.createDocumentFragment();

    const cleanWords = (words || [])
      .map(escapeRegExp)
      .filter(Boolean)
      // Match longer terms first so overlapping words highlight sensibly.
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

      // Guard against zero-length matches causing an infinite loop.
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

  /**
   * Reads all .calc-card elements from the DOM once and caches a normalized
   * search index. Cards missing a title are skipped defensively.
   */
  function buildSearchIndex() {
    state.calcCards = Array.from(document.querySelectorAll(".calc-card"));

    state.searchIndex = state.calcCards
      .map((card) => {
        const titleEl = card.querySelector("h3");
        const descEl = card.querySelector("p");

        const title = titleEl && titleEl.textContent ? titleEl.textContent.trim() : "";
        const description = descEl && descEl.textContent ? descEl.textContent.trim() : "";
        const url = card.getAttribute("href") || "";

        return {
          title,
          description,
          url,
          titleLower: title.toLowerCase(),
          descLower: description.toLowerCase(),
          card,
        };
      })
      .filter((entry) => entry.title.length > 0);
  }

  /**
   * Scores a single index entry against a query. Lower scores rank higher.
   * @param {object} entry - Item from state.searchIndex.
   * @param {string} queryLower - Lowercased full query.
   * @param {string[]} words - Lowercased query words.
   * @returns {number} RANK value, or RANK.NO_MATCH.
   */
  function scoreEntry(entry, queryLower, words) {
    const { titleLower, descLower } = entry;

    if (titleLower === queryLower) return RANK.EXACT_TITLE;
    if (titleLower.startsWith(queryLower)) return RANK.TITLE_STARTS_WITH;
    if (titleLower.includes(queryLower)) return RANK.TITLE_CONTAINS_PHRASE;
    if (words.every((word) => titleLower.includes(word))) return RANK.TITLE_CONTAINS_ALL_WORDS;
    if (descLower.includes(queryLower)) return RANK.DESCRIPTION_CONTAINS_PHRASE;
    if (words.every((word) => descLower.includes(word))) return RANK.DESCRIPTION_CONTAINS_ALL_WORDS;

    return RANK.NO_MATCH;
  }

  /**
   * Searches the cached index and returns matching entries, ranked.
   * @param {string} query - Raw (unsanitized) user input.
   * @returns {object[]} Matching search index entries, best match first.
   */
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

  /** Opens the autocomplete dropdown and syncs ARIA state. */
  function openDropdown() {
    if (!state.resultsContainer || !state.searchBox) return;
    state.resultsContainer.hidden = false;
    state.searchBox.setAttribute("aria-expanded", "true");
    state.isOpen = true;
  }

  /** Closes the autocomplete dropdown and syncs ARIA state. */
  function closeDropdown() {
    if (!state.resultsContainer || !state.searchBox) return;
    state.resultsContainer.hidden = true;
    state.searchBox.setAttribute("aria-expanded", "false");
    state.searchBox.removeAttribute("aria-activedescendant");
    state.isOpen = false;
    state.activeIndex = -1;
  }

  /**
   * Renders the "no calculators found" message.
   */
  function renderNoResults() {
    const empty = document.createElement("div");
    empty.className = "no-results";
    empty.textContent = "No calculators found";
    state.resultsContainer.appendChild(empty);
    openDropdown();
  }

  /**
   * Renders the ranked, highlighted result list into the dropdown.
   * @param {object[]} results - Ranked search index entries.
   * @param {string} query - Raw query used for highlighting.
   */
  function renderResults(results, query) {
    if (!state.resultsContainer || !state.searchBox) return;

    // Clear previous results (safe: no user content involved).
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

  /**
   * Shows/hides the main .calc-card grid entries to reflect the active
   * search query.
   * @param {object[]} results - Ranked search index entries considered a match.
   */
  function filterCalcCardGrid(results) {
    if (state.calcCards.length === 0) return;

    const matchedCards = new Set(results.map((entry) => entry.card));
    state.calcCards.forEach((card) => {
      card.style.display = matchedCards.has(card) ? "" : "none";
    });
  }

  /** Restores all calculator cards to visible (used when query is cleared). */
  function resetCalcCardGrid() {
    state.calcCards.forEach((card) => {
      card.style.display = "";
    });
  }

  /** =========================================================================
   * Active item / keyboard & mouse interaction
   * ========================================================================= */

  /** @returns {HTMLElement[]} Currently rendered result option elements. */
  function getResultItems() {
    if (!state.resultsContainer) return [];
    return Array.from(state.resultsContainer.querySelectorAll(".search-item"));
  }

  /**
   * Marks the item at `index` as active, updates ARIA attributes, and
   * scrolls it into view if necessary.
   * @param {number} index
   * @param {HTMLElement[]} [itemsOverride]
   */
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

  /**
   * Moves the active selection up or down, wrapping at the ends.
   * @param {number} delta - +1 for down, -1 for up.
   */
  function moveActiveItem(delta) {
    const items = getResultItems();
    if (items.length === 0) return;

    let nextIndex = state.activeIndex + delta;
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;

    setActiveItem(nextIndex, items);
  }

  /** Navigates the browser to a calculator URL, defensively. */
  function navigateTo(url) {
    if (typeof url === "string" && url.length > 0) {
      window.location.href = url;
    }
  }

  /** Opens the currently active (or sole) result, if any. */
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

  /**
   * Central keydown handler for the search box.
   * @param {KeyboardEvent} event
   */
  function handleSearchKeydown(event) {
    if (!state.isOpen && event.key !== "Escape") {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActiveItem(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActiveItem(-1);
        break;
      case "Enter":
        event.preventDefault();
        activateSelection();
        break;
      case "Escape":
        closeDropdown();
        break;
      default:
        break;
    }
  }

  /** Handles clicks within the results dropdown via event delegation. */
  function handleResultsClick(event) {
    const item = event.target.closest(".search-item");
    if (item && item.dataset.url) {
      navigateTo(item.dataset.url);
    }
  }

  /** Updates active selection on hover via event delegation. */
  function handleResultsMouseOver(event) {
    const item = event.target.closest(".search-item");
    if (!item) return;

    const items = getResultItems();
    const index = items.indexOf(item);
    if (index !== -1 && index !== state.activeIndex) {
      setActiveItem(index, items);
    }
  }

  /** =========================================================================
   * Search input orchestration
   * ========================================================================= */

  /** Executes a full search-and-render cycle for the current input value. */
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

  /** Re-opens the dropdown with cached results when the field regains focus. */
  function handleSearchFocus() {
    if (state.lastQuery && state.lastResults.length >= 0 && state.searchBox.value.trim()) {
      renderResults(state.lastResults, state.lastQuery);
    }
  }

  /** Closes the dropdown when the user clicks anywhere outside it. */
  function handleDocumentClick(event) {
    if (!state.isOpen) return;
    if (!state.searchBox || !state.resultsContainer) return;

    const target = event.target;
    const clickedInsideSearch = state.searchBox.contains(target) || state.resultsContainer.contains(target);

    if (!clickedInsideSearch) {
      closeDropdown();
    }
  }

  /** =========================================================================
   * Search module bootstrap
   * ========================================================================= */

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

  /**
   * Applies a theme to the document and persists the preference.
   * @param {"light"|"dark"} theme
   */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn("Unable to persist theme preference:", err);
    }
  }

  /** Loads and applies any previously saved theme preference. */
  function loadSavedTheme() {
    try {
      const saved = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
      if (saved === CONFIG.THEME_LIGHT || saved === CONFIG.THEME_DARK) {
        document.documentElement.dataset.theme = saved;
      }
    } catch (err) {
      console.warn("Unable to read theme preference:", err);
    }
  }

  /** Wires up an optional theme toggle button, if present on the page. */
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
  });
})();
