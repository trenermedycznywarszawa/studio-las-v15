import { ClientPortalController } from "../../assets/os/client-portal-controller.js";
import { renderClient } from "../../assets/os/ui/client.js";
const mode = new URLSearchParams(location.search).get("mode") || "success";
const snapshot = {serverDate:"2026-09-09",client:{firstName:"Anna Testowa",goal:"Swobodny spacer do parku",stageLabel:"Aktualny kierunek",nextSessionDate:"2026-09-12"},homePlan:mode==="rest"?null:{id:"plan",title:"Spokojny spacer",focus:"Żeby pewniej wyjść do parku",instructions:"Wybierz równe podłoże.",guidanceChannel:"app",items:[{id:"item",name:"Krótki spacer",dosage:"3 minuty",clientCue:"Uzgodniona krótsza wersja: 1 minuta, jeśli potrzebujesz.",stopCriteria:"Przerwij przy nowym objawie",todayResponse:null}]},reports:[],measurements:[]};
let calls=0; let reads=0;
const repo={
 async getClientPortalSnapshot(){reads++;if(mode==="initial-failure"&&reads===1)throw Error("offline");if(mode==="refresh-failure"&&calls>0)throw Error("refresh failed");return structuredClone(snapshot);},
 async saveClientCheckin(input){calls++;if(mode==="save-failure")throw {status:400};
  const receipt={id:input.submissionId,eventDate:snapshot.serverDate,savedAt:new Date().toISOString(),text:input.response};
  snapshot.homePlan.items[0].todayResponse=receipt;
  if(mode==="uncertain"&&calls===1)throw Error("response lost after commit");return receipt;
 }
};
const controller=new ClientPortalController(repo,view=>renderClient(document.getElementById("fixture-root"),{...view,onReload:()=>controller.load(),onLogout:()=>{},onSaveCheckin:(id,text)=>controller.submit(id,text),onRetryResponse:id=>controller.retry(id)}));
window.fixtureWriteCount=()=>calls;
controller.load();
