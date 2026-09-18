(() => {
  const SUPABASE_URL = "https://oycmdwxmlhchftlunbem.supabase.co";
  const SUPABASE_KEY = "sb_publishable_jt7eY4iVp3rrT40D6toWpQ_1NcOO0mU";

  function el(id){ return document.getElementById(id); }
  function message(text, error){
    const node = el("loginMessage");
    if (!node) return;
    node.textContent = text || "";
    node.classList.toggle("error", !!error);
  }

  async function login(){
    const email = (el("email")?.value || "").trim();
    const password = el("password")?.value || "";
    if (!email || !password) {
      message("Vul je e-mailadres en wachtwoord in.", true);
      return;
    }

    const button = el("loginButton");
    if (button) { button.disabled = true; button.textContent = "Inloggen…"; }
    message("Bezig met inloggen…", false);

    try {
      const response = await fetch(
        SUPABASE_URL + "/auth/v1/token?grant_type=password",
        {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token || !data.user) {
        throw new Error(data.error_description || data.msg || data.message || "E-mailadres of wachtwoord is onjuist.");
      }

      sessionStorage.setItem("normly_workbon_access", data.access_token);
      sessionStorage.setItem("normly_workbon_user", JSON.stringify(data.user));

      // Laat de bestaande portalcode de sessie opnieuw inladen.
      window.location.replace(window.location.pathname + "?loginfix=20260918");
    } catch (error) {
      sessionStorage.removeItem("normly_workbon_access");
      sessionStorage.removeItem("normly_workbon_user");
      message(error?.message || "Inloggen mislukt. Probeer het opnieuw.", true);
      if (button) { button.disabled = false; button.textContent = "Inloggen"; }
    }
  }

  function install(){
    const button = el("loginButton");
    const password = el("password");
    if (!button) return;
    button.onclick = login;
    if (password) password.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        login();
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();