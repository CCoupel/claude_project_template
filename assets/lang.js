(() => {
  const STORAGE_KEY = 'cpt-lang';
  const DEFAULT_LANG = 'fr';

  let translations = {};

  async function loadLang(lang) {
    const res = await fetch(`locales/${lang}.json`);
    translations = await res.json();
    applyTranslations();
    updateButtons(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[key] !== undefined) {
        el.textContent = translations[key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key] !== undefined) {
        el.setAttribute('placeholder', translations[key]);
      }
    });
  }

  function updateButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    loadLang(saved);

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => loadLang(btn.dataset.lang));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
