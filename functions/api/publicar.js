const OWNER = 'GiovanniRamosAndrade';
const REPO = 'Site-Vendas-Rosiberto';
const BRANCH = 'main';

function hasAccess(request, secret) {
  const auth = request.headers.get('Authorization') || '';
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!secret || supplied.length < 32 || supplied.length > 128) return false;
  const a = new TextEncoder().encode(supplied);
  const b = new TextEncoder().encode(secret);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}

function validUrl(raw, image = false) {
  if (!raw) return true;
  if (image && /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(raw)) return true;
  try { return ['https:', 'http:'].includes(new URL(raw).protocol); }
  catch { return false; }
}

function validData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (typeof value.siteTitle !== 'string' || value.siteTitle.length > 90) return false;
  if (typeof value.brand !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.brand)) return false;
  if (!Array.isArray(value.products) || value.products.length > 300) return false;
  const ids = new Set();
  for (const product of value.products) {
    if (!product || typeof product !== 'object' || typeof product.id !== 'string' || !/^[\w-]{1,90}$/.test(product.id) || ids.has(product.id)) return false;
    ids.add(product.id);
    if (typeof product.title !== 'string' || !product.title.trim() || product.title.length > 120) return false;
    if (typeof product.subtitle !== 'string' || product.subtitle.length > 220) return false;
    if (typeof product.category !== 'string' || product.category.length > 60) return false;
    if (typeof product.img !== 'string' || !validUrl(product.img, true)) return false;
    if (typeof product.pinned !== 'boolean' || !Array.isArray(product.links) || product.links.length > 30) return false;
    for (const link of product.links) {
      if (!link || typeof link.loja !== 'string' || link.loja.length > 80 || typeof link.nome !== 'string' || !link.nome.trim() || link.nome.length > 160 || typeof link.url !== 'string' || !link.url || !validUrl(link.url)) return false;
    }
  }
  return true;
}

function reply(message, status) {
  return Response.json({error:message}, {status, headers:{'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}});
}

export async function onRequestPost({request, env}) {
  if (!hasAccess(request, env.PUBLISH_KEY)) return reply('Link privado inválido.', 401);
  if (!env.GITHUB_TOKEN) return reply('Configure GITHUB_TOKEN nos segredos da Cloudflare.', 503);
  if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(request.url).origin) return reply('Origem não autorizada.', 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply('Envie dados JSON.', 415);
  if (Number(request.headers.get('Content-Length') || 0) > 2_000_000) return reply('Dados muito grandes. Use URLs de imagens.', 413);

  let data;
  try {
    const body = await request.text();
    if (body.length > 2_000_000) return reply('Dados muito grandes. Use URLs de imagens.', 413);
    data = JSON.parse(body);
  } catch { return reply('Dados inválidos.', 400); }
  if (!validData(data)) return reply('Revise os campos e links dos cards.', 400);

  const path = env.GITHUB_DATA_PATH || 'js/dados.js';
  const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const headers = {
    'Accept':'application/vnd.github+json',
    'Authorization':`Bearer ${env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'vitrine-painel'
  };
  let previous;
  try {
    const current = await fetch(`${api}?ref=${BRANCH}`, {headers});
    if (!current.ok) return reply('Não foi possível localizar dados.js no repositório. Confira o caminho e o token.', 502);
    previous = await current.json();
    if (!previous.sha || previous.type !== 'file') return reply('dados.js não é um arquivo válido.', 502);
  } catch { return reply('Falha de conexão com o GitHub.', 502); }

  const safe = {
    siteTitle:data.siteTitle, brand:data.brand,
    products:data.products.map(p => ({
      id:p.id, title:p.title, subtitle:p.subtitle, category:p.category, img:p.img,
      pinned:p.pinned, links:p.links.map(l => ({loja:l.loja, nome:l.nome, url:l.url}))
    }))
  };
  const script = 'window.VITRINE_DADOS = ' + JSON.stringify(safe, null, 2).replace(/</g, '\\u003c') + ';\n';
  const bytes = new TextEncoder().encode(script);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const content = btoa(binary);
  try {
    const uploaded = await fetch(api, {
      method:'PUT', headers:{...headers, 'Content-Type':'application/json'},
      body:JSON.stringify({message:'Atualizar produtos pela vitrine', content, sha:previous.sha, branch:BRANCH})
    });
    if (!uploaded.ok) return reply(uploaded.status === 409 ? 'Outra alteração ocorreu no GitHub. Atualize a página e tente novamente.' : 'O GitHub recusou o commit. Confira a permissão do token.', 502);
    const result = await uploaded.json();
    return Response.json({ok:true, commit:result.commit?.html_url || ''}, {headers:{'Cache-Control':'no-store'}});
  } catch { return reply('Falha de conexão ao criar o commit.', 502); }
}
