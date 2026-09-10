import { button, panel, statusBox, create } from "./ui/common.js";
import { InquiryRepository } from "./inquiries-data.js";
import { renderInquirySection } from "./ui/inquiries-section.js";

export class InquiryController {
  constructor(config, auth, withWrite) {
    this.repository = new InquiryRepository(config, auth);
    this.withWrite = withWrite;
    this.inquiries = [];
    this.activeInquiryId = "";
    this.decisions = [];
    this.prePwdRequests = [];
    this.prePwdLink = "";
    this.error = null;
  }

  reset() {
    this.inquiries = [];
    this.activeInquiryId = "";
    this.decisions = [];
    this.prePwdRequests = [];
    this.prePwdLink = "";
    this.error = null;
  }

  async loadInquiryDetail(inquiryId) {
    if (!inquiryId) {
      this.decisions = [];
      this.prePwdRequests = [];
      return;
    }
    const inquiry = this.inquiries.find(item => item.id === inquiryId);
    const [decisions, prePwdRequests] = await Promise.all([
      this.repository.listDecisions(inquiryId),
      inquiry?.inquiry_status === "converted"
        ? this.repository.listPrePwdIntakeRequests(inquiryId)
        : Promise.resolve([])
    ]);
    this.decisions = decisions;
    this.prePwdRequests = prePwdRequests;
  }

  async refresh(preferredInquiryId = this.activeInquiryId) {
    this.error = null;
    this.inquiries = await this.repository.listInquiries();
    this.activeInquiryId = preferredInquiryId && this.inquiries.some(item => item.id === preferredInquiryId)
      ? preferredInquiryId
      : "";
    await this.loadInquiryDetail(this.activeInquiryId);
  }

  async select(inquiryId) {
    this.activeInquiryId = inquiryId || "";
    this.prePwdLink = "";
    await this.loadInquiryDetail(this.activeInquiryId);
  }

  render(workspace, { activeClientId = "", rerender, loadTrainer, onError }) {
    if (this.error) {
      workspace.append(panel("Pierwszy kontakt", create("div", {}, [
        statusBox("Nie udało się wczytać zgłoszeń. Proces wybranego klienta pozostaje dostępny.", "error"),
        button("Ponów odczyt zgłoszeń", {onclick: async () => {
          try { await this.refresh(); } catch (error) { this.error = error; }
          rerender();
        }})
      ])));
      return;
    }
    const refresh = async id => { try { await this.refresh(id); } catch (error) { this.error = error; throw error; } finally { rerender(); } };
    renderInquirySection(workspace, {
      activeClientId,
      inquiries: this.inquiries,
      activeInquiryId: this.activeInquiryId,
      inquiryDecisions: this.decisions,
      prePwdRequests: this.prePwdRequests,
      prePwdLink: this.prePwdLink,
      onSelectInquiry: inquiryId => this.select(inquiryId).then(rerender).catch(error => { this.error = error; rerender(); onError(error); }),
      onSetContactState: async (inquiryId, values) => {
        await this.withWrite("Zapisywanie stanu kontaktu", () => this.repository.setContactState(inquiryId, values), () => refresh(inquiryId));
      },
      onSaveDecision: async (inquiryId, values) => {
        await this.withWrite("Zapisywanie decyzji po rozmowie", () => this.repository.saveDecision(inquiryId, values), () => refresh(inquiryId));
      },
      onConvertInquiry: async inquiryId => {
        await this.withWrite("Tworzenie klienta do PWD", () => this.repository.convertToPwdClient(inquiryId), async result => {
          await refresh(inquiryId);
          await loadTrainer(result?.clientId || "");
        });
      },
      onCreatePrePwdLink: async inquiryId => {
        await this.withWrite("Tworzenie ankiety przed PWD", () => this.repository.createPrePwdIntakeRequest(inquiryId), async result => {
          const token = String(result?.token || "");
          this.prePwdLink = token
            ? `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}ankieta-przed-wpd.html#token=${encodeURIComponent(token)}`
            : "";
          await refresh(inquiryId);
        });
      },
      onMarkPrePwdSent: async requestId => {
        await this.withWrite("Oznaczanie ankiety jako wysłanej", () => this.repository.markPrePwdIntakeSent(requestId), () => refresh(this.activeInquiryId));
      }
    });
  }
}
