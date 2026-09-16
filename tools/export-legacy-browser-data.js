const RECOGNIZED_KEYS = Object.freeze([
  "studioLasOS_v3",
  "studioLasExerciseLibraryV1",
  "studioLasGuidance_v1",
  "studioLasGuidancePilot_v1"
]);

const list = document.getElementById("key-list");
const status = document.getElementById("status");
const exportButton = document.getElementById("export-button");

function inspectValue(raw) {
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw);
    let approximateRecords = null;

    if (Array.isArray(parsed)) {
      approximateRecords = parsed.length;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.clients)) approximateRecords = parsed.clients.length;
      else approximateRecords = Object.keys(parsed).length;
    }

    return {
      raw,
      parsed,
      parseStatus: "valid-json",
      approximateRecords,
      byteLength: new TextEncoder().encode(raw).byteLength
    };
  } catch {
    return {
      raw,
      parsed: null,
      parseStatus: "invalid-json",
      approximateRecords: null,
      byteLength: new TextEncoder().encode(raw).byteLength
    };
  }
}

function collect() {
  return RECOGNIZED_KEYS
    .map(key => ({ key, value: inspectValue(localStorage.getItem(key)) }))
    .filter(entry => entry.value !== null);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function render(entries) {
  list.replaceChildren();

  if (!entries.length) {
    list.append(document.createElement("li"));
    list.firstChild.textContent = "Nie znaleziono rozpoznanych kluczy starszej aplikacji na tym urządzeniu i w tej domenie.";
    status.className = "status";
    status.textContent = "Brak danych do eksportu.";
    exportButton.disabled = true;
    return;
  }

  entries.forEach(({ key, value }) => {
    const item = document.createElement("li");
    const recordInfo = value.approximateRecords === null
      ? "liczba rekordów: nierozpoznana"
      : `przybliżona liczba rekordów/elementów: ${value.approximateRecords}`;
    item.textContent = `${key} · ${formatBytes(value.byteLength)} · ${recordInfo} · ${value.parseStatus}`;
    list.append(item);
  });

  const invalidCount = entries.filter(entry => entry.value.parseStatus !== "valid-json").length;
  status.className = invalidCount ? "status error" : "status";
  status.textContent = invalidCount
    ? `Znaleziono ${entries.length} klucze. ${invalidCount} wartości nie można poprawnie zinterpretować jako JSON; backup zachowa ich surową treść do ręcznego przeglądu.`
    : `Znaleziono ${entries.length} rozpoznane źródła danych. Eksport zachowa ich pełną treść bez modyfikacji.`;
  exportButton.disabled = false;
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function exportBackup() {
  const entries = collect();
  if (!entries.length) return;

  exportButton.disabled = true;
  status.className = "status";
  status.textContent = "Przygotowywanie lokalnego pliku backupu…";

  const exportedAt = new Date().toISOString();
  const sources = Object.fromEntries(entries.map(({ key, value }) => [
    key,
    {
      parseStatus: value.parseStatus,
      parsed: value.parsed,
      raw: value.raw
    }
  ]));

  const payloadWithoutChecksum = {
    format: "studio-las-legacy-browser-export",
    formatVersion: 1,
    exportedAt,
    sourceOrigin: window.location.origin,
    recognizedKeys: entries.map(entry => entry.key),
    sources
  };

  const canonical = JSON.stringify(payloadWithoutChecksum, null, 2);
  const checksum = await sha256(canonical);
  const payload = JSON.stringify({
    ...payloadWithoutChecksum,
    sha256OfPayloadWithoutChecksum: checksum
  }, null, 2);

  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const datePart = exportedAt.slice(0, 10);
  anchor.href = url;
  anchor.download = `studio-las-legacy-backup-${datePart}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  status.className = "status";
  status.textContent = `Backup pobrany. SHA-256 treści bazowej: ${checksum}. Narzędzie nie usunęło danych z przeglądarki.`;
  exportButton.disabled = false;
}

exportButton.addEventListener("click", () => {
  exportBackup().catch(error => {
    status.className = "status error";
    status.textContent = `Eksport nie powiódł się: ${error instanceof Error ? error.message : "nieznany błąd"}`;
    exportButton.disabled = false;
  });
});

render(collect());
