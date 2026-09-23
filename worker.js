import {onRequestGet as authorize} from './functions/api/autorizacao.js';
import {onRequestPost as publish} from './functions/api/publicar.js';

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/api/autorizacao') {
      if (request.method !== 'GET') return new Response('Método não permitido', {status:405, headers:{Allow:'GET'}});
      return authorize({request, env, ctx});
    }
    if (path === '/api/publicar') {
      if (request.method !== 'POST') return new Response('Método não permitido', {status:405, headers:{Allow:'POST'}});
      return publish({request, env, ctx});
    }
    return env.ASSETS.fetch(request);
  }
};
