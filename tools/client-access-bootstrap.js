(() => {
  const root = document.getElementById("access-admin");
  if (!root) return;

  const timeoutMs = 12000;
  window.__STUDIO_LAS_CLIENT_ACCESS_BOOTSTRAP__ = {
    startedAt: Date.now(),
    ready: false
  };

  window.setTimeout(() => {
    const state = window.__STUDIO_LAS_CLIENT_ACCESS_BOOTSTRAP__;
    if (!state || state.ready) return;

    root.innerHTML = `
      <main class="center-screen">
        <section class="fatal-card">
          <h1>Narzędzie dostępu nie uruchomiło się</h1>
          <p>Panel zatrzymał się podczas bezpiecznego uruchamiania. Nie wykonano żadnej operacji na koncie klienta.</p>
          <div class="form-actions">
            <button class="button primary" type="button" id="client-access-retry">Spróbuj ponownie</button>
            <button class="button" type="button" id="client-access-back">Wróć do OS</button>
          </div>
        </section>
      </main>`;

    document.getElementById("client-access-retry")?.addEventListener("click", () => window.location.reload());
    document.getElementById("client-access-back")?.addEventListener("click", () => window.location.assign("../studio-las-os.html"));
  }, timeoutMs);
})();
