import { userSafeError } from "./runtime.js";
import { loadTrainerAttention } from "./trainer-attention-runtime.js";

export class TrainerAttentionController {
  constructor(state, { render, resetWorkspace, resetInquirySelection, loadWorkspace, refreshInquiry, withWrite }) {
    this.state = state;
    this.render = render;
    this.resetWorkspace = resetWorkspace;
    this.resetInquirySelection = resetInquirySelection;
    this.loadWorkspace = loadWorkspace;
    this.refreshInquiry = refreshInquiry;
    this.withWrite = withWrite;
    this.generation = 0;
  }

  reset() {
    const state = this.state;
    this.generation++;
    state.trainerAttention = null;
    state.trainerAttentionLoading = false;
    state.trainerAttentionError = "";
    state.trainerAttentionView = state.trainerAttentionEnabled;
  }

  renderBindings(onError) {
    const state = this.state;
    return {
      trainerAttentionEnabled: state.trainerAttentionEnabled,
      trainerAttentionView: state.trainerAttentionView,
      trainerAttention: state.trainerAttention,
      trainerAttentionLoading: state.trainerAttentionLoading,
      trainerAttentionError: state.trainerAttentionError,
      onOpenClientContext: clientId => this.openClient(clientId).catch(onError),
      onShowTrainerAttention: () => this.refresh({ clearSelection: true }).catch(onError),
      onRetryTrainerAttention: () => this.refresh().catch(onError),
      onAttentionReview: (item, outcome) => this.review(item, outcome).catch(onError),
      onAttentionContact: (item, note) => this.resolve(item, note).catch(onError)
    };
  }

  async refresh({ clearSelection = false } = {}) {
    const state = this.state;
    const generation = ++this.generation;
    if (!state.trainerAttentionEnabled) return;
    if (clearSelection) {
      this.resetWorkspace();
      this.resetInquirySelection();
      state.activeClientId = "";
      state.workspace = null;
    }
    state.trainerAttentionView = true;
    state.trainerAttentionLoading = true;
    state.trainerAttentionError = "";
    this.render();
    try {
      const result = await loadTrainerAttention(state.repository);
      if (generation !== this.generation) return;
      state.trainerAttention = result.model;
      state.clients = result.snapshot.clients;
    } catch (error) {
      if (generation !== this.generation) return;
      state.trainerAttention = null;
      state.trainerAttentionError = userSafeError(error, state.config?.mode);
      throw error;
    } finally {
      if (generation === this.generation) { state.trainerAttentionLoading = false; this.render(); }
    }
  }

  async currentItem(item) {
    const generation = this.generation;
    const repository = this.state.repository;
    const { model } = await loadTrainerAttention(repository);
    if (generation !== this.generation || repository !== this.state.repository) throw new Error("Widok zmienił się. Otwórz kolejkę ponownie.");
    const current = model.attention.find(row => row.clientId === item.clientId && row.signalKey === item.signalKey);
    if (!current || current.currentSourceRevision !== item.currentSourceRevision || current.sourceChangedSinceContact !== item.sourceChangedSinceContact) {
      throw new Error("Sprawa zmieniła się. Odśwież kolejkę i sprawdź kontekst.");
    }
    return current;
  }
  async review(item, outcome) {
    if (this.writing || !["noted_no_change", "contact_required"].includes(outcome)) return;
    this.writing = true;
    try {
      await this.withWrite("Zapisywanie przeglądu", async () => {
        const current = await this.currentItem(item);
        if (current.contactReviewId) throw new Error("Kontakt pozostaje otwarty. Zakończ go jawnie.");
        return this.state.repository.saveSignalReview(this.state.profile.id, item.clientId, item.signalKey, outcome);
      }, () => this.refresh());
    } finally { this.writing = false; }
  }
  async resolve(item, note) {
    if (this.writing) return;
    this.writing = true;
    try {
      await this.withWrite("Zapisywanie kontaktu", async () => {
        const current = await this.currentItem(item);
        return this.state.repository.rpc("resolve_trainer_signal_contact", {p_review_id:current.contactReviewId,p_note:note});
      }, () => this.refresh());
    } finally { this.writing = false; }
  }
  async openClient(clientId) {
    if (!clientId) return;
    const state = this.state;
    this.generation++;
    state.trainerAttentionLoading = false;
    state.trainerAttentionView = false;
    state.trainerAttentionError = "";
    await this.loadWorkspace(clientId === "inquiries" ? "" : clientId);
    await this.refreshInquiry();
    this.render();
  }
}
