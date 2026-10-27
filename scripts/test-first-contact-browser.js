// Playwright CLI run-code --filename. Load the local candidate page first.
// All submission transport is intercepted: never sends to production.
async (page) => {
  const submissions=[];
  let failOnce=false;
  await page.route('https://ufcumhbnuyernuwepcij.supabase.co/functions/v1/public-inquiry-ingress',async route=>{
    if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type,accept','access-control-allow-methods':'POST,OPTIONS'}});
    submissions.push(route.request().postDataJSON());
    const status=failOnce?503:202; failOnce=false;
    await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:status===202})});
  });
  const ensure=(value,message)=>{if(!value) throw Error(message)};
  for(const method of ['phone','sms','email']) {
    await page.reload();
    await page.getByRole('textbox',{name:'Imię *',exact:true}).fill('Test syntetyczny');
    await page.getByRole('radio',{name:{phone:'Zadzwoń do mnie',sms:'Najpierw napisz SMS',email:'Napisz e-mail'}[method],exact:true}).check();
    if(method==='email'){
      await page.getByRole('textbox',{name:'Adres e-mail *',exact:true}).fill('invalid');
    }else{
      await page.getByRole('textbox',{name:'Numer telefonu *',exact:true}).fill('600123456');
    }
    if(method==='phone'){
      await page.getByRole('combobox').selectOption('before_12');
      await page.getByRole('checkbox',{name:'Chcę zacząć regularnie się ruszać lub wrócić do aktywności',exact:true}).check();
      await page.getByRole('checkbox',{name:'Chcę schudnąć lub poprawić sylwetkę',exact:true}).check();
    }
    await page.getByRole('checkbox',{name:/Proszę o kontakt w sprawie Studio Las/}).check();
    if(method==='email'){
      const count=submissions.length;
      await page.getByRole('button',{name:'Poproś o kontakt →',exact:true}).click();
      ensure(submissions.length===count,'Invalid email reached transport');
      await page.getByRole('textbox',{name:'Adres e-mail *',exact:true}).fill('synthetic@example.invalid');
      failOnce=true;
      await page.getByRole('button',{name:'Poproś o kontakt →',exact:true}).click();
      await page.getByText(/Nie udało się wysłać formularza/).waitFor();
    }
    await page.getByRole('button',{name:'Poproś o kontakt →',exact:true}).click();
    await page.getByRole('heading',{name:'Dziękuję. Mam Twoje zgłoszenie.'}).waitFor();
    const body=submissions.at(-1);
    ensure(body.contactMethod===method,'Wrong channel');
    ensure(body.personWords===null,'Free message sent');
    ensure(body.broadGoals.length===(method==='phone'?2:0),'Goals lost');
    ensure(method==='email'?body.phone===null:body.email===null,'Unneeded contact sent');
    if(method==='email') ensure(body.requestId===submissions.at(-2).requestId,'Retry changed idempotency key');
  }
  await page.reload();
  await page.setViewportSize({width:390,height:844});
  ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile horizontal overflow');
  return {status:'PASS', submissions:submissions.length, cases:['phone','sms','email','multiple goals','zero goals','invalid email','failed-request retry','same idempotency key','390px width'],transport:'mocked'};
}
