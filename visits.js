(() => {
  'use strict';
  const counter=document.querySelector('#visitCounter');
  const value=document.querySelector('#visitCount');
  if(!counter||!value)return;

  fetch('/api/visits',{method:'POST',headers:{Accept:'application/json'},cache:'no-store'})
    .then(response=>{
      if(!response.ok)throw new Error(`Visit counter returned ${response.status}`);
      return response.json();
    })
    .then(data=>{
      if(!Number.isSafeInteger(data.count)||data.count<1)throw new Error('Invalid visit count');
      value.textContent=new Intl.NumberFormat('zh-CN').format(data.count);
      counter.dataset.state='ready';
      counter.setAttribute('aria-label',`网站累计访问 ${value.textContent} 次`);
    })
    .catch(error=>{
      counter.dataset.state='error';
      console.warn('Visit counter unavailable:',error);
    });
})();
