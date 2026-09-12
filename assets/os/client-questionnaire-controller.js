import {
  PRE_PWD_V31_DEFINITION,
  findPrePwdV31Question
} from "./questionnaires/pre-pwd-v31-definition.js";
import {
  normalizePrePwdV31Answers,
  normalizePrePwdV31ProfileContext,
  validatePrePwdV31ProfileContext,
  validatePrePwdV31VisibleAnswers
} from "./ui/pre-pwd-v31-form.js";

const AUTOSAVE_DELAY_MS = 650;
const HEALTH_SECTION_IDS = new Set(PRE_PWD_V31_DEFINITION.persistenceContract.serverDraft.healthSectionIds);
const HEALTH_ANSWER_IDS = new Set(
  PRE_PWD_V31_DEFINITION.sections
    .filter(section => HEALTH_SECTION_IDS.has(section.id))
    .flatMap(section => section.questions || [])
    .map(question => question.id)
);

function profileFromSnapshot(snapshot) {
  const context = snapshot?.profileContext || {};
  const emergency = context.emergencyContact || {};
  return normalizePrePwdV31ProfileContext({
    age: context.ageObservation === null || context.ageObservation === undefined ? "" : String(context.ageObservation),
    emergency_contact_name: emergency.name || "",
    emergency_contact_phone: emergency.phone || "",
    emergency_contact_relation: emergency.relation || ""
  });
}

function stripHealthAnswers(answers) {
  return Object.fromEntries(Object.entries(answers || {}).filter(([key]) => !HEALTH_ANSWER_IDS.has(key)));
}

export class ClientQuestionnaireController {
  constructor(api, { onChange = () => {}, onPortalReload = async () => {} } = {}) {
    this.api = api;
    this.onChange = onChange;
    this.onPortalReload = onPortalReload;
    this.draftTimer = null;
    this.profileTimer = null;
    this.saveChain = Promise.resolve();
    this.reset();
  }

  reset() {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    if (this.profileTimer) clearTimeout(this.profileTimer);
    this.draftTimer = null;
    this.profileTimer = null;
    this.state = {
      assignment: null,
      snapshot: null,
      answers: {},
      profileContext: {},
      consentAccepted: false,
      loading: false,
      consentBusy: false,
      submitting: false,
      error: "",
      conflict: false,
      validationMissing: [],
      validationInvalid: []
    };
  }

  get model() {
    return {
      ...this.state,
      open: assignment => this.open(assignment),
      close: () => this.close(),
      onAnswerChange: (id, value) => this.setAnswer(id, value),
      onProfileChange: (id, value) => this.setProfileField(id, value),
      onConsentChange: accepted => this.setConsent(accepted),
      onSubmit: () => this.submit(),
      onReloadFromServer: () => this.reloadFromServer()
    };
  }

  notify() {
    this.onChange(this.model);
  }

  async open(assignment) {
    if (!assignment?.id || !assignment.canOpen) return;
    this.state.loading = true;
    this.state.error = "";
    this.state.assignment = assignment;
    this.notify();
    try {
      const snapshot = await this.api.getClientResponseSnapshot(assignment.id);
      if (!snapshot || snapshot.rendererKey !== "pre_pwd_v31" || !snapshot.draftEnabled) {
        throw new Error("Ta wersja ankiety nie jest gotowa do bezpiecznego wypełnienia.");
      }
      this.applySnapshot(snapshot);
    } catch (error) {
      this.state.error = error?.message || "Nie udało się otworzyć ankiety.";
    } finally {
      this.state.loading = false;
      this.notify();
    }
  }

  applySnapshot(snapshot) {
    this.state.snapshot = snapshot;
    this.state.answers = normalizePrePwdV31Answers(snapshot?.answers || {});
    this.state.profileContext = profileFromSnapshot(snapshot);
    this.state.consentAccepted = Boolean(snapshot?.healthConsentActive);
    this.state.conflict = false;
    this.state.validationMissing = [];
    this.state.validationInvalid = [];
  }

