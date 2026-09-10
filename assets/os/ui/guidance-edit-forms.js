import { field, submitForm } from "./common.js";
import { guidanceChannelLabel } from "../decision-state.js";
export function planEditForm(plan, model) {
  return submitForm([
    field("Tytuł", "title", "text", { value: plan.title, maxlength: 200 }),
    field("Po co", "focus", "textarea", { value: plan.focus, required: true, maxlength: 4000 }),
    field("Instrukcja ogólna", "instructions", "textarea", { value: plan.instructions, maxlength: 8000 }),
    field("Częstotliwość", "frequency", "text", { value: plan.frequency }),
    field("Czas", "duration", "text", { value: plan.duration }),
    field("Kanał", "guidance_channel", "select", { value: plan.guidance_channel, required: true,
      options: ["paper", "app", "hybrid"].map(value => ({value, label: guidanceChannelLabel(value)})) })
  ], "Zapisz szkic", values => model.onEditGuidanceDraft(plan.id, values));
}

export function itemEditForm(item, model) {
  return submitForm([
    field("Działanie", "name", "text", { value: item.name, required: true, maxlength: 200 }),
    field("Dawka / sposób wykonania", "dosage", "textarea", { value: item.dosage, required: true, maxlength: 4000 }),
    field("Częstotliwość", "frequency", "text", { value: item.frequency }),
    field("Wskazówka", "client_cue", "textarea", { value: item.client_cue, maxlength: 4000 }),
    field("Granica / kiedy przerwać", "stop_criteria", "textarea", { value: item.stop_criteria, required: true, maxlength: 4000 }),
    field("Link do filmu — opcjonalnie", "video_url", "url", { value: item.video_url }),
    field("Uwzględnij w publikacji", "status", "select", { value: item.status,
      options: [{value: "active", label: "Tak"}, {value: "archived", label: "Nie"}] })
  ], "Zapisz działanie", values => model.onEditGuidanceDraftItem(item.id, values));
}

