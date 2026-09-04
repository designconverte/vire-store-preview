/* ==========================================================================
   VIRE · movimento
   Regra do styleguide: hover em 160 ms, entrada de seção fade + 8 px, nada
   acima de 400 ms. O que passa disso é dirigido pelo scroll (scrub), não por
   tempo: pilha de razões, trilho horizontal e barra de progresso.
   Se o GSAP não carregar, este arquivo não faz nada e a página fica inteira,
   porque o estado "invisível" só é aplicado depois que a animação é garantida.
   ========================================================================== */

(() => {
  'use strict';

  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sem GSAP ou com movimento reduzido: no-op público e nada escondido.
  if (!window.gsap || semMovimento) {
    window.VIRE_MOTION = {
      revelar: () => {},
      travarScroll: () => {},
      recalcular: () => {},
      rolarPara: (alvo, deslocamento = 0) => {
        if (alvo) window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY + deslocamento });
      },
    };
    return;
  }

  const { gsap } = window;
  gsap.registerPlugin(window.ScrollTrigger);
  const { ScrollTrigger } = window;

  document.body.classList.add('js-anima');

  const ENTRADA = { duracao: 0.32, deslocamento: 8, ease: 'power2.out' };

  const alturaHeader = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v-header')) || 80;

  /* ── Scroll suave (só no desktop, com ponteiro fino) ──────────────────── */

  let lenis = null;

  /* Overlays têm rolagem própria. O Lenis escuta a roda no documento inteiro,
     então enquanto um painel está aberto ele precisa sair do caminho. */
  function travarScroll(travado) {
    if (!lenis) return;
    if (travado) lenis.stop();
    else lenis.start();
  }

  function scrollSuave() {
    if (!window.Lenis || !matchMedia('(min-width: 1025px) and (pointer: fine)').matches) return;

    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((tempo) => lenis.raf(tempo * 1000));
    gsap.ticker.lagSmoothing(0);

    // Âncoras precisam pedir ao Lenis, senão o scroll nativo briga com ele.
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const alvo = document.querySelector(id);
      if (!alvo) return;
      e.preventDefault();
      lenis.scrollTo(alvo, { offset: -(alturaHeader() + 16), duration: 0.9 });
    });
  }

  /* ── Entradas ─────────────────────────────────────────────────────────── */

  function revelar(escopo = document) {
    const alvos = Array.from(escopo.querySelectorAll('[data-anima]'))
      .filter((el) => !el.dataset.animaPronto);

    alvos.forEach((el) => { el.dataset.animaPronto = '1'; });

    // Vizinhos que entram juntos ganham stagger; o resto entra sozinho.
    const grupos = new Map();
    alvos.forEach((el) => {
      const pai = el.parentElement;
      if (!grupos.has(pai)) grupos.set(pai, []);
      grupos.get(pai).push(el);
    });

    grupos.forEach((itens) => {
      gsap.to(itens, {
        opacity: 1,
        y: 0,
        duration: ENTRADA.duracao,
        ease: ENTRADA.ease,
        stagger: itens.length > 1 ? 0.05 : 0,
        scrollTrigger: {
          trigger: itens[0],
          start: 'top 88%',
          once: true, // uma vez só, porque reentrada é ruído
        },
      });
    });
  }

  /* ── Hero: o título sobe de dentro de uma máscara, linha a linha ──────── */

  function hero() {
    const titulo = document.querySelector('[data-anima-linhas]');
    if (titulo) {
      const linhas = titulo.innerHTML.split(/<br\s*\/?>/i);
      titulo.innerHTML = linhas
        .map((linha) => `<span class="hero__linha" style="display:block;overflow:hidden"><span style="display:block">${linha.trim()}</span></span>`)
        .join('');
      titulo.dataset.animaPronto = '1';
      titulo.style.opacity = '1';
      titulo.style.transform = 'none';

      gsap.from(titulo.querySelectorAll('.hero__linha > span'), {
        yPercent: 108,
        duration: 0.4,
        ease: 'power3.out',
        stagger: 0.07,
        delay: 0.08,
      });
    }

    // O resto do hero entra em cascata curta, sem esperar scroll.
    const restante = Array.from(document.querySelectorAll('.hero__conteudo > [data-anima]'))
      .filter((el) => el !== titulo);
    restante.forEach((el) => { el.dataset.animaPronto = '1'; });

    gsap.to(restante, {
      opacity: 1,
      y: 0,
      duration: ENTRADA.duracao,
      ease: ENTRADA.ease,
      stagger: 0.06,
      delay: 0.16,
    });

    // A foto chega por baixo do texto, sem escala: nada distorce o produto.
    const foto = document.querySelector('.hero__midia img');
    if (foto) gsap.from(foto, { opacity: 0, duration: 0.4, ease: 'power2.out' });
  }

  /* ── Contadores da faixa amarela ──────────────────────────────────────── */

  function contadores() {
    document.querySelectorAll('[data-contador]').forEach((el) => {
      const alvo = Number(el.dataset.contador);
      const estado = { valor: 0 };
      gsap.to(estado, {
        valor: alvo,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.1,
        onUpdate: () => { el.textContent = Math.round(estado.valor).toLocaleString('pt-BR'); },
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });
  }

  /* ── Razões: a pilha se monta no scroll (CARDS-001) ────────────────────
     O pin é CSS `sticky` (zero JS). Aqui só a estética de profundidade: quem
     ficou atrás encolhe e desfoca conforme os próximos POUSAM POR CIMA. A
     geometria é lida a cada quadro porque `sticky` + refresh do ScrollTrigger
     medem a posição travada, não a natural, e o efeito ficava intermitente. */

  function pilhaDeRazoes() {
    const cartoes = Array.from(document.querySelectorAll('.razao'));
    if (cartoes.length < 2) return;

    const caixas = cartoes.map((c) => c.querySelector('.razao__caixa'));
    const desfoca = matchMedia('(min-width: 1024px)').matches; // blur é caro no celular

    const cobertura = (retI, retJ) => {
      if (retI.height <= 0) return 0;
      const avanco = (retI.bottom - retJ.top) / retI.height;
      return Math.min(1, Math.max(0, avanco));
    };

    let pendente = false;

    const pintar = () => {
      pendente = false;
      const rets = cartoes.map((c) => c.getBoundingClientRect());

      cartoes.forEach((cartao, i) => {
        let profundidade = 0;
        for (let j = i + 1; j < cartoes.length; j += 1) {
          profundidade += cobertura(rets[i], rets[j]);
        }
        const caixa = caixas[i];
        if (!caixa) return;
        if (profundidade <= 0.001) {
          caixa.style.filter = '';
          caixa.style.transform = '';
          return;
        }
        caixa.style.filter = desfoca ? `blur(${(profundidade * 0.9).toFixed(2)}px)` : '';
        caixa.style.transform = `scale(${Math.max(0.9, 1 - profundidade * 0.03).toFixed(4)})`;
      });
    };

    const agendar = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(pintar);
    };

    pintar();
    addEventListener('scroll', agendar, { passive: true });
    addEventListener('resize', agendar, { passive: true });
    addEventListener('load', agendar);
  }

  /* ── Jornada: trilho horizontal fixado no viewport (SB-001) ────────────
     Em toda largura: a seção fixa abaixo do header e o trilho desliza da
     direita para a esquerda atado ao scroll (1 px rolado = 1 px deslizado).
     A barra amarela mostra o progresso. No celular o scroll vertical é o que
     avança os cards; ninguém arrasta de lado. As larguras vêm do CSS e são
     relidas em cada refresh (`invalidateOnRefresh`), então a troca de
     breakpoint não precisa de matchMedia. */

  function jornada() {
    const secao = document.querySelector('[data-jornada]');
    if (!secao) return;
    const trilho = secao.querySelector('[data-jornada-trilho]');
    const cards = gsap.utils.toArray('[data-jornada-card]', secao);
    const barra = secao.querySelector('[data-jornada-barra]');
    const container = secao.querySelector('.u-container');
    if (!trilho || !container || cards.length < 2) return;

    /* A barra de endereço do celular aparece e some durante o scroll e muda a
       altura do viewport; sem isto o ScrollTrigger refaz as contas no meio do
       pin e a seção pula. */
    ScrollTrigger.config({ ignoreMobileResize: true });

    const distancia = () => {
      const estilo = getComputedStyle(container);
      const util = container.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
      return Math.max(0, trilho.scrollWidth - util);
    };

    const tween = gsap.to(trilho, {
      x: () => -distancia(),
      ease: 'none',
      scrollTrigger: {
        trigger: secao,
        start: () => `top ${alturaHeader()}px`,
        end: () => `+=${distancia() + 120}`,
        scrub: 0.4,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (barra) barra.style.transform = `scaleX(${self.progress.toFixed(4)})`;
        },
      },
    });

    cards.forEach((card, i) => {
      if (i === 0) return; // o primeiro já está na tela quando a seção fixa
      gsap.from(card, {
        opacity: 0,
        y: 24,
        duration: ENTRADA.duracao,
        ease: ENTRADA.ease,
        scrollTrigger: {
          trigger: card,
          containerAnimation: tween,
          start: 'left 95%',
          toggleActions: 'play none none reverse',
        },
      });
    });
  }

  /* ── Seção atual no menu ──────────────────────────────────────────────── */

  function menuAtivo() {
    document.querySelectorAll('.header__link').forEach((link) => {
      const secao = document.querySelector(link.getAttribute('href'));
      if (!secao) return;
      ScrollTrigger.create({
        trigger: secao,
        start: 'top 40%',
        end: 'bottom 40%',
        onToggle: (self) => {
          if (self.isActive) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        },
      });
    });
  }

  /* Qualquer coisa que mude a ALTURA da página invalida as posições que o
     ScrollTrigger calculou (filtro da vitrine, FAQ, fotos chegando). */
  function recalcular() {
    ScrollTrigger.refresh();
  }

  /* Rolagem que respeita o Lenis. */
  function rolarPara(alvo, deslocamento = 0) {
    if (!alvo) return;
    if (lenis) {
      lenis.scrollTo(alvo, { offset: deslocamento, duration: 0.7 });
      return;
    }
    window.scrollTo({
      top: alvo.getBoundingClientRect().top + window.scrollY + deslocamento,
      behavior: 'smooth',
    });
  }

  window.VIRE_MOTION = {
    revelar,
    travarScroll,
    recalcular,
    rolarPara,
    // Só para depuração e testes: com o Lenis ativo, `window.scrollTo` briga
    // com o loop dele. Quem precisa rolar por código usa `rolarPara`.
    get lenis() { return lenis; },
  };

  hero();
  scrollSuave();
  contadores();
  pilhaDeRazoes();
  jornada();
  menuAtivo();
  revelar();

  // Fontes chegando depois mudam altura de bloco e desalinham os triggers.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  addEventListener('load', () => {
    ScrollTrigger.refresh();

    /* Rede de segurança: qualquer [data-anima] que tenha entrado no DOM sem
       passar por revelar() ficaria invisível para sempre. Conteúdo faltando é
       pior que conteúdo sem animação. */
    setTimeout(() => {
      const orfaos = document.querySelectorAll('[data-anima]:not([data-anima-pronto])');
      if (orfaos.length) gsap.set(orfaos, { opacity: 1, y: 0, clearProps: 'transform' });
    }, 1200);
  });
})();
