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

export function onRequestGet({request, env}) {
  return Response.json(hasAccess(request, env.PUBLISH_KEY) ? {ok:true} : {error:'Link privado inválido.'}, {
    status:hasAccess(request, env.PUBLISH_KEY) ? 200 : 401,
    headers:{'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}
  });
}
