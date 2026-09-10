// In-memory view state only. No offline cache and no automatic write retry.
export class TrainerWorkspaceLoader {
  constructor(state, render) { this.state = state; this.render = render; this.version = 0; }
  async load(clientId, refreshClients = false) {
    const version = ++this.version;
    const current = () => version === this.version;
    const state = this.state;
    if (state.activeClientId !== clientId) state.workspace = null;
    state.activeClientId = clientId || "";
    state.loadError = "";
    state.loading = true;
    this.render();
    try {
      if (refreshClients) {
        const clients = await state.repository.listClients();
        if (!current()) return;
        state.clients = clients;
        if (!clients.some(client => client.id === clientId)) state.activeClientId = "";
      }
      if (!current()) return;
      if (!state.activeClientId) state.workspace = null;
      else {
        const workspace = await state.repository.getClientWorkspace(state.activeClientId, core => {
          if (current()) { state.workspace = core; this.render(); }
        });
        if (!current()) return;
        state.workspace = workspace;
      }
      state.loading = false;
      this.render();
    } catch (error) {
      if (!current()) return;
      state.loading = false;
      if ([401,403,404].includes(Number(error?.status))) state.workspace = null;
      state.loadError = state.workspace
        ? "Nie udało się odświeżyć procesu. Widzisz poprzedni odczyt. Odśwież przed kolejnym zapisem."
        : "Nie udało się wczytać procesu. Spróbuj ponownie.";
      this.render();
      throw error;
    }
  }
  async section(section) {
    const version = this.version, id = this.state.activeClientId;
    try {
      const data = await this.state.repository.getWorkspaceSection(id, section);
      if (version !== this.version) return;
      Object.assign(this.state.workspace, data);
      this.state.workspace.sectionStatus[section] = "ready";
      this.render();
    } catch (error) {
      if (version === this.version) {
        if ([401,403].includes(Number(error?.status))) this.state.workspace = null;
        else this.state.workspace.sectionStatus[section] = "failed";
        this.render();
      }
      throw error;
    }
  }
  reset() { ++this.version; }
}
