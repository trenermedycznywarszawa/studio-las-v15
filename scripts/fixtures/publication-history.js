import { plansSection } from "../../assets/os/ui/trainer-guidance.js";
const plan = {id:"draft",status:"draft",title:"Fikcyjna wskazówka",focus:"Spokojny powrót do spacerów",instructions:"Przejdź po równym podłożu.",guidance_channel:"app",content_revision:2};
const item = {id:"item",home_plan_id:"draft",name:"Krótki spacer",dosage:"3 minuty",stop_criteria:"Przerwij przy nowym objawie",status:"active"};
const original = {id:"event",home_plan_item_id:"old-item",event_date:"2026-09-08",completed:true,payload:{note:"Fikcyjna odpowiedź: dwie minuty"},guidance_observation_notes:[]};
const workspace = {homePlans:[plan],homePlanItems:[item,{...item,id:"old-item",home_plan_id:"old-plan",dosage:"2 minuty"}],guidanceEvents:[original]};
const root = document.getElementById("fixture-root");
const model = {
 async onApproveHomePlan(id, revision) { if(id!==plan.id || revision!==2) throw Error("Wrong reviewed revision"); plan.approved_at=new Date().toISOString(); render(); },
 async onPublishHomePlan() { if(!plan.approved_at) throw Error("Unapproved"); plan.status="active"; plan.published_at=new Date().toISOString(); render(); },
 async onEditGuidanceDraft(id, values) { Object.assign(plan,values); render(); },
 async onEditGuidanceDraftItem(id, values) { Object.assign(item,values); render(); },
 async onAddObservationNote(id, values) { if(id!==original.id) throw Error("Wrong source"); original.guidance_observation_notes.push({...values,created_by:"fictional-trainer",profiles:{display_name:"Trener testowy"},created_at:new Date().toISOString()}); render(); },
 onCloneHomePlan(){},onSaveHomePlan(){},onSaveHomePlanItem(){},onWithdrawHomePlan(){},onRecordGuidanceDelivery(){}
};
function render(){root.replaceChildren(plansSection(workspace,model));}
render();
