// Verstandel – menu op mobiel en voorselectie van het onderwerp in het contactformulier
(function () {
  document.documentElement.classList.add("js");

  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  var select = document.getElementById("onderwerp");
  if (select) {
    var params = new URLSearchParams(window.location.search);
    var keuze = params.get("onderwerp");
    if (keuze) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === keuze) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }
})();
