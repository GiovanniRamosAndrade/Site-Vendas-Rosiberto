(() => {
  const draftKey = 'vitrine-draft-v1';
  let data = window.VITRINE_DADOS || { products: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey));
    if (saved && Array.isArray(saved.products)) data = saved;
  } catch (_) { /* Os dados publicados continuam disponíveis. */ }

  function safeUrl(value, image = false) {
    if (image && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value || '')) return value;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
  }
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  document.documentElement.style.setProperty('--brand', /^#[0-9a-f]{6}$/i.test(data.brand) ? data.brand : '#7c442b');

  if (document.querySelector('#cards')) {
    const grid = document.querySelector('#cards');
    const search = document.querySelector('#search');
    const filter = document.querySelector('#filter');
    const empty = document.querySelector('#empty');
    document.querySelector('#site-title').textContent = data.siteTitle || 'Produtos e promoções';
    document.title = data.siteTitle || document.title;
    const categories = [...new Set(data.products.map(p => p.category?.trim()).filter(Boolean))];
    categories.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    categories.forEach(category => {
      const option = el('option', '', category);
      option.value = category;
      filter.append(option);
    });
    function render() {
      grid.replaceChildren();
      const q = normalize(search.value.trim());
      const visible = data.products.filter(p =>
        (filter.value === 'all' || p.category === filter.value) &&
        (!q || normalize([p.title, p.subtitle, p.category, ...(p.links || []).map(l => l.nome)].join(' ')).includes(q))
      );
      visible.forEach(p => {
        const card = el('article', 'card' + (p.pinned ? ' pinned' : ''));
        const media = el('div', 'card-media');
        const imageUrl = safeUrl(p.img, true);
        if (imageUrl) {
          const img = el('img'); img.src = imageUrl; img.alt = p.title || 'Foto do produto'; img.loading = 'lazy';
          media.append(img);
        } else media.append(el('span', 'no-image', 'Sem imagem'));
        if (p.pinned) media.append(el('span', 'badge', 'Destaque'));
        const body = el('div', 'card-body');
        body.append(el('h2', '', p.title), el('p', '', p.subtitle));
        const action = el('a', 'card-action');
        action.href = 'post.html?id=' + encodeURIComponent(p.id);
        action.append(el('span', '', p.pinned ? 'Ver destaque' : 'Ver links'), el('span', 'count', String((p.links || []).length)));
        body.append(action); card.append(media, body); grid.append(card);
      });
      empty.hidden = visible.length > 0;
    }
    search.addEventListener('input', render);
    filter.addEventListener('change', render);
    render();
  }

  if (document.querySelector('#post-container')) {
    const id = new URLSearchParams(location.search).get('id');
    const p = data.products.find(item => item.id === id);
    const container = document.querySelector('#post-container');
    if (!p) {
      container.replaceChildren(el('div', 'post-details', 'Produto não encontrado. Volte à vitrine e escolha outro card.'));
      return;
    }
    document.title = `${p.title} | ${data.siteTitle || 'Produtos'}`;
    const image = document.querySelector('#post-img');
    const imageUrl = safeUrl(p.img, true);
    if (imageUrl) { image.src = imageUrl; image.alt = p.title; }
    else image.parentElement.hidden = true;
    document.querySelector('#post-category').textContent = p.category || 'Produtos';
    document.querySelector('#post-title').textContent = p.title;
    document.querySelector('#post-subtitle').textContent = p.subtitle || 'Confira os links abaixo:';
    const links = document.querySelector('#links-container');
    (p.links || []).forEach(link => {
      const href = safeUrl(link.url);
      if (!href) return;
      const a = el('a', 'store-card'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer sponsored';
      const info = el('span', 'store-info');
      info.append(el('span', 'store-name', link.loja || 'Loja'), el('span', 'product-name', link.nome || 'Ver produto'));
      a.append(info, el('span', 'btn-buy', 'Acessar ↗')); links.append(a);
    });
    if (!links.children.length) links.append(el('p', '', 'Ainda não há links neste card.'));
  }
})();
