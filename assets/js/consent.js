/* ==========================================================================
   VIRE · consentimento (Consent Mode v2)
   --------------------------------------------------------------------------
   Carrega ANTES de tracking.js e antes de qualquer tag do Google.

   MODELO: OPT-OUT, por decisão do cliente.
   A medição começa ligada e o aviso serve para informar e oferecer a saída.
   Quem clica em "Só o essencial" desliga o Pixel e o Consent Mode passa a
   negado, e a escolha vale para as próximas visitas.

   Isso é diferente do opt-in que a ANPD recomenda para cookies de publicidade.
   A decisão foi tomada com o risco conhecido e está registrada no README.
   Se um dia virar opt-in, basta trocar PADRAO_ACEITO para false: o resto do
   arquivo já funciona nos dois modos.
   ========================================================================== */

(() => {
  'use strict';

  const CHAVE = 'vire:consentimento';
  const VERSAO = 1; // suba isto para pedir a escolha de novo após mudar a política
  const PADRAO_ACEITO = true; // false volta o site para opt-in, sem mais nada a mudar

  const NEGADO = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    personalization_storage: 'denied',
    functionality_storage: 'granted', // o site não funciona sem isto
    security_storage: 'granted',
  };

  const ACEITO = {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
    personalization_storage: 'granted',
    functionality_storage: 'granted',
    security_storage: 'granted',
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function lerEscolha() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      return guardado && guardado.versao === VERSAO ? guardado : null;
    } catch (e) {
      return null; // modo privado, storage bloqueado: trata como sem escolha
    }
  }

  function gravarEscolha(aceitou) {
    const escolha = { versao: VERSAO, aceitou, em: new Date().toISOString() };
    try {
      localStorage.setItem(CHAVE, JSON.stringify(escolha));
    } catch (e) { /* sem storage: vale só para esta visita */ }
    return escolha;
  }

  const escolhaAnterior = lerEscolha();
  const aceitaAgora = escolhaAnterior ? escolhaAnterior.aceitou : PADRAO_ACEITO;

  /* O default TEM que ser definido antes de qualquer evento, senão o primeiro
     page_view escapa com o consentimento errado. */
  gtag('consent', 'default', aceitaAgora ? ACEITO : NEGADO);

  const estado = {
    decidido: Boolean(escolhaAnterior),
    aceitou: aceitaAgora,
  };

  function aplicar(aceitou, avisar = true) {
    estado.decidido = true;
    estado.aceitou = aceitou;
    gtag('consent', 'update', aceitou ? ACEITO : NEGADO);
    if (aceitou) carregarPixelMeta();
    if (avisar) {
      dispatchEvent(new CustomEvent('vire:consentimento', {
        detail: { aceitou, analytics: true, ad: aceitou },
      }));
    }
  }

  /* Pixel da Meta: só depois do aceite, e uma vez só. */
  let pixelCarregado = false;
  function carregarPixelMeta() {
    const id = document.documentElement.dataset.metaPixel;
    if (!id || pixelCarregado || window.fbq) return;
    pixelCarregado = true;

    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', id);
  }

  /* ── Banner ─────────────────────────────────────────────────────────── */

  /* Ligar e MOSTRAR são coisas separadas de propósito. Quem já escolheu não vê
     o banner, mas pode reabri-lo pelo rodapé: se o ouvinte só fosse ligado na
     primeira visita, os botões do banner reaberto não fariam nada. */
  function ligarBanner() {
    const banner = document.getElementById('consentimento');
    if (!banner || banner.dataset.ligado === '1') return banner;
    banner.dataset.ligado = '1';

    banner.addEventListener('click', (e) => {
      const botao = e.target.closest('[data-consentimento]');
      if (!botao) return;
      const aceitou = botao.dataset.consentimento === 'aceitar';
      gravarEscolha(aceitou);
      aplicar(aceitou);
      banner.classList.remove('is-visivel');
      setTimeout(() => { banner.hidden = true; }, 300);
    });
    return banner;
  }

  function mostrarBanner(comAtraso = true) {
    const banner = ligarBanner();
    if (!banner) return;
    banner.hidden = false;
    // Um quadro de tempo para o banner não competir com o hero na primeira
    // impressão. Ele continua obrigatório: nada dispara antes da escolha.
    requestAnimationFrame(() => {
      setTimeout(() => banner.classList.add('is-visivel'), comAtraso ? 600 : 0);
    });
  }

  function aoCarregar(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  if (aceitaAgora) carregarPixelMeta();

  if (escolhaAnterior) {
    aoCarregar(ligarBanner); // pronto para o "rever preferências" do rodapé
  } else {
    aoCarregar(mostrarBanner); // ainda não escolheu: informa e oferece a saída
  }

  window.VIRE_CONSENTIMENTO = {
    // tracking.js consulta isto a cada envio.
    estado: () => ({
      decidido: estado.decidido,
      // O GA4 recebe sempre: quem recusa vira ping sem cookie, que ainda
      // alimenta a modelagem do Google em vez de sumir do relatório.
      analytics: true,
      ad: estado.aceitou,
    }),
    // Permite um link "gerenciar cookies" no rodapé reabrir a escolha.
    /* Reabre a escolha pelo rodapé. Não desliga nada sozinho: quem clicou aqui
       ainda vai decidir no banner, e desligar antes disso mudaria a medição de
       quem só queria conferir o que está ligado. */
    reabrir() {
      try { localStorage.removeItem(CHAVE); } catch (e) { /* sem storage */ }
      estado.decidido = false;
      mostrarBanner(false); // sem atraso: veio de um clique, responde na hora
    },
  };
})();
