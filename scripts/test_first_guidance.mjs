import assert from "node:assert/strict";
import { firstGuidanceInput } from "../assets/os/first-guidance.js";
const result=firstGuidanceInput({title:"First",focus:"Goal",frequency:"2 times",duration:"3 weeks",reviewDate:"2026-10-26",instructions:"Agreed",guidanceChannel:"app",trainer_observation:"PRIVATE",trainer_decision:"PRIVATE"});
assert.equal(result.instructions,"Agreed\n\nTermin przeglądu: 2026-10-26");
assert.ok(!JSON.stringify(result).includes("PRIVATE"));
assert.equal(result.status,undefined);assert.equal(result.published_at,undefined);
assert.throws(()=>firstGuidanceInput({reviewDate:""}),/termin/);
console.log("First guidance: explicit draft content and private-context boundary PASS");
