/* ==========================================================================
   VIRE · motor de eventos
   --------------------------------------------------------------------------
   Cada evento sai por TRÊS caminhos ao mesmo tempo:

     1. gtag  (GA4 no navegador)
     2. fbq   (Pixel da Meta, só com consentimento de anúncio)
     3. /api/e.php  (endpoint próprio, que repassa para GA4 MP e Meta CAPI)

   O caminho 3 existe porque 1 e 2 falham em boa parte do tráfego real: vêm de
   googletagmanager.com e connect.facebook.net, presentes em toda lista de
   bloqueio. O endpoint fica no mesmo domínio do site e não é bloqueado.

   REGRA QUE NÃO PODE QUEBRAR: o mesmo `event_id` vai no fbq e no envio ao
   servidor. É assim que a Meta sabe que os dois são o MESMO evento e não conta
   duas vezes. Gerar ids diferentes dobra os números do Gerenciador.

   Este arquivo não conhece o app.js: ele escuta eventos de DOM (`vire:evento`)
   que o app dispara. Se um dos dois sumir, o outro continua funcionando.
   ========================================================================== */

(() => {
  'use strict';

  /* A previa de aprovacao roda no GitHub Pages, que nao executa PHP. Sem este
     guarda, todo evento tentaria falar com um endpoint inexistente e encheria
     o console de 404. `data-sem-servidor` e posto pelo publicar-preview.js. */
  const ENDPOINT = document.documentElement.dataset.semServidor === '1' ? '' : '/api/e.php';
  const CHAVE_SESSAO = 'vire:sessao';
  const MINUTOS_SESSAO = 30;

  const consentimento = () =>
    window.VIRE_CONSENTIMENTO?.estado() || { decidido: false, analytics: true, ad: false };

  /* ── Identidade ───────────────────────────────────────────────────────
     O id do VISITANTE é criado pelo servidor (cookie `_vire`), porque cookie
     feito por JavaScript morre em 7 dias no Safari. Aqui só lemos.
     O id da SESSÃO é local e expira por inatividade. */

  const lerCookie = (nome) =>
    document.cookie.split('; ').find((c) => c.startsWith(`${nome}=`))?.split('=')[1] || '';

  function idSessao() {
    const agora = Date.now();
    let sessao = null;
    try {
      sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null');
    } catch (e) { /* modo privado */ }

    if (!sessao || agora - sessao.visto > MINUTOS_SESSAO * 60000) {
      sessao = { id: `s${agora.toString(36)}${Math.random().toString(36).slice(2, 8)}`, inicio: agora };
    }
    sessao.visto = agora;
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } catch (e) { /* segue só em memória */ }
    return sessao.id;
  }

  const novoIdEvento = () =>
    `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  /* ── Contexto do visitante ────────────────────────────────────────────
     Coletado uma vez e anexado ao page_view. Repetir em todo evento só
     engorda o payload sem acrescentar nada. */

  function contexto() {
    const c = navigator.connection || {};
    const params = new URLSearchParams(location.search);
    const utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']
      .forEach((k) => { if (params.get(k)) utm[k] = params.get(k); });

    return {
      ...utm,
      tela: `${screen.width}x${screen.height}`,
      viewport: `${innerWidth}x${innerHeight}`,
      dpr: devicePixelRatio || 1,
      idioma: navigator.language,
      fuso: Intl.DateTimeFormat().resolvedOptions().timeZone,
      conexao: c.effectiveType || '',
      dispositivo: innerWidth < 720 ? 'mobile' : innerWidth < 1080 ? 'tablet' : 'desktop',
      hora_local: new Date().toISOString(),
    };
  }

  /* O `fbc` da Meta vem do fbclid da URL e precisa deste formato exato.
     Persistimos porque a conversão costuma acontecer em outra visita. */
  function guardarFbc() {
    const fbclid = new URLSearchParams(location.search).get('fbclid');
    if (!fbclid || lerCookie('_fbc')) return;
    const valor = `fb.1.${Date.now()}.${fbclid}`;
    document.cookie = `_fbc=${valor}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
  }

  /* ── Despacho ─────────────────────────────────────────────────────── */

  /* Nomes do GA4 (snake_case) mapeados para os nomes padrão da Meta.
     Todo caminho para o WhatsApp virou `generate_lead`, então a Meta recebe
     `Lead` em todos eles. O que separa um do outro é o parâmetro `origem`.
     Evento fora deste mapa não vai para a Meta, que é o caso dos
     `btn_interesse_*`: eles existem só para segmentar no GA4. */
  const NOMES_META = {
    page_view: 'PageView',
    view_item: 'ViewContent',
    generate_lead: 'Lead',
    schedule: 'Schedule',
  };

  const sessao = idSessao();

  function evento(nome, params = {}, opcoes = {}) {
    const idEvento = novoIdEvento();
    const consent = consentimento();
    const dados = { ...params, session_id: sessao };

    /* Telefone e nome saem de tudo que vai para plataforma de terceiro.
       O Google PROÍBE dado pessoal no GA4 e pode apagar a propriedade inteira
       por isso; a Meta só aceita esses campos hasheados, em user_data, o que
       quem faz é o servidor. Aqui eles ficam só no caminho 3, que é o log da
       própria loja. */
    const { telefone, nome_lead, ...semDadoPessoal } = dados;

    // 1. GA4 no navegador. Com consentimento negado o Consent Mode transforma
    //    isto num ping sem cookie, que alimenta a modelagem do Google.
    window.gtag?.('event', nome, semDadoPessoal);

    /* Evento de segmentação para o GA4 e mais nada. Não vai para a Meta nem
       para o log, porque a conversão daquele clique já saiu no `generate_lead`
       que veio junto. Repetir aqui contaria duas vezes. */
    if (opcoes.somenteGa4) return;

    // 2. Pixel da Meta, se houver consentimento e o evento interessar a ela.
    if (consent.ad && window.fbq && NOMES_META[nome]) {
      window.fbq('track', NOMES_META[nome], semDadoPessoal, { eventID: idEvento });
    }

    // 3. Endpoint próprio. Vai sempre: é a única fonte que não é bloqueada,
    //    e o servidor decide o que repassar conforme o consentimento.
    enviarAoServidor({
      nome,
      event_id: idEvento,
      session_id: sessao,
      params: dados,
      url: location.href,
      referrer: document.referrer,
      consent: { analytics: consent.analytics, ad: consent.ad },
      fbp: lerCookie('_fbp'),
      fbc: lerCookie('_fbc'),
    });
  }

  function enviarAoServidor(carga) {
    if (!ENDPOINT) return;
    const corpo = JSON.stringify(carga);
    // `keepalive` é o que faz o evento sobreviver ao clique que sai da página,
    // que é justamente o caso dos cliques de WhatsApp, a conversão principal.
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
        credentials: 'include',
        keepalive: true,
      }).catch(() => { /* endpoint fora do ar não pode quebrar a página */ });
    } catch (e) { /* idem */ }
  }

  /* ── Profundidade de rolagem ──────────────────────────────────────── */

  function medirRolagem() {
    const marcos = [25, 50, 75, 90];
    const atingidos = new Set();
    let pendente = false;

    const conferir = () => {
      pendente = false;
      const doc = document.documentElement;
      const rolavel = doc.scrollHeight - innerHeight;
      if (rolavel <= 0) return;
      const pct = Math.min(100, Math.round((scrollY / rolavel) * 100));
      marcos.forEach((m) => {
        if (pct >= m && !atingidos.has(m)) {
          atingidos.add(m);
          evento('scroll', { percent_scrolled: m });
        }
      });
    };

    addEventListener('scroll', () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(conferir);
    }, { passive: true });
  }

  /* ── Tempo engajado ───────────────────────────────────────────────────
     Conta só com a aba visível: somar tempo de aba em segundo plano infla a
     métrica e não significa atenção. Envia em marcos, não a cada segundo. */

  function medirTempo() {
    const marcos = [15, 30, 60, 120, 300];
    let segundos = 0;
    let proximo = 0;

    setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      segundos += 5;
      while (proximo < marcos.length && segundos >= marcos[proximo]) {
        evento('tempo_engajado', { segundos: marcos[proximo], engagement_time_msec: marcos[proximo] * 1000 });
        proximo += 1;
      }
    }, 5000);

    // Fecho de sessão: o total real quando a pessoa sai.
    addEventListener('pagehide', () => {
      if (segundos > 0) {
        evento('saida', { segundos_engajado: segundos, engagement_time_msec: segundos * 1000 });
      }
    });
  }

  /* ── Escuta ─────────────────────────────────────────────────────────
     O app.js dispara `vire:evento`; aqui só repassamos. Um clique genérico
     de WhatsApp que o app não cubra ainda é capturado por delegação. */

  function escutar() {
    addEventListener('vire:evento', (e) => {
      const { nome, params, opcoes } = e.detail || {};
      if (nome) evento(nome, params || {}, opcoes || {});
    });

    /* Rede de segurança: qualquer link de WhatsApp que escape do app.
       FASE DE BOLHA, não de captura. Em captura este ouvinte roda ANTES dos
       handlers do app.js, o marcador `rastreado` ainda não existe, e a
       conversão principal do site é contada duas vezes. */
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (!link || link.dataset.rastreado === '1') return;
      evento('generate_lead', {
        origem: link.closest('#flutuante') ? 'flutuante'
          : link.closest('.header') ? 'header'
            : link.closest('.menu') ? 'menu'
              : link.closest('.rodape') ? 'rodape' : 'pagina',
      });
    });
  }

  /* ── Partida ────────────────────────────────────────────────────────── */

  function iniciar() {
    guardarFbc();

    /* Se a coleta já estava ligada quando o primeiro page_view saiu, o Pixel
       recebeu o dele. Mandar outro por causa do clique no aviso contaria a
       mesma visita duas vezes no Gerenciador. O reenvio só faz sentido para
       quem estava desligado e ligou. */
    const jaContavaAnuncio = consentimento().ad;
    evento('page_view', contexto());

    medirRolagem();
    medirTempo();
    escutar();

    addEventListener('vire:consentimento', (e) => {
      if (e.detail?.aceitou && !jaContavaAnuncio) evento('page_view', { tardio: true });
    });
  }

  window.VIRE_TRACK = { evento };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
