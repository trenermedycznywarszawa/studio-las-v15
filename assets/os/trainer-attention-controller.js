import { userSafeError } from "./runtime.js";
import { loadTrainerAttention } from "./trainer-attention-runtime.js";

export class TrainerAttentionController {
  constructor(state, {
    render,
    resetWorkspace,
    loadWorkspace,
    refreshInquiry
  }) {
    this.state = state;
    this.render = render;
    this.resetWorkspace = resetWorkspace;
    this.loadWorkspace = loadWorkspace;
    this.refreshInquiry = refreshInquiry;
  }

  async refresh({ clearSelection = false } = {}) {
    const state = this.state;
    if (!state.trainerAttentionEnabled) return;
    if (clearSelection) {
      this.resetWorkspace();
      state.activeClientId = "";
      state.workspace = null;
    }
    state.trainerAttentionView = true;
    state.trainerAttentionLoading = true;
    state.trainerAttentionError = "";
    this.render();
    try {
      const result = await loadTrainerAttention(state.repository);
      state.trainerAttention = result.model;
      state.clients = result.snapshot.clients;
    } catch (error) {
      state.trainerAttention = null;
      state.trainerAttentionError = userSafeError(error, state.config?.mode);
      throw error;
    } finally {
      state.trainerAttentionLoading = false;
      this.render();
    }
  }

  async openClient(clientId) {
    if (!clientId) return;
    const state = this.state;
    state.trainerAttentionView = false;
    state.trainerAttentionError = "";
    await this.loadWorkspace(clientId);
    await this.refreshInquiry();
    this.render();
  }
}
