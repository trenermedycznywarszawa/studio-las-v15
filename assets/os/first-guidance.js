// A trainer-authored draft. Private PWD interpretation is never copied into client material.
export function firstGuidanceInput(values) {
  const review = String(values.reviewDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review)) throw new Error("Wybierz termin przeglądu.");
  return {
    title: values.title, focus: values.focus, frequency: values.frequency,
    duration: values.duration, guidanceChannel: values.guidanceChannel,
    instructions: `${String(values.instructions || "").trim()}\n\nTermin przeglądu: ${review}`.trim()
  };
}
