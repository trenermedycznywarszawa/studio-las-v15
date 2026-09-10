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
    this.error = null;
  }

  reset() {
    this.inquiries = [];
    this.activeInquiryId = "";
    this.decisions = [];
    this.error = null;
  }

  async refresh(preferredInquiryId = this.activeInquiryId) {
    this.error = null;
    this.inquiries = await this.repository.listInquiries();
    this.activeInquiryId = preferredInquiryId && this.inquiries.some(item => item.id === preferredInquiryId)
      ? preferredInquiryId
      : "";
    this.decisions = this.activeInquiryId
      ? await this.repository.listDecisions(this.activeInquiryId)
      : [];
  }

  async select(inquiryId) {
    this.decisions = [];
    this.activeInquiryId = inquiryId || "";
    this.decisions = this.activeInquiryId
      ? await this.repository.listDecisions(this.activeInquiryId)
      : [];
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
      }
    });
  }
}
