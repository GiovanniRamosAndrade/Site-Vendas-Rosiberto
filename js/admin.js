(() => {
  const key = 'vitrine-draft-v1';
  const publishKey = new URLSearchParams(location.hash.slice(1)).get('chave') || '';
  const base = window.VITRINE_DADOS || {siteTitle:'Produtos e promoções',brand:'#7c442b',products:[]};
  const clone = value => JSON.parse(JSON.stringify(value));
  let data = clone(base);
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Array.isArray(saved.products)) data = saved;
  } catch (_) { /* Começa com a versão publicada. */ }
  let selected = data.products[0]?.id || null;
  const $ = selector => document.querySelector(selector);
  const form = $('#editor');
  const status = $('#status');
  const linkList = $('#link-list');
  const uid = () => 'card-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const current = () => data.products.find(p => p.id === selected);
  function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(data)); message('Rascunho salvo neste navegador.'); return true; }
    catch (_) { message('Espaço do navegador insuficiente. Use URLs para as imagens e baixe um backup.', true); return false; }
  }
  function validHttp(raw) {
    try { return ['http:', 'https:'].includes(new URL(raw).protocol); } catch (_) { return false; }
  }
  function renderList() {
    const list = $('#product-list'); list.replaceChildren();
    $('#product-count').textContent = data.products.length;
    data.products.forEach(p => {
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'product-item' + (p.id === selected ? ' selected' : '');
      const name = document.createElement('strong'); name.textContent = p.title || 'Card sem título';
      const detail = document.createElement('small'); detail.textContent = `${p.category || 'Sem categoria'} · ${(p.links || []).length} link(s)`;
      button.append(name, detail);
      button.addEventListener('click', () => { if (selected !== p.id && !commit()) return; selected = p.id; render(); });
      list.append(button);
    });
  }
  function addLinkRow(link = {}) {
    const row = document.createElement('div'); row.className = 'link-row';
    row.innerHTML = '<label>Loja<input name="loja" maxlength="80" placeholder="Shopee"></label><label>Nome do item<input name="nome" maxlength="160" placeholder="Nome do produto"></label><label>Link de compra<input name="url" type="url" placeholder="https://..."></label><button type="button" class="button danger remove-link" aria-label="Remover link">Remover</button>';
    for (const field of ['loja', 'nome', 'url']) row.querySelector(`[name="${field}"]`).value = link[field] || '';
    row.querySelector('button').addEventListener('click', () => row.remove());
    linkList.append(row);
  }
  function render() {
    $('#site-title').value = data.siteTitle || '';
    $('#brand').value = /^#[\da-f]{6}$/i.test(data.brand) ? data.brand : '#7c442b';
    document.documentElement.style.setProperty('--brand', $('#brand').value);
    renderList();
    const p = current(); form.hidden = !p;
    if (!p) return;
    $('#editor-heading').textContent = 'Editar card';
    for (const field of ['title','category','subtitle','img']) form.elements[field].value = p[field] || '';
    form.elements.pinned.checked = !!p.pinned;
    linkList.replaceChildren(); (p.links || []).forEach(addLinkRow);
    updatePreview();
    const datalist = $('#categories'); datalist.replaceChildren();
    [...new Set(data.products.map(item => item.category).filter(Boolean))].forEach(value => {
      const option = document.createElement('option'); option.value = value; datalist.append(option);
    });
  }
  function updatePreview() {
    const img = $('#image-preview');
    const src = form.elements.img.value.trim();
    const valid = validHttp(src) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(src);
    img.hidden = !valid;
    if (valid) img.src = src;
    else img.removeAttribute('src');
  }
  function commit() {
    const p = current(); if (!p) return true;
    const title = form.elements.title.value.trim();
    if (!title) { message('Informe o título do card.', true); form.elements.title.focus(); return false; }
    const img = form.elements.img.value.trim();
    if (img && !validHttp(img) && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(img)) {
      message('A imagem precisa ser um endereço https:// ou uma foto selecionada.', true); form.elements.img.focus(); return false;
    }
    const links = [];
    for (const row of linkList.querySelectorAll('.link-row')) {
      const loja = row.querySelector('[name="loja"]').value.trim();
      const nome = row.querySelector('[name="nome"]').value.trim();
      const url = row.querySelector('[name="url"]').value.trim();
      if (!loja && !nome && !url) continue;
      if (!nome || !validHttp(url)) { message('Cada link precisa do nome do item e de uma URL http(s) válida.', true); row.querySelector('[name="url"]').focus(); return false; }
      links.push({loja, nome, url});
    }
    Object.assign(p, {title, category:form.elements.category.value.trim(), subtitle:form.elements.subtitle.value.trim(), img, pinned:form.elements.pinned.checked, links});
    data.siteTitle = $('#site-title').value.trim() || 'Produtos e promoções';
    data.brand = $('#brand').value;
    return save();
  }
  function download(filename, contents, type) {
    const url = URL.createObjectURL(new Blob([contents], {type}));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  form.addEventListener('submit', event => { event.preventDefault(); if (commit()) render(); });
  form.elements.img.addEventListener('input', updatePreview);
  $('#image-upload').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (!file.type.startsWith('image/')) throw Error('Arquivo inválido');
      const source = await createImageBitmap(file);
      const scale = Math.min(1, 1000 / Math.max(source.width, source.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
      source.close();
      form.elements.img.value = canvas.toDataURL('image/jpeg', 0.78);
      updatePreview();
      message('Foto carregada. Clique em Salvar card para guardar a alteração.');
    } catch (_) { message('Não foi possível abrir essa imagem. Use JPG, PNG ou WebP.', true); }
    finally { event.target.value = ''; }
  });
  $('#add-link').addEventListener('click', () => addLinkRow());
  $('#add-product').addEventListener('click', () => {
    if (!commit()) return;
    const p = {id:uid(),title:'Novo card',subtitle:'',category:'',img:'',pinned:false,links:[]};
    data.products.unshift(p); selected = p.id; save(); render(); form.elements.title.select();
  });
  $('#delete-product').addEventListener('click', () => {
    if (!confirm(`Excluir o card “${current()?.title || ''}” e todos os seus links?`)) return;
    data.products = data.products.filter(p => p.id !== selected); selected = data.products[0]?.id || null; save(); render();
  });
  function move(direction) {
    if (!commit()) return;
    const i = data.products.findIndex(p => p.id === selected), j = i + direction;
    if (j < 0 || j >= data.products.length) return;
    [data.products[i], data.products[j]] = [data.products[j], data.products[i]]; save(); render();
  }
  $('#move-up').addEventListener('click', () => move(-1));
  $('#move-down').addEventListener('click', () => move(1));
  for (const id of ['site-title','brand']) $('#'+id).addEventListener('change', () => { if (!current()) { data.siteTitle = $('#site-title').value.trim(); data.brand = $('#brand').value; save(); } else commit(); });
  $('#brand').addEventListener('input', () => document.documentElement.style.setProperty('--brand', $('#brand').value));
  $('#publish').addEventListener('click', async () => {
    if (!commit()) return;
    const button = $('#publish'); button.disabled = true; button.textContent = 'Publicando...';
    try {
      const response = await fetch('/api/publicar', {
        method: 'POST',
        headers: {'Content-Type':'application/json', 'Authorization':'Bearer ' + publishKey},
        body: JSON.stringify(data), cache: 'no-store'
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Falha ao publicar.');
      message('Commit criado! A vitrine será atualizada após o deploy da Cloudflare.');
    } catch (error) { message(error.message || 'Não foi possível publicar.', true); }
    finally { button.disabled = false; button.textContent = 'Publicar agora'; }
  });
  $('#export-backup').addEventListener('click', () => {
    if (!commit()) return;
    download('backup-vitrine.json', JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
  });
  $('#import-backup').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.products) || imported.products.some(p => !p || typeof p.id !== 'string' || typeof p.title !== 'string' || !Array.isArray(p.links))) throw Error('Formato inválido');
      if (!confirm('Substituir o rascunho atual pelos dados do backup?')) return;
      data = imported; selected = data.products[0]?.id || null; save(); render(); message('Backup importado.');
    } catch (_) { message('Não foi possível importar. Escolha um backup JSON válido desta vitrine.', true); }
    finally { event.target.value = ''; }
  });
  $('#reset-draft').addEventListener('click', () => {
    if (!confirm('Descartar o rascunho deste navegador e carregar os dados publicados?')) return;
    localStorage.removeItem(key); data = clone(base); selected = data.products[0]?.id || null; render(); message('Dados publicados carregados.');
  });
  window.addEventListener('beforeunload', e => {
    if (!current()) return;
    if (form.elements.title.value !== current().title || form.elements.img.value !== (current().img || '') || linkList.querySelectorAll('.link-row').length !== (current().links || []).length) { e.preventDefault(); e.returnValue = ''; }
  });
  $('#generate-key').addEventListener('click', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const generated = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const url = new URL(location.href); url.hash = 'chave=' + generated;
    $('#generated-key').textContent = 'PUBLISH_KEY: ' + generated + '\nLink privado: ' + url.href;
  });
  async function authorize() {
    if (!publishKey) { $('#access-message').textContent = 'Abra o link privado de edição para acessar o painel.'; return; }
    try {
      const response = await fetch('/api/autorizacao', {
        headers: {'Authorization':'Bearer ' + publishKey}, cache: 'no-store'
      });
      if (!response.ok) throw Error('Este link privado não foi reconhecido. Confira a chave configurada na Cloudflare.');
      document.body.classList.add('authorized');
      $('#access-gate').hidden = true;
      render();
    } catch (error) { $('#access-message').textContent = error.message; }
  }
  authorize();
})();
