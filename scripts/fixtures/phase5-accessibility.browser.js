async page => {
 const check=(value,message)=>{if(!value)throw Error(message);};
 const results=[];
 for(const width of [390,768,1440]) {
  await page.setViewportSize({width,height:1000});
  await page.goto("http://127.0.0.1:8793/scripts/fixtures/trainer-recovery.html?mode=failed");
  const disclosure=page.locator("summary").filter({hasText:/^Dodaj obserwację$/});
  await disclosure.focus(); await page.keyboard.press("Enter");
  const name=page.getByLabel("Nazwa obserwacji/testu",{exact:true});
  check(await name.isVisible(),"Keyboard disclosure cannot open");
  check(await page.getByLabel("Jakość/tolerancja",{exact:true}).inputValue()==="","Fabricated tolerance");
  await page.getByRole("button",{name:"Zapisz obserwację",exact:true}).click();
  check(await name.evaluate(node=>document.activeElement===node && !node.validity.valid),"Invalid required field not identified/focused");
  await page.keyboard.press("Tab");
  check(await page.evaluate(()=>document.activeElement.name==="side"),"Keyboard sequence broken");
  check(await page.getByRole("heading",{level:1}).count()===1,"Heading hierarchy missing root");
  const controls=await page.locator("button:visible").evaluateAll(nodes=>nodes.map(node=>({name:node.textContent.trim(),height:node.getBoundingClientRect().height})));
  check(controls.every(control=>control.name && control.height>=44),"Unnamed or undersized button: "+JSON.stringify(controls));
  const outline=await page.getByLabel("Strona",{exact:true}).evaluate(node=>getComputedStyle(node).outlineWidth);
  check(parseFloat(outline)>=3,"Focus outline absent");
  await page.screenshot({path:`output/playwright/phase5-accessibility-${width}.png`});
  results.push({width,buttons:controls.length,focusOutline:outline});
 }
 const ratio=(a,b)=>{const lum=hex=>{const x=hex.match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return x[0]*.2126+x[1]*.7152+x[2]*.0722;};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const contrast={muted:ratio("667067","fffaf1"),error:ratio("a8544b","fffaf1"),primary:ratio("102016","6f8f68")};
 check(Object.values(contrast).every(value=>value>=4.5),"Normal text contrast below 4.5");
 await page.goto("http://127.0.0.1:8793/ankieta-pelna.html");
 check(await page.locator("form,script").count()===0,"Legacy submission still present");
 check(await page.getByRole("link",{name:"Przejdź do formularza kontaktowego"}).getAttribute("href")==="./ankieta-kontakt.html","Retirement lacks canonical route");
 return {result:"PHASE5_ACCESSIBILITY_PASS",results,contrast};
}
