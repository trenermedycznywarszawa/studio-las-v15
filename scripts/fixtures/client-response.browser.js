async page => {
 const base="http://127.0.0.1:8793/scripts/fixtures/client-response.html";
 const check=(value,message)=>{if(!value)throw Error(message);};
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:1000});
  for(const mode of ["success","refresh-failure","save-failure","uncertain","initial-failure","rest"]) {
   await page.goto(base+"?mode="+mode);
   if(mode==="initial-failure") {
    check(await page.getByText("Nie udało się odświeżyć danych. Możesz spróbować ponownie.",{exact:true}).isVisible(),"Initial failure hidden");
    await page.getByRole("button",{name:"Odśwież",exact:true}).click();
   }
   if(mode==="rest") {check(await page.getByRole("textbox").count()===0,"Artificial rest-day form");continue;}
   const input=page.getByRole("textbox",{name:"Twoja odpowiedź — opcjonalnie",exact:true});
   const action=await page.getByRole("heading",{name:"Spokojny spacer",exact:true}).boundingBox();
   const response=await input.boundingBox();
   check(action.y<response.y,"Response precedes guidance");
   check(await page.getByRole("spinbutton").count()===0,"Mandatory wellness measures remain");
   check(await page.getByRole("link",{name:"Zadzwoń do Damiana",exact:true}).isVisible(),"Contact absent");
   await input.fill("Fikcyjna odpowiedź: krótsza wersja zgodnie z ustaleniem.");
   await page.getByRole("button",{name:"Zapisz odpowiedź",exact:true}).click();
   if(mode==="save-failure") {
    check(await input.inputValue()==="Fikcyjna odpowiedź: krótsza wersja zgodnie z ustaleniem.","Failed write lost text");
    check(await page.getByText(/^Odpowiedź nie została zapisana/).isVisible(),"Definite failure hidden");
   } else {
    if(mode==="uncertain") {
     check(await page.getByRole("button",{name:"Zapisz odpowiedź",exact:true}).count()===0,"Blind duplicate available");
     await page.getByRole("button",{name:"Sprawdź i ponów ten sam zapis",exact:true}).click();
     check(await page.evaluate(()=>window.fixtureWriteCount())===1,"Lost receipt caused duplicate write");
    }
    check(await page.getByText(/^Odpowiedź zapisana ·/).isVisible(),"Saved receipt hidden");
    check(await page.getByRole("button",{name:"Zapisz odpowiedź",exact:true}).count()===0,"Saved form can resubmit");
    if(mode==="refresh-failure")check(await page.getByText(/^Odpowiedź została zapisana. Nie udało się odświeżyć/).isVisible(),"Saved/refresh-failed conflated");
   }
   check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),"Overflow at "+width+" "+mode);
   if(["success","refresh-failure"].includes(mode))await page.screenshot({path:"output/playwright/client-response-"+mode+"-"+width+".png",fullPage:true});
  }
 }
 console.log("CLIENT_RESPONSE_BROWSER_PASS: six states at 390/768/1440");
}
