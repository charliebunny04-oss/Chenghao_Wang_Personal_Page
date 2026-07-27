(() => {
  const translations = window.PORTFOLIO_I18N || {};
  const pageName = document.body.dataset.page || "home";
  const storageKey = "chenghao-portfolio-language";
  const supportedLanguages = ["en", "zh"];

  const readStoredLanguage = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const writeStoredLanguage = (language) => {
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // The language still applies for the current page when storage is unavailable.
    }
  };

  const languageFromUrl = () => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    return supportedLanguages.includes(requested) ? requested : null;
  };

  const initialLanguage = () => {
    const urlLanguage = languageFromUrl();
    if (urlLanguage) return urlLanguage;

    const storedLanguage = readStoredLanguage();
    if (supportedLanguages.includes(storedLanguage)) return storedLanguage;

    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  };

  const lookup = (language, key) => {
    return translations[language]?.[key] ?? translations.en?.[key] ?? "";
  };

  const updateLocalLinks = (language) => {
    document.querySelectorAll("[data-lang-link]").forEach((link) => {
      const baseHref = link.dataset.baseHref || link.getAttribute("href");
      if (!baseHref) return;

      const hashIndex = baseHref.indexOf("#");
      const basePath = hashIndex >= 0 ? baseHref.slice(0, hashIndex) : baseHref;
      const hash = hashIndex >= 0 ? baseHref.slice(hashIndex) : "";
      const separator = basePath.includes("?") ? "&" : "?";
      link.setAttribute("href", `${basePath}${separator}lang=${language}${hash}`);
    });
  };

  const updateMeta = (language) => {
    const title = lookup(language, `${pageName}.metaTitle`);
    const description = lookup(language, `${pageName}.metaDescription`);

    if (title) document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute(
      "content",
      language === "zh" ? "zh_CN" : "en_GB"
    );
  };

  const updateDownloads = (language) => {
    document.querySelectorAll("[data-download-kind='cv']").forEach((link) => {
      const href = language === "zh" ? link.dataset.cvZh : link.dataset.cvEn;
      if (href) link.setAttribute("href", href);
    });
  };

  const translatePage = (language, updateUrl = true) => {
    const previousScroll = {
      left: window.scrollX,
      top: window.scrollY
    };

    document.documentElement.lang = language === "zh" ? "zh-CN" : "en-GB";
    document.documentElement.dataset.language = language;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = lookup(language, element.dataset.i18n);
      if (value) element.textContent = value;
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      const value = lookup(language, element.dataset.i18nAria);
      if (value) element.setAttribute("aria-label", value);
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
      const value = lookup(language, element.dataset.i18nAlt);
      if (value) element.setAttribute("alt", value);
    });

    document.querySelectorAll("[data-lang-option]").forEach((button) => {
      const isActive = button.dataset.langOption === language;
      button.setAttribute("aria-pressed", String(isActive));
      button.classList.toggle("is-active", isActive);
    });

    updateMeta(language);
    updateDownloads(language);
    updateLocalLinks(language);
    writeStoredLanguage(language);

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language);
      history.replaceState({ language }, "", `${url.pathname}${url.search}${url.hash}`);
    }

    const restoreScroll = () => {
      const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({
        left: previousScroll.left,
        top: Math.min(previousScroll.top, maximumScroll),
        behavior: "auto"
      });
    };
    restoreScroll();
    requestAnimationFrame(restoreScroll);

    document.dispatchEvent(new CustomEvent("portfolio:languagechange", {
      detail: { language }
    }));
  };

  const navToggle = document.querySelector("[data-nav-toggle]");
  const siteNav = document.querySelector("[data-site-nav]");

  const closeMenu = () => {
    if (!navToggle || !siteNav) return;
    siteNav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  navToggle?.addEventListener("click", () => {
    const isOpen = siteNav?.classList.toggle("is-open") ?? false;
    document.body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetSelector = link.getAttribute("href");
      const target = targetSelector?.startsWith("#")
        ? document.querySelector(targetSelector)
        : null;

      if (target) {
        event.preventDefault();
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start"
        });
        history.replaceState(null, "", targetSelector);
      }

      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.addEventListener("click", () => {
      translatePage(button.dataset.langOption, true);
    });
  });

  window.addEventListener("popstate", () => {
    translatePage(languageFromUrl() || initialLanguage(), false);
  });

  if ("IntersectionObserver" in window && pageName === "home") {
    const navLinks = [...document.querySelectorAll("[data-section-link]")];
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const activeSectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", isActive);
          if (isActive) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, {
      rootMargin: "-30% 0px -62% 0px",
      threshold: 0.01
    });

    sections.forEach((section) => activeSectionObserver.observe(section));
  }

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  document.documentElement.classList.add("js");
  translatePage(initialLanguage(), Boolean(languageFromUrl()));
})();
