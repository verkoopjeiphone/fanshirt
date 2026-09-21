/*
 * Normly public website cookie consent.
 * Analytics is never loaded until a visitor has actively agreed to it.
 */
(function () {
  "use strict";

  var CONSENT_STORAGE_KEY = "normly_cookie_preferences_v1";
  var CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
  var GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-DBJM1NH5S3";
  var root;
  var lastFocusedElement;
  var feedbackTimer;

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!raw) return null;
      var value = JSON.parse(raw);
      if (!value || typeof value.analytics !== "boolean" || !value.expiresAt || value.expiresAt < Date.now()) {
        window.localStorage.removeItem(CONSENT_STORAGE_KEY);
        return null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  function saveConsent(analytics) {
    try {
      window.localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({ analytics: Boolean(analytics), expiresAt: Date.now() + CONSENT_LIFETIME_MS })
      );
    } catch (error) {
      // The banner remains usable even when browser storage is unavailable.
    }
  }

  function analyticsId() {
    var pageId = document.documentElement.getAttribute("data-normly-ga4-id") || "";
    return (pageId || GOOGLE_ANALYTICS_MEASUREMENT_ID).trim();
  }

  function setupGoogleTag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  }

  function updateAnalyticsConsent(granted) {
    if (typeof window.gtag !== "function") return;
    window.gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }

  function removeAnalyticsCookies() {
    var hostname = window.location.hostname;
    var hostParts = hostname.split(".");
    var domains = ["", hostname, "." + hostname];
    if (hostParts.length > 1) {
      var rootDomain = hostParts.slice(-2).join(".");
      domains.push(rootDomain, "." + rootDomain);
    }

    document.cookie.split(";").forEach(function (item) {
      var name = item.trim().split("=")[0];
      if (!/^(?:_ga(?:_|$)|_gid$|_gat(?:_|$)|AMP_TOKEN$)/.test(name)) return;

      domains.forEach(function (domain) {
        var domainValue = domain ? "; domain=" + domain : "";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + domainValue;
      });
    });
  }

  function loadAnalytics() {
    var measurementId = analyticsId();
    if (!measurementId) return;

    setupGoogleTag();
    updateAnalyticsConsent(true);
    if (window.__normlyAnalyticsLoaded) return;

    window.__normlyAnalyticsLoaded = true;
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    updateAnalyticsConsent(true);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function removeBanner() {
    var banner = document.querySelector(".cookie-consent");
    if (banner) banner.remove();
  }

  function closePreferences() {
    var backdrop = document.querySelector(".cookie-consent__backdrop");
    if (backdrop) backdrop.hidden = true;
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function showFeedback(message) {
    if (!root) return;
    var feedback = root.querySelector(".cookie-consent__feedback");
    if (!feedback) return;

    window.clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.hidden = false;
    feedbackTimer = window.setTimeout(function () {
      feedback.hidden = true;
    }, 4500);
  }

  function keepFocusInPreferences(event) {
    var backdrop = root && root.querySelector(".cookie-consent__backdrop");
    if (event.key !== "Tab" || !backdrop || backdrop.hidden) return;

    var focusable = Array.prototype.slice.call(backdrop.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showPreferences() {
    if (!root) return;
    lastFocusedElement = document.activeElement;
    var backdrop = root.querySelector(".cookie-consent__backdrop");
    var checkbox = root.querySelector("#cookie-analytics");
    var consent = readConsent();
    checkbox.checked = Boolean(consent && consent.analytics);
    backdrop.hidden = false;
    window.setTimeout(function () { checkbox.focus(); }, 0);
  }

  function applyChoice(analytics) {
    saveConsent(analytics);
    removeBanner();
    closePreferences();
    if (analytics) {
      loadAnalytics();
      showFeedback("Opgeslagen: bezoekersstatistieken staan aan.");
    } else {
      updateAnalyticsConsent(false);
      removeAnalyticsCookies();
      showFeedback("Opgeslagen: alleen noodzakelijke cookies.");
    }
  }

  function mountConsent() {
    if (document.querySelector("#cookie-consent-root")) {
      root = document.querySelector("#cookie-consent-root");
      return;
    }

    root = document.createElement("div");
    root.id = "cookie-consent-root";
    root.innerHTML = [
      '<section class="cookie-consent" aria-label="Cookiekeuze">',
      '<p class="cookie-consent__eyebrow">Jouw privacy</p>',
      '<h2>Cookies</h2>',
      '<p>We onthouden je keuze. Met toestemming gebruiken we bezoekersstatistieken.</p>',
      '<p><a href="cookiebeleid.html">Meer over cookies</a>.</p>',
      '<div class="cookie-consent__actions">',
      '<button class="cookie-consent__button" type="button" data-cookie-action="necessary">Alleen noodzakelijk</button>',
      '<button class="cookie-consent__button" type="button" data-cookie-action="accept">Statistieken toestaan</button>',
      '</div>',
      '<button class="cookie-consent__link-button" type="button" data-cookie-action="preferences">Instellingen</button>',
      '</section>',
      '<div class="cookie-consent__backdrop" hidden>',
      '<section class="cookie-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">',
      '<h2 id="cookie-settings-title">Cookie-instellingen</h2>',
      '<p>Je kunt deze keuze later altijd aanpassen.</p>',
      '<label class="cookie-consent__choice cookie-consent__choice--required">',
      '<input type="checkbox" checked disabled>',
      '<span><strong>Noodzakelijk</strong><span>Onthoudt je keuze.</span></span>',
      '</label>',
      '<label class="cookie-consent__choice">',
      '<input id="cookie-analytics" type="checkbox">',
      '<span><strong>Bezoekersstatistieken</strong><span>Helpt ons de website verbeteren.</span></span>',
      '</label>',
      '<div class="cookie-consent__actions">',
      '<button class="cookie-consent__button" type="button" data-cookie-action="save">Opslaan</button>',
      '<button class="cookie-consent__button" type="button" data-cookie-action="necessary">Alleen noodzakelijk</button>',
      '</div>',
      '<button class="cookie-consent__link-button" type="button" data-cookie-action="close">Terug</button>',
      '</section>',
      '</div>',
      '<p class="cookie-consent__feedback" role="status" aria-live="polite" hidden></p>'
    ].join("");

    document.body.appendChild(root);

    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-cookie-action]");
      if (!button) return;
      var action = button.getAttribute("data-cookie-action");
      if (action === "accept") applyChoice(true);
      if (action === "necessary") applyChoice(false);
      if (action === "preferences") showPreferences();
      if (action === "save") applyChoice(root.querySelector("#cookie-analytics").checked);
      if (action === "close") closePreferences();
    });

    root.querySelector(".cookie-consent__backdrop").addEventListener("click", function (event) {
      if (event.target === event.currentTarget) closePreferences();
    });
  }

  function setupSettingsTriggers() {
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-cookie-settings]");
      if (!trigger) return;
      event.preventDefault();
      if (!root) mountConsent();
      showPreferences();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closePreferences();
      keepFocusInPreferences(event);
    });
  }

  function initialise() {
    mountConsent();
    setupSettingsTriggers();
    var consent = readConsent();
    if (consent) {
      removeBanner();
      if (consent.analytics) {
        loadAnalytics();
      } else {
        removeAnalyticsCookies();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise);
  } else {
    initialise();
  }
}());
