const modal=document.querySelector('.modal');
for(const card of document.querySelectorAll('[data-action]'))card.addEventListener('click',()=>{document.querySelector('#modalTitle').textContent=card.dataset.action;modal.classList.add('show');document.querySelector('#requestType').value=card.dataset.action});
for(const node of document.querySelectorAll('[data-close]'))node.addEventListener('click',()=>modal.classList.remove('show'));
modal?.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
document.querySelector('#requestForm')?.addEventListener('submit',e=>{e.preventDefault();alert('Заявка подготовлена. Подключение оплаты и проверки аккаунта появится после настройки сервера.');modal.classList.remove('show')});
