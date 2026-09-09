// Run with playwright-cli run-code --filename against publication-history.html.
async page => {
 const check = (condition, message) => { if (!condition) throw Error(message); };
 for (const width of [390, 768, 1440]) {
  await page.setViewportSize({width,height:1000});
  await page.reload();
  await page.getByText("Edytuj szkic", {exact:true}).click();
  await page.getByRole("textbox", {name:"Po co",exact:true}).fill("Niezapisana zmiana");
  check(await page.getByRole("button", {name:"Najpierw zapisz zmiany w szkicu"}).isDisabled(), "Dirty prescription approval enabled");
  await page.reload();
  await page.getByText("Odpowiedzi klienta i osobne uzupełnienia", {exact:true}).click();
  await page.getByText("Dodaj korektę z powodem", {exact:true}).click();
  await page.getByRole("textbox", {name:"Uzupełnienie wypowiedzi klienta",exact:true}).fill("Klient wyjaśnił: jedna minuta.");
  await page.getByRole("textbox", {name:"Powód korekty / źródło wyjaśnienia",exact:true}).fill("Fikcyjna rozmowa wyjaśniająca.");
  check(await page.getByRole("button", {name:"Zatwierdź tę treść do publikacji",exact:true}).isEnabled(), "Unrelated correction disabled approval");
  await page.getByRole("button", {name:"Dodaj osobny zapis",exact:true}).click();
  await page.getByText("Odpowiedzi klienta i osobne uzupełnienia", {exact:true}).click();
  await page.getByText("Dodaj interpretację trenera", {exact:true}).click();
  await page.getByRole("textbox", {name:"Interpretacja trenera",exact:true}).fill("Fikcyjna interpretacja: omówić dawkę.");
  check(await page.getByRole("button", {name:"Zatwierdź tę treść do publikacji",exact:true}).isEnabled(), "Interpretation disabled approval");
  await page.getByRole("button", {name:"Dodaj osobny zapis",exact:true}).click();
  await page.getByRole("button", {name:"Zatwierdź tę treść do publikacji",exact:true}).click();
  check(await page.getByRole("button", {name:"Opublikuj jako aktualną wskazówkę",exact:true}).isVisible(), "Separate publication absent");
  check(await page.getByText("Edytuj szkic", {exact:true}).count()===0, "Approved plan editable");
  check(await page.getByText("Edytuj działanie", {exact:true}).count()===0, "Approved item editable");
  await page.getByText("Odpowiedzi klienta i osobne uzupełnienia", {exact:true}).click();
  for (const text of ["Wykonane · Fikcyjna odpowiedź: dwie minuty","Klient wyjaśnił: jedna minuta.","Fikcyjna interpretacja: omówić dawkę.","Ówczesna wskazówka: 2 minuty · Przerwij przy nowym objawie"]) {
   check(await page.getByText(text, {exact:true}).isVisible(), "Missing semantic record: "+text);
  }
  check(await page.getByText(/^Autor: Trener testowy/).count()===2, "Later records lack attribution");
  check(!(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)), "Horizontal overflow at "+width);
  await page.screenshot({path:"output/playwright/semantic-history-"+width+".png",fullPage:true});
 }
 console.log("SEMANTIC_HISTORY_UI_PASS: all seven conditions at 390/768/1440");
}