  close() {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    if (this.profileTimer) clearTimeout(this.profileTimer);
    this.reset();
    this.notify();
  }

  setAnswer(id, value) {
    if (!this.state.snapshot || this.state.snapshot.status === "submitted") return;
    this.state.answers = normalizePrePwdV31Answers({ ...this.state.answers, [id]: value });
    this.state.error = "";
    this.state.validationMissing = [];
    this.state.validationInvalid = [];
    if (this.state.consentAccepted) this.scheduleDraftSave();

    const question = findPrePwdV31Question(id);
    if (["single_choice", "multi_choice", "scale_0_10", "confirmation"].includes(question?.type)) {
      this.notify();
    }
  }

  setProfileField(id, value) {
    if (!this.state.snapshot || this.state.snapshot.status === "submitted") return;
    this.state.profileContext = normalizePrePwdV31ProfileContext({ ...this.state.profileContext, [id]: value });
    this.state.error = "";
    this.state.validationMissing = [];
    this.scheduleProfileSave();
  }

  scheduleProfileSave(delay = AUTOSAVE_DELAY_MS) {
    if (this.profileTimer) clearTimeout(this.profileTimer);
    this.profileTimer = setTimeout(() => {
      this.profileTimer = null;
      this.queueProfileSave();
    }, delay);
  }

