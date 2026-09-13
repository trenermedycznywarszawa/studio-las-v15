import crypto from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, canonicalize(value[key])])
  );
}

export function canonicalQuestionnaireJson(definition) {
  return JSON.stringify(canonicalize(definition));
}

export function questionnaireDefinitionSha256(definition) {
  return crypto
    .createHash("sha256")
    .update(canonicalQuestionnaireJson(definition), "utf8")
    .digest("hex");
}
