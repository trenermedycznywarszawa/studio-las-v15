import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { searchKnowledgeCards } from "../assets/os/ui/knowledge-library.js";

const sample = [
  {
    slk_id: "SLK-000076",
    title: "Zrozumieć ból",
    category: "bol",
    tags: ["ból", "graded exposure"],
    summary: "Wielowymiarowe rozumienie bólu.",
    studio_usefulness: "Spokojna komunikacja i odbudowa zaufania.",
    limitations: "Nie służy do diagnozy."
  },
  {
    slk_id: "SLK-000064",
    title: "Powrót do biegania",
    category: "bieganie",
    tags: ["bieg", "powrót"],
    summary: "Materiał o powrocie do biegania.",
    studio_usefulness: "Pytania do planowania.",
    limitations: "Nie jest indywidualnym planem."
  }
];

assert.equal(searchKnowledgeCards(sample, "ból")[0].slk_id, "SLK-000076");
assert.equal(searchKnowledgeCards(sample, "powrot do biegania")[0].slk_id, "SLK-000064");
assert.deepEqual(searchKnowledgeCards(sample, "b"), []);
assert.equal(searchKnowledgeCards(sample, "brak wyniku").length, 0);

const data = await readFile(new URL("../assets/os/data.js", import.meta.url), "utf8");
const trainer = await readFile(new URL("../assets/os/ui/trainer.js", import.meta.url), "utf8");
const clientRuntime = await readFile(new URL("../assets/os/client-app-runtime.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260923103000_trainer_knowledge_library.sql", import.meta.url), "utf8");

assert.match(data, /READ_ONLY_TABLES = new Set\(\["knowledge_cards"\]\)/);
assert.match(data, /async listKnowledgeCards\(\)/);
assert.match(trainer, /knowledgeLibraryPanel\(model\)/);
const trainerProcessPosition = trainer.indexOf("orderTrainerSections(workspace.client.stage, sections)");
const knowledgePosition = trainer.lastIndexOf("knowledgeLibraryPanel(model)");
assert.ok(trainerProcessPosition >= 0 && knowledgePosition > trainerProcessPosition,
  "client process must remain before the Knowledge Library");
assert.doesNotMatch(clientRuntime, /knowledge_cards|knowledgeLibraryPanel|Biblioteka wiedzy/);
assert.match(migration, /force row level security/i);
assert.match(migration, /private\.is_trainer\(\)/);
assert.match(migration, /private\.trainer_mfa_satisfied\(\)/);
assert.match(migration, /revoke all on table public\.knowledge_cards from public, anon, authenticated/i);
assert.doesNotMatch(migration, /grant (insert|update|delete|all)/i);

console.log("Knowledge Library trainer-only contract: PASS");