  scheduleDraftSave(delay = AUTOSAVE_DELAY_MS) {
    if (!this.state.consentAccepted || this.state.conflict) return;
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => {
      this.draftTimer = null;
      this.queueDraftSave();
    }, delay);
  }

  queueProfileSave() {
    const validation = validatePrePwdV31ProfileContext(this.state.profileContext);
    if (!validation.valid || !this.state.assignment?.id) return this.saveChain;
    const payload = { ...validation.profileContext };
    this.saveChain = this.saveChain.then(async () => {
      try {
        await this.api.saveProfileContext(this.state.assignment.id, payload);
      } catch (error) {
        this.state.error = error?.message || "Nie udało się zapisać danych profilu.";
        this.notify();
      }
    });
    return this.saveChain;
  }

  queueDraftSave() {
    if (!this.state.consentAccepted || this.state.conflict || !this.state.assignment?.id) return this.saveChain;
    const assignmentId = this.state.assignment.id;
    const answers = normalizePrePwdV31Answers(this.state.answers);
    this.saveChain = this.saveChain.then(async () => {
      const revision = Number(this.state.snapshot?.revision || 0);
      try {
        const result = await this.api.saveDraft(assignmentId, answers, revision);
        if (result?.conflict) {
          this.state.conflict = true;
          this.state.error = "Ankieta została zmieniona w innej karcie. Wczytaj zapis z serwera przed dalszą edycją.";
          this.notify();
          return;
        }
        if (result?.validationFailed) {
          this.state.validationInvalid = Array.isArray(result.invalid) ? result.invalid : [];
          this.state.error = "Nie udało się zapisać części odpowiedzi. Sprawdź formularz.";
          this.notify();
          return;
        }
        this.state.snapshot = {
          ...this.state.snapshot,
          revision: Number(result?.revision ?? revision),
          status: result?.status || this.state.snapshot.status,
          savedAt: result?.savedAt || this.state.snapshot.savedAt
        };
      } catch (error) {
        this.state.error = error?.message || "Nie udało się zapisać ankiety.";
        this.notify();
      }
    });
    return this.saveChain;
  }

  async setConsent(accepted) {
    if (!this.state.snapshot || this.state.consentBusy || this.state.snapshot.status === "submitted") return;
    const assignmentId = this.state.assignment?.id;
    if (!assignmentId) return;
    this.state.consentBusy = true;
    this.state.error = "";
    this.notify();
    try {
      if (accepted) {
        const consentVersion = this.state.snapshot.expectedConsentTextVersion;
        const privacyVersion = this.state.snapshot.expectedPrivacyNoticeVersion;
        if (!consentVersion || !privacyVersion) throw new Error("Ta wersja ankiety nie ma zatwierdzonego kontraktu prywatności.");
        await this.api.recordHealthConsent(assignmentId, consentVersion, privacyVersion);
        this.state.consentAccepted = true;
        this.state.snapshot = {
          ...this.state.snapshot,
          healthConsentActive: true,
          consentTextVersion: consentVersion,
          privacyNoticeVersion: privacyVersion
        };
        this.scheduleDraftSave(0);
      } else if (this.state.consentAccepted) {
        await this.api.withdrawHealthConsent(assignmentId);
        this.state.consentAccepted = false;
        this.state.answers = stripHealthAnswers(this.state.answers);
        this.state.snapshot = { ...this.state.snapshot, healthConsentActive: false };
      }
    } catch (error) {
      this.state.error = error?.message || "Nie udało się zapisać decyzji dotyczącej danych zdrowotnych.";
    } finally {
      this.state.consentBusy = false;
      this.notify();
    }
  }

  async flushPendingSaves() {
    if (this.profileTimer) {
      clearTimeout(this.profileTimer);
      this.profileTimer = null;
    }
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
      this.draftTimer = null;
    }
    this.queueProfileSave();
    if (this.state.consentAccepted) this.queueDraftSave();
    await this.saveChain;
  }

  async reloadFromServer() {
    if (!this.state.assignment?.id) return;
    this.state.loading = true;
    this.state.error = "";
    this.notify();
    try {
      const snapshot = await this.api.getClientResponseSnapshot(this.state.assignment.id);
      this.applySnapshot(snapshot);
    } catch (error) {
      this.state.error = error?.message || "Nie udało się wczytać zapisu z serwera.";
    } finally {
      this.state.loading = false;
      this.notify();
    }
  }

  async submit() {
    if (!this.state.assignment?.id || !this.state.snapshot || this.state.submitting) return;
    this.state.error = "";
    this.state.validationMissing = [];
    this.state.validationInvalid = [];

    const profileValidation = validatePrePwdV31ProfileContext(this.state.profileContext);
    const answersValidation = validatePrePwdV31VisibleAnswers(this.state.answers, { consentAccepted: this.state.consentAccepted });
    if (!this.state.consentAccepted) answersValidation.missing.push(PRE_PWD_V31_DEFINITION.preHealthGate.id);
    const missing = [...new Set([...profileValidation.missing, ...answersValidation.missing])];
    if (missing.length) {
      this.state.validationMissing = missing;
      this.state.error = "Uzupełnij wymagane informacje przed przekazaniem ankiety trenerowi.";
      this.notify();
      return;
    }
    if (!this.state.snapshot.submissionEnabled) {
      this.state.error = "Ta wersja ankiety nie jest jeszcze dopuszczona do wysłania.";
      this.notify();
      return;
    }

    this.state.submitting = true;
    this.notify();
    try {
      await this.flushPendingSaves();
      if (this.state.conflict || this.state.error) return;
      const result = await this.api.submit(this.state.assignment.id, Number(this.state.snapshot.revision || 0));
      if (result?.conflict) {
        this.state.conflict = true;
        this.state.error = "Zapis na serwerze jest nowszy. Wczytaj go przed wysłaniem ankiety.";
        return;
      }
      if (result?.validationFailed) {
        this.state.validationMissing = Array.isArray(result.missing) ? result.missing : [];
        this.state.validationInvalid = Array.isArray(result.invalid) ? result.invalid : [];
        this.state.error = "Serwer nie przyjął ankiety. Sprawdź wymagane odpowiedzi.";
        return;
      }
      this.state.snapshot = { ...this.state.snapshot, status: "submitted", submittedAt: result?.submittedAt || null };
      await this.onPortalReload();
      this.reset();
    } catch (error) {
      this.state.error = error?.message || "Nie udało się przekazać ankiety trenerowi.";
    } finally {
      this.state.submitting = false;
      this.notify();
    }
  }
}
