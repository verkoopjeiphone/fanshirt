// Normly – gedeeld script
// Mobiele navigatie + lichte fade-in-animatie bij scrollen.

document.addEventListener("DOMContentLoaded", function () {
  // Dezelfde visuele huisstijl als de homepage op alle interne pagina's.
  var currentPage = window.location.pathname.split("/").pop();
  var isHome = currentPage === "" || currentPage === "index.html";
  if (!isHome && !document.querySelector('link[data-normly-brand]')) {
    var brandStyles = document.createElement("link");
    brandStyles.rel = "stylesheet";
    brandStyles.href = "css/brand-pages.css";
    brandStyles.dataset.normlyBrand = "true";
    document.head.appendChild(brandStyles);
  }

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window) || !revealEls.length) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach(function (el) {
    observer.observe(el);
  });
});
