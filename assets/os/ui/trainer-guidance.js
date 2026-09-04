import {
  guidanceChannelLabel,
  guidanceDeliveryLabel,
  guidanceStatusLabel
} from "../decision-state.js";
import { homePlanForm, homePlanItemForm } from "./forms.js";
import { button, create, detailsForm, panel, recordList } from "./common.js";

function guidancePlanCard(plan, model, hasDraftSuccessor) {
  const paperChannel = ["paper", "hybrid"].includes(plan.guidance_channel);
  const retirementConfirmed = plan.delivery_status === "paper_retirement_confirmed";
  const retirementRequired = plan.status === "active" && paperChannel && hasDraftSuccessor && !retirementConfirmed;
  const deliveryFinished = ["recorded", "paper_retirement_confirmed"].includes(plan.delivery_status);
  const delivery = create("select", { "aria-label": "Status dostarczenia wskazówki" }, [
    { value: "pending", text: "Oczekuje na potwierdzenie dostarczenia" },
    { value: "recorded", text: "Dostarczona" },
    { value: "paper_retirement_unresolved", text: "Wycofanie poprzedniej kopii jeszcze niepotwierdzone" }
  ].map(option => create("option", option)));
  delivery.value = ["pending", "recorded", "paper_retirement_unresolved"].includes(plan.delivery_status)
    ? plan.delivery_status
    : "pending";

  const deliveryLabel = !hasDraftSuccessor && plan.delivery_status === "paper_retirement_unresolved"
    ? "Oczekuje na potwierdzenie dostarczenia"
    : guidanceDeliveryLabel(plan.delivery_status);
  const actions = [];
  if (plan.status === "draft") {
    actions.push(button("Opublikuj jako aktualną wskazówkę", {
      className: "button primary",
      onclick: () => model.onPublishHomePlan(plan.id)
    }));
  }
  if (plan.status === "active") {
    if (retirementRequired) {
      actions.push(button("Potwierdź wycofanie poprzedniej kopii papierowej", {
        onclick: () => model.onConfirmHomePlanPaperRetirement(plan.id)
      }));
    }
    if (!deliveryFinished) {
      actions.push(button("Zapisz dostarczenie", {
        onclick: () => model.onRecordGuidanceDelivery(plan.id, delivery.value)
      }));
    }
    actions.push(button("Wycofaj wskazówkę", {
      className: "button danger",
      onclick: () => model.onWithdrawHomePlan(plan.id)
    }));
  }

  return create("article", { className: "record guidance-record" }, [
    create("strong", { text: plan.title || "Wskazówka" }),
    create("p", { text: plan.focus || "Brak celu wskazówki" }),
    create("div", { className: "guidance-state" }, [
      create("span", { text: `Wersja ${plan.release_version || 1}` }),
      create("span", { text: guidanceStatusLabel(plan.status) }),
      create("span", { text: guidanceChannelLabel(plan.guidance_channel) }),
      create("span", { text: deliveryLabel })
    ]),
    retirementRequired
      ? create("p", { className: "muted", text: "Przed publikacją następcy trener potwierdza wycofanie poprzedniej kopii papierowej." })
      : null,
    paperChannel && hasDraftSuccessor && retirementConfirmed
      ? create("p", { className: "muted", text: "Wycofanie poprzedniej kopii papierowej: potwierdzone." })
      : null,
    plan.status === "active" && !deliveryFinished ? delivery : null,
    actions.length ? create("div", { className: "form-actions guidance-actions" }, actions) : null
  ]);
}

function draftItemsGroup(plan, items) {
  const ownItems = (items || []).filter(item => item.home_plan_id === plan.id);
  return create("section", { className: "draft-items-group" }, [
    create("h4", { text: `Szkic: ${plan.title || "Bez nazwy"}` }),
    recordList(ownItems, item => create("article", { className: "record" }, [
      create("strong", { text: item.name }),
      create("p", { text: [item.dosage, item.frequency].filter(Boolean).join(" · ") || "Brak dawkowania" }),
      create("p", { className: "muted", text: [item.client_cue, item.stop_criteria].filter(Boolean).join(" · ") || "Brak celu lub granicy" })
    ]), "Brak działań w tym szkicu.")
  ]);
}

export function plansSection(workspace, model) {
  const plans = [...(workspace.homePlans || [])].sort((left, right) => {
    if (left.status === "active") return -1;
    if (right.status === "active") return 1;
    return String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });
  const drafts = plans.filter(plan => plan.status === "draft");
  const planColumn = create("div", {}, [
    create("h3", { text: "Aktualne prowadzenie i historia" }),
    create("p", { className: "muted", text: "Trener podejmuje decyzję o publikacji, zastąpieniu, wycofaniu i kanale. System nie rekomenduje decyzji medycznej." }),
    recordList(plans, plan => guidancePlanCard(plan, model, drafts.length > 0), "Brak wskazówki."),
    detailsForm("Utwórz szkic wskazówki", homePlanForm(model.onSaveHomePlan))
  ]);
  const items = create("div", {}, [
    create("h3", { text: "Działania w szkicach" }),
    drafts.length
      ? create("div", { className: "draft-items" }, drafts.map(plan => draftItemsGroup(plan, workspace.homePlanItems)))
      : create("p", { className: "muted", text: "Brak szkicu, do którego można dodać działanie." }),
    drafts.length
      ? detailsForm("Dodaj działanie do szkicu", homePlanItemForm(drafts, model.onSaveHomePlanItem))
      : null
  ]);
  return panel("Prowadzenie klienta", create("div", { className: "two-column" }, [planColumn, items]));
}
