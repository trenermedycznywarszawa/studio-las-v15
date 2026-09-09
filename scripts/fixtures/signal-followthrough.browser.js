async page => {
 const check=(v,m)=>{if(!v)throw Error(m);};
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:1000});await page.reload();
  check(await page.getByText("Zapisz wynik przeglądu",{exact:true}).count()===2,"Same-day sources collapsed");
  await page.getByText("Zapisz wynik przeglądu",{exact:true}).first().click();
  await page.getByRole("combobox",{name:"Wynik przeglądu",exact:true}).first().selectOption("contact_required");
  await page.getByRole("button",{name:"Zapisz wynik",exact:true}).first().click();
  check(await page.getByText("Kontakt nadal wymagany",{exact:true}).isVisible(),"Required contact disappeared");
  await page.getByRole("button",{name:"Pokaż nowszą obserwację",exact:true}).click();
  check(await page.getByText("Kontakt nadal wymagany",{exact:true}).isVisible(),"New source hid old pending contact");
  await page.getByText("Potwierdź wykonany kontakt",{exact:true}).click();
  await page.getByRole("textbox",{name:"Co ustalono po kontakcie?",exact:true}).fill("Fikcyjny kontakt: wyjaśniono reakcję.");
  await page.getByRole("button",{name:"Zapisz potwierdzenie kontaktu",exact:true}).click();
  check(await page.getByText("Kontakt nadal wymagany",{exact:true}).count()===0,"Confirmed contact remains unresolved");
  await page.getByText("Pokaż historię przejrzanych sygnałów",{exact:true}).click();
  check(await page.getByText(/Kontakt potwierdzony:.*Fikcyjny kontakt/).isVisible(),"Contact evidence absent from history");
  check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),"Overflow at "+width);
  await page.screenshot({path:"output/playwright/signal-followthrough-"+width+".png",fullPage:true});
 }
 console.log("SIGNAL_FOLLOWTHROUGH_BROWSER_PASS");
}
