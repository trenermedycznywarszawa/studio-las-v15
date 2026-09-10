// Ephemeral UI state only: never persist response text or receipts in browser storage.
export class ClientPortalController {
  constructor(repository, onChange, makeId = () => crypto.randomUUID()) {
    this.repository = repository; this.onChange = onChange; this.makeId = makeId;
    this.snapshot = null; this.responses = {}; this.error = ""; this.loading = false; this.disposed = false; this.readVersion = 0;
  }
  emit() { if (!this.disposed) this.onChange({snapshot:this.snapshot,responseStates:this.responses,error:this.error,loading:this.loading}); }
  reset() { this.disposed = true; this.snapshot = null; this.responses = {}; }
  async load(afterSave = null) {
    const version = ++this.readVersion;
    this.loading = true; this.error = ""; this.emit();
    try {
      const snapshot = await this.repository.getClientPortalSnapshot();
      if (this.disposed || version !== this.readVersion) return;
      this.snapshot = snapshot;
      for (const [id, entry] of Object.entries(this.responses)) {
        const saved = snapshot.homePlan?.items?.find(item => item.id === id)?.todayResponse;
        if (saved) { entry.status = "saved"; entry.receipt = saved; continue; }
        if (entry.receipt && entry.receipt.eventDate !== snapshot.serverDate) { delete this.responses[id]; continue; }
        if (!entry.receipt && entry.serverDate && entry.serverDate !== snapshot.serverDate) {
          entry.status = "failed";
          entry.message = "Nie udało się potwierdzić odpowiedzi z poprzedniego dnia. Nie wysyłamy jej jako dzisiejszej. Jeśli chcesz odpowiedzieć dziś, sprawdź treść i zapisz ją ponownie.";
        }
      }
    } catch (error) {
      if (this.disposed || version !== this.readVersion) return;
      if ([401,403].includes(Number(error.status))) {
        this.snapshot = null; this.responses = {};
        this.error = "Nie można potwierdzić dostępu. Zaloguj się ponownie lub skontaktuj się z Damianem.";
      } else {
        this.error = afterSave ? "Odpowiedź została zapisana. Nie udało się odświeżyć widoku. Nie wysyłaj jej ponownie." : "Nie udało się odświeżyć danych. Możesz spróbować ponownie.";
        if (afterSave && this.responses[afterSave]) this.responses[afterSave].status = "saved_refresh_failed";
      }
    } finally { if (version === this.readVersion) { this.loading = false; this.emit(); } }
  }
  async submit(itemId, text) {
    const existing = this.responses[itemId];
    if (existing && ["saving","saved","saved_refresh_failed"].includes(existing.status)) return;
    const item = this.snapshot?.homePlan?.items?.find(row => row.id === itemId);
    if (item?.todayResponse) return;
    if (!item && existing?.status !== "uncertain") return;
    const entry = existing?.status === "uncertain" ? existing : {
      homePlanItemId:itemId, homePlanId:this.snapshot.homePlan.id,
      response:String(text || "").trim(), submissionId:this.makeId(), serverDate:this.snapshot.serverDate
    };
    entry.status = "saving"; entry.message = ""; this.responses[itemId] = entry; this.emit();
    try {
      const receipt = await this.repository.saveClientCheckin(entry);
      if (this.disposed) return;
      if (!receipt?.id || !receipt?.savedAt) throw new Error("Missing save receipt");
      entry.receipt = receipt; entry.status = "saved"; this.emit();
    } catch (error) {
      if (this.disposed) return;
      const status = Number(error.status || 0);
      if ([401,403].includes(status)) { this.snapshot = null; this.responses = {}; this.error = "Nie można potwierdzić dostępu. Zaloguj się ponownie."; }
      else {
        entry.status = status >= 400 && status < 500 && ![408,409,429].includes(status) ? "failed" : "uncertain";
        entry.message = entry.status === "failed" ? "Odpowiedź nie została zapisana. Sprawdź treść i odśwież ustalenia przed ponowieniem." : "Nie udało się potwierdzić zapisu. Zachowaliśmy tę próbę; sprawdź ją przed wysłaniem kolejnej odpowiedzi.";
      }
      this.emit(); return;
    }
    await this.load(itemId);
  }
  async retry(itemId) {
    await this.load();
    if (!this.error && this.responses[itemId]?.status === "uncertain") await this.submit(itemId);
  }
}
