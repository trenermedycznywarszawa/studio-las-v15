import { collectWorkspaceSignals } from "../../assets/os/trainer-signals.js";
import { withoutReviewedSignals } from "../../assets/os/decision-support.js";
import { signalsSection } from "../../assets/os/ui/trainer-state.js";
import { button } from "../../assets/os/ui/common.js";
const workspace={sessions:[{id:"source-a",date:"2026-09-09",readiness:2,updated_at:"2026-09-09T09:00:00Z"},{id:"source-b",date:"2026-09-09",readiness:2,updated_at:"2026-09-09T10:00:00Z"}],signalReviews:[]};
const model={
 async onReviewSignal(key,outcome){workspace.signalReviews.push({id:crypto.randomUUID(),signal_key:key,outcome,reviewed_at:new Date().toISOString()});render();},
 async onResolveSignalContact(id,note){Object.assign(workspace.signalReviews.find(r=>r.id===id),{contact_resolved_at:new Date().toISOString(),contact_resolution_note:note});render();}
};
function render(){document.getElementById("fixture-root").replaceChildren(
 button("Pokaż nowszą obserwację",{onclick:()=>{workspace.sessions=[{id:"source-new",date:"2026-09-10",readiness:2}];render();}}),
 signalsSection(workspace,withoutReviewedSignals(collectWorkspaceSignals(workspace),workspace.signalReviews),model));}
render();
