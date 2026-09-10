async page => {
 const check=(value,message)=>{if(!value)throw Error(message);};
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:1000});
  await page.goto("http://127.0.0.1:8793/scripts/fixtures/report-evidence.html");
  await page.getByText("Przygotuj raport 12 tygodni",{exact:true}).click();
  for(const name of ["title","start_goal","start_capability","change","interpretation","decision","current_capability","next_step","client_material"])
   await page.locator(`[name=${name}]`).fill(name==="client_material"?"Fikcyjny materiał dla klienta.\nUstalony następny krok.":`Ręcznie napisane: ${name}`);
  for(let index=0;index<3;index++)await page.locator(`[name=evidence_${index}]`).check();
  await page.getByRole("button",{name:"Zapisz szkic raportu",exact:true}).click();
  await page.getByText("Szkic — nieopublikowany",{exact:true}).waitFor();
  check(await page.getByRole("button",{name:"Opublikuj zatwierdzony raport",exact:true}).count()===0,"Draft bypasses approval");
  await page.getByRole("button",{name:"Zatwierdź dokładnie ten raport",exact:true}).click();
  await page.getByText("Zatwierdzony — jeszcze nieopublikowany",{exact:true}).waitFor();
  check(await page.getByText("Opublikowany klientowi",{exact:true}).count()===0,"Approval auto-publishes");
  await page.getByText("Interpretacja, decyzja i zachowane źródła — tylko trener",{exact:true}).click();
  check(await page.locator(".report-record").getByText("Fikcyjne źródło 1",{exact:true}).isVisible(),"Dated evidence unavailable");
  await page.getByRole("button",{name:"Opublikuj zatwierdzony raport",exact:true}).click();
  await page.getByText("Opublikowany klientowi",{exact:true}).waitFor();
  check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),"Report overflow "+width);
  await page.screenshot({path:`output/playwright/report-evidence-${width}.png`});
  await page.getByText("Wycofaj raport z widoku klienta",{exact:true}).click();
  await page.getByLabel("Powód wycofania",{exact:true}).fill("Fikcyjna korekta wymaga nowego szkicu");
  await page.getByRole("button",{name:"Wycofaj raport",exact:true}).click();
  await page.getByText("Wycofany z widoku klienta",{exact:true}).waitFor();
 }
 await page.goto("http://127.0.0.1:8793/scripts/fixtures/report-evidence.html?insufficient");
 check(await page.getByRole("button",{name:"Zapisz szkic raportu",exact:true}).count()===0,"Insufficient sources encourage fabricated report");
 return "REPORT_EVIDENCE_BROWSER_PASS: manual draft/approval/publication/withdrawal at 390/768/1440";
}
