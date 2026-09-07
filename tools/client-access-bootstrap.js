(() => {
  const root = document.getElementById("access-admin");
  if (!root) return;

  const initialText = root.textContent;
  const state = {
    startedAt: Date.now(),
    moduleLoaded: false,
    runtimeReady: false,
    failed: false
  };
  window.__STUDIO_LAS_CLIENT_ACCESS_BOOTSTRAP__ = state;

  function markReadyIfChanged() {
    if (state.failed) return;
    if (root.textContent !== initialText) {
      state.runtimeReady = true;
    }
  }

  const observer = new MutationObserver(markReadyIfChanged);
  observer.observe(root, { childList: true, subtree: true, characterData: true });

  function renderFailure() {
    markReadyIfChanged();
    if (state.runtimeReady || state.failed) return;
    state.failed = true;
    observer.disconnect();
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
  }

  const startupTimeout = window.setTimeout(renderFailure, 12000);

  import("./client-access-admin.js")
    .then(() => {
      state.moduleLoaded = true;
      window.setTimeout(markReadyIfChanged, 0);
    })
    .catch(error => {
      console.error("client-access bootstrap import failure", error);
      window.clearTimeout(startupTimeout);
      renderFailure();
    });
})();
