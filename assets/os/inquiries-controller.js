import { InquiryRepository } from "./inquiries-data.js";
import { renderInquirySection } from "./ui/inquiries-section.js";

export class InquiryController {
  constructor(config, auth, withWrite) {
    this.repository = new InquiryRepository(config, auth);
    this.withWrite = withWrite;
    this.inquiries = [];
    this.activeInquiryId = "";
    this.decisions = [];
  }

  reset() {
    this.inquiries = [];
    this.activeInquiryId = "";
    this.decisions = [];
  }

  async refresh(preferredInquiryId = this.activeInquiryId) {
    this.inquiries = await this.repository.listInquiries();
    this.activeInquiryId = preferredInquiryId && this.inquiries.some(item => item.id === preferredInquiryId)
      ? preferredInquiryId
      : "";
    this.decisions = this.activeInquiryId
      ? await this.repository.listDecisions(this.activeInquiryId)
      : [];
  }

  async select(inquiryId) {
    this.activeInquiryId = inquiryId || "";
    this.decisions = this.activeInquiryId
      ? await this.repository.listDecisions(this.activeInquiryId)
      : [];
  }

  render(workspace, { rerender, loadTrainer, onError }) {
    renderInquirySection(workspace, {
      inquiries: this.inquiries,
      activeInquiryId: this.activeInquiryId,
      inquiryDecisions: this.decisions,
      onSelectInquiry: inquiryId => this.select(inquiryId).then(rerender).catch(onError),
      onSetContactState: async (inquiryId, values) => {
        await this.withWrite("Zapisywanie stanu kontaktu", () => this.repository.setContactState(inquiryId, values));
        await this.refresh(inquiryId);
        rerender();
      },
      onSaveDecision: async (inquiryId, values) => {
        await this.withWrite("Zapisywanie decyzji po rozmowie", () => this.repository.saveDecision(inquiryId, values));
        await this.refresh(inquiryId);
        rerender();
      },
      onConvertInquiry: async inquiryId => {
        const result = await this.withWrite("Tworzenie klienta do PWD", () => this.repository.convertToPwdClient(inquiryId));
        await this.refresh(inquiryId);
        await loadTrainer(result?.clientId || "");
      }
    });
  }
}
