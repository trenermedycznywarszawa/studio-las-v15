async page => {
 const check=(value,message)=>{if(!value)throw Error(message);};
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:1000});
  for(const mode of ["initial","secondary","success","failed","refresh","uncertain"]) {
   await page.goto("http://127.0.0.1:8793/scripts/fixtures/trainer-recovery.html?mode="+mode);
   if(mode==="initial") { await page.getByText("Nie udało się wczytać procesu. Spróbuj ponownie.",{exact:true}).waitFor(); await page.getByRole("button",{name:"Odśwież",exact:true}).click(); }
   await page.getByRole("heading",{name:"Teraz",exact:true}).waitFor();
   if(mode==="secondary") { await page.getByRole("button",{name:"Ponów odczyt sekcji",exact:true}).click(); check(await page.getByRole("button",{name:"Ponów odczyt sekcji",exact:true}).count()===0,"Section retry failed"); }
   await page.getByText("Dodaj sesję",{exact:true}).click();
   await page.getByText("Dodatkowe obserwacje — tylko gdy wpływają na decyzję",{exact:true}).click();
   check(await page.getByLabel("Sen",{exact:true}).inputValue()==="","Fabricated sleep");
   await page.getByLabel("Obserwacja trenera",{exact:true}).fill("Fikcyjna obserwacja");
   await page.getByRole("button",{name:"Zapisz sesję w Supabase",exact:true}).click();
   if(mode==="failed") check(await page.getByLabel("Obserwacja trenera",{exact:true}).inputValue()==="Fikcyjna obserwacja","Write failure lost draft");
   if(["refresh","uncertain"].includes(mode)) {
    check(await page.getByRole("button",{name:"Sprawdź aktualny zapis",exact:true}).isVisible(),"Missing read-only recovery");
    await page.getByRole("button",{name:"Sprawdź aktualny zapis",exact:true}).click();
    check(await page.evaluate(()=>window.fixtureWrites())===1,"Recovery repeated mutation");
   }
   check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),"Overflow "+width+" "+mode);
   await page.getByRole("button",{name:"Odśwież",exact:true}).focus();
   check(await page.evaluate(()=>document.activeElement.textContent==="Odśwież"),"Keyboard focus missing");
  }
 }
 return "TRAINER_RECOVERY_BROWSER_PASS: six modes at 390/768/1440";
}
