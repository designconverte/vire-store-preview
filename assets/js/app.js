/* ==========================================================================
   VIRE · comportamento da página
   Sem dependências. GSAP é opcional e vive em motion.js; nada aqui depende
   dele, então a página continua inteira e utilizável se o CDN falhar.
   ========================================================================== */

(() => {
  'use strict';

  const cfg = window.VIRE_CONFIG;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** Lê 'endereco.completo' dentro do config, inclusive getters. */
  const pegar = (caminho) => caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), cfg);

  const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const real = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const realCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* Parcela calculada a partir do preço e da condição da loja (12x sem juros).
     Se `semJuros` virar false um dia, a parcela some em vez de mentir. */
  function parcela(preco) {
    if (!preco || !cfg.pagamento.semJuros) return null;
    return `${cfg.pagamento.parcelas}x ${realCentavos.format(preco / cfg.pagamento.parcelas)}`;
  }

  /* Avisa o tracking sem depender dele. */
  function emitir(nome, params = {}, opcoes = {}) {
    dispatchEvent(new CustomEvent('vire:evento', { detail: { nome, params, opcoes } }));
  }

  /* Nome de evento do GA4: minúsculo, sem acento, só [a-z0-9_], máx. 40. */
  function slugEvento(texto) {
    return texto
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }

  /* "Inow V35" ou só "V20 Pro" quando o modelo é white label (sem marca). */
  const nomeCompleto = (m) => [m.fabricante, m.nome].filter(Boolean).join(' ');

  /* Todo caminho que leva ao WhatsApp de um modelo passa por aqui:
     1. `generate_lead`, A conversão (marcar como evento-chave no GA4).
     2. `btn_interesse_{marca}_{modelo}`, só para segmentar (só GA4). */
  function interesseNoModelo(modelo, origem, extras = {}) {
    if (!modelo) return;
    const dados = {
      origem,
      item_id: modelo.id,
      item_name: nomeCompleto(modelo),
      item_brand: modelo.fabricante || undefined,
      item_category: modelo.categoria || undefined,
      value: modelo.preco || undefined,
      currency: modelo.preco ? 'BRL' : undefined,
      ...extras,
    };
    emitir('generate_lead', dados);
    emitir(slugEvento(`btn_interesse_${nomeCompleto(modelo)}`), dados, { somenteGa4: true });
  }

  /** Monta o link do WhatsApp com a mensagem já preenchida. */
  function linkWhats(chave, trocas = {}) {
    let texto = cfg.mensagens[chave] || cfg.mensagens.geral;
    for (const [k, v] of Object.entries(trocas)) {
      texto = texto.replaceAll(`{${k}}`, v);
    }
    return `https://wa.me/${cfg.whatsapp.e164}?text=${encodeURIComponent(texto)}`;
  }

  /* ── 1. Dados da loja no HTML ─────────────────────────────────────────── */

  function aplicarConfig() {
    $$('[data-config]').forEach((el) => { el.textContent = pegar(el.dataset.config) ?? ''; });
    $$('[data-config-text]').forEach((el) => { el.textContent = pegar(el.dataset.configText) ?? ''; });
    $$('[data-config-href]').forEach((el) => { el.href = pegar(el.dataset.configHref) ?? '#'; });

    $$('[data-whats]').forEach((el) => {
      el.href = linkWhats(el.dataset.whats);
      el.target = '_blank';
      el.rel = 'noopener';
    });

    const rota = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cfg.endereco.busca)}`;
    $$('[data-rota]').forEach((el) => { el.href = rota; });

    $('#rever-cookies')?.addEventListener('click', () => window.VIRE_CONSENTIMENTO?.reabrir());

    const horario = cfg.horarios.confirmado
      ? `${cfg.horarios.semana} · ${cfg.horarios.sabado}`
      : 'consulte pelo WhatsApp';
    $$('[data-horarios]').forEach((el) => { el.textContent = horario; });
  }

  /* ── 2. Header e CTA flutuante ────────────────────────────────────────── */

  function scrollUI() {
    const header = $('#header');
    const flutuante = $('#flutuante');
    let ticking = false;

    const atualizar = () => {
      const y = window.scrollY;
      header.classList.toggle('is-fixo', y > 8);
      // O flutuante aparece depois de 25% de scroll (styleguide §05).
      const total = document.documentElement.scrollHeight - window.innerHeight;
      flutuante.classList.toggle('is-visivel', total > 0 && y / total > 0.25);
      ticking = false;
    };

    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(atualizar);
    }, { passive: true });

    atualizar();
  }

  /* ── 3. Menu mobile ───────────────────────────────────────────────────── */

  function menu() {
    const painel = $('#menu');
    const toggle = $('#menu-toggle');
    if (!painel || !toggle) return;

    $$('.menu__item-wrap', painel).forEach((item, i) => item.style.setProperty('--i', i));

    const corpo = $('.menu__painel', painel);
    const header = $('#header');

    const definir = (aberto) => {
      if (aberto) {
        corpo.style.paddingTop = `${Math.round(header.getBoundingClientRect().bottom) + 24}px`;
      }
      painel.classList.toggle('is-aberto', aberto);
      painel.setAttribute('aria-hidden', String(!aberto));
      toggle.setAttribute('aria-expanded', String(aberto));
      document.body.classList.toggle('is-locked', aberto);
      document.body.classList.toggle('menu-aberto', aberto);
      window.VIRE_MOTION?.travarScroll(aberto);
      if (aberto) $('.menu__item', painel)?.focus({ preventScroll: true });
    };

    toggle.addEventListener('click', () => definir(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('.menu__item, .menu__rodape a', painel).forEach((a) => a.addEventListener('click', () => definir(false)));

    painel.addEventListener('click', (e) => {
      if (!e.target.closest('.menu__painel')) definir(false);
    });

    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && painel.classList.contains('is-aberto')) {
        definir(false);
        toggle.focus();
      }
    });

    matchMedia('(min-width: 1081px)').addEventListener('change', (e) => {
      if (e.matches) definir(false);
    });
  }

  /* ── 4. Vitrine ───────────────────────────────────────────────────────── */

  const vitrine = (() => {
    const grade = $('#vitrine-grade');
    const vazio = $('#vitrine-vazio');
    const barra = $('#filtro');
    const nota = $('#filtro-nota');
    let ativa = 'todos';

    const modelos = () => window.VIRE_MODELOS || [];
    const casa = (m, id) => id === 'todos' || (m.filtros || []).includes(id);
    const contar = (id) => modelos().filter((m) => casa(m, id)).length;

    /* Sempre velocidade · potência · autonomia, nesta ordem. Só entram os
       que o fabricante confirmou. */
    const ORDEM_NUMEROS = [
      ['velocidade', 'Velocidade'],
      ['potencia', 'Potência'],
      ['autonomia', 'Autonomia'],
    ];

    function blocoNumeros(m) {
      const s = m.specs;
      const numerico = (v) => v && typeof v === 'object' && v.valor != null && v.unidade;
      const disponiveis = s ? ORDEM_NUMEROS.filter(([campo]) => numerico(s[campo])) : [];

      if (!disponiveis.length) {
        return `
          <div class="card__pendente">
            <strong>Ficha técnica sob consulta</strong>
            Velocidade, potência e autonomia deste modelo são confirmados pela loja.
          </div>`;
      }

      const celulas = disponiveis.map(([campo, rotulo]) => `
        <div class="card__numero">
          <b>${s[campo].valor}<span>${escapar(s[campo].unidade)}</span></b>
          <small>${rotulo}</small>
        </div>`).join('');

      return `<div class="card__numeros" data-colunas="${disponiveis.length}">${celulas}</div>`;
    }

    function etiquetas(m) {
      const partes = [];
      const c = m.classificacao ? window.VIRE_CLASSIFICACOES[m.classificacao] : null;
      if (c) partes.push(`<span class="tag tag--${c.tom}">${escapar(c.rotulo)}</span>`);
      // Etiqueta comercial só com estoque confirmado.
      if (m.prontaEntrega) partes.push('<span class="tag tag--comercial">Pronta entrega</span>');
      return partes.join('');
    }

    function blocoPreco(m) {
      if (!m.preco) return '';
      const p = parcela(m.preco);
      return `
        <div class="card__preco">
          <span class="card__valor">${real.format(m.preco)}</span>
          ${p ? `<span class="card__parcela">ou ${escapar(p)}</span>` : ''}
        </div>`;
    }

    function card(m) {
      const classe = m.classificacao ? window.VIRE_CLASSIFICACOES[m.classificacao] : null;
      const categoria = classe ? classe.extenso : m.descritivo;
      return `
        <article class="card" data-id="${m.id}" data-anima>
          <span class="card__bloom" aria-hidden="true"></span>
          <div class="card__foto">
            <img src="${m.foto}" alt="${escapar(m.alt)}" loading="lazy" decoding="async" width="900" height="720">
            <div class="card__tags u-tags">${etiquetas(m)}</div>
            ${m.fabricante ? `<span class="card__fabricante">${escapar(m.fabricante)}</span>` : ''}
          </div>
          <div class="card__corpo">
            <div>
              <p class="card__categoria">${escapar(categoria)}</p>
              <h3 class="card__nome">${escapar(m.nome)}</h3>
            </div>
            ${blocoNumeros(m)}
            ${blocoPreco(m)}
            <div class="card__acoes">
              <a class="btn btn--primario" href="${linkWhats('modelo', { modelo: nomeCompleto(m) })}" target="_blank" rel="noopener">Comprar</a>
              <button class="btn btn--secundario" type="button" data-detalhes="${m.id}">Ficha</button>
            </div>
          </div>
        </article>`;
    }

    function render() {
      const visiveis = modelos().filter((m) => casa(m, ativa));
      grade.innerHTML = visiveis.map(card).join('');
      grade.hidden = visiveis.length === 0;

      const meta = window.VIRE_CATEGORIAS.find((c) => c.id === ativa);
      nota.textContent = meta ? meta.nota : '';

      if (visiveis.length === 0) {
        vazio.hidden = false;
        vazio.innerHTML = `
          <p class="t-h3" style="margin-bottom:var(--v-12)">Nenhum modelo neste recorte.</p>
          <p style="margin:0 auto var(--v-24);max-width:52ch">
            A loja passa as opções disponíveis na hora, pelo WhatsApp.
          </p>
          <a class="btn btn--primario" href="${linkWhats('categoria', { categoria: meta ? meta.nome.toLowerCase() : 'bike elétrica' })}" target="_blank" rel="noopener">
            Ver opções pelo WhatsApp
          </a>`;
      } else {
        vazio.hidden = true;
      }

      brilhoDeBorda();
      window.VIRE_MOTION?.revelar(grade);
      /* A grade mudou de altura: sem recalcular, tudo abaixo fica preso em
         opacity 0, porque os gatilhos apontam para posições que não existem. */
      window.VIRE_MOTION?.recalcular();
    }

    function irParaVitrine() {
      const raiz = getComputedStyle(document.documentElement);
      const alturaHeader = parseFloat(raiz.getPropertyValue('--v-header')) || 80;
      const alturaFiltro = barra ? barra.getBoundingClientRect().height : 0;
      window.VIRE_MOTION?.rolarPara(grade, -(alturaHeader + alturaFiltro + 24));
    }

    function barraFiltro() {
      barra.innerHTML = window.VIRE_CATEGORIAS.map((c) => `
        <button class="filtro__btn" type="button" data-cat="${c.id}" aria-pressed="${c.id === ativa}">
          ${escapar(c.nome)}
          <span class="filtro__contagem">${contar(c.id)}</span>
        </button>
      `).join('');
    }

    function filtrar(id, rolar = true, origem = 'filtro') {
      if (id !== ativa) emitir('filtrar_categoria', { categoria: id, origem });
      ativa = id;
      $$('.filtro__btn', barra).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === id)));
      render();
      if (rolar) requestAnimationFrame(irParaVitrine);
    }

    /* O estado "grudado" vem da geometria da sentinela, sinalizada: `top`
       negativo é acima (deve grudar), `top` grande é abaixo (não deve). */
    function grudar() {
      const sentinela = $('#filtro-sentinela');
      if (!barra || !sentinela) return;

      let alturaHeader = 80;
      const medirHeader = () => {
        alturaHeader = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v-header')) || 80;
      };

      let pendente = false;
      const conferir = () => {
        pendente = false;
        barra.classList.toggle('is-fixo', sentinela.getBoundingClientRect().top < alturaHeader + 10);
      };
      const agendar = () => {
        if (pendente) return;
        pendente = true;
        requestAnimationFrame(conferir);
      };

      medirHeader();
      conferir();
      addEventListener('scroll', agendar, { passive: true });
      addEventListener('load', () => { medirHeader(); conferir(); });
      let agendado = null;
      addEventListener('resize', () => {
        clearTimeout(agendado);
        agendado = setTimeout(() => { medirHeader(); conferir(); }, 150);
      });
    }

    /* Comparativo: os cinco lado a lado. Linhas de `VIRE_COMPARATIVO`; preço
       e parcela são calculados; célula sem dado fica com travessão. */
    function comparativo() {
      const tabela = $('#comparativo-tabela');
      if (!tabela) return;
      const lista = modelos();
      const celula = (m, chave) => {
        if (chave === 'preco') return m.preco ? real.format(m.preco) : '—';
        if (chave === 'parcela') return parcela(m.preco) || '—';
        const v = m.specs?.[chave];
        if (v == null) return '—';
        return typeof v === 'object' ? `${v.valor} ${v.unidade}` : v;
      };
      const cabeca = `<thead><tr><th scope="col">Modelo</th>${lista.map((m) => `
        <th scope="col"><button class="comparativo__acao" type="button" data-detalhes="${m.id}">${escapar(m.nome)}</button></th>`).join('')}</tr></thead>`;
      const corpo = `<tbody>${window.VIRE_COMPARATIVO.map(([chave, rotulo]) => `
        <tr data-linha="${chave}"><th scope="row">${rotulo}</th>${lista.map((m) => `<td>${escapar(celula(m, chave))}</td>`).join('')}</tr>`).join('')}</tbody>`;
      tabela.insertAdjacentHTML('beforeend', cabeca + corpo);
    }

    function iniciar() {
      if (!grade) return;
      barraFiltro();
      render();
      comparativo();
      grudar();
      barra.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cat]');
        if (btn) filtrar(btn.dataset.cat);
      });

      addEventListener('load', () => window.VIRE_MOTION?.recalcular());

      grade.addEventListener('click', (e) => {
        const comprar = e.target.closest('.card a[href*="wa.me"]');
        if (comprar) {
          const card = comprar.closest('.card');
          comprar.dataset.rastreado = '1';
          interesseNoModelo(modelos().find((x) => x.id === card?.dataset.id), 'card');
        }
      });
    }

    return { iniciar, filtrar };
  })();

  /* ── 5. Facho de luz na borda do card (EFFECT-001) ────────────────────
     Duas variáveis CSS: proximidade da borda e ângulo do cursor. Escrita
     uma vez por quadro. Nada anima em JS; o CSS faz o resto. */

  function brilhoDeBorda() {
    if (matchMedia('(hover: none)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    $$('.card').forEach((card) => {
      if (card.dataset.brilho === 'on') return;
      card.dataset.brilho = 'on';

      let pendente = false;
      let ultimo = null;

      const escrever = () => {
        pendente = false;
        if (!ultimo) return;
        card.style.setProperty('--brilho', ultimo.brilho.toFixed(3));
        card.style.setProperty('--angulo', `${ultimo.angulo.toFixed(1)}deg`);
      };

      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = card.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);

        // Projeta o vetor centro→cursor até a moldura: chega a 1 tanto na
        // quina quanto no meio de uma aresta.
        const kx = dx === 0 ? Infinity : (r.width / 2) / Math.abs(dx);
        const ky = dy === 0 ? Infinity : (r.height / 2) / Math.abs(dy);
        const proximidade = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

        let angulo = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angulo < 0) angulo += 360;

        // Só acende no terço externo: no centro do card o facho fica apagado.
        ultimo = { brilho: Math.max(0, (proximidade - 0.35) / 0.65), angulo };
        if (!pendente) {
          pendente = true;
          requestAnimationFrame(escrever);
        }
      });

      card.addEventListener('pointerleave', () => {
        ultimo = null;
        card.style.setProperty('--brilho', '0');
      });

      // Paridade de teclado: foco dentro do card acende a moldura.
      card.addEventListener('focusin', () => {
        card.style.setProperty('--brilho', '0.7');
        card.style.setProperty('--angulo', '180deg');
      });
      card.addEventListener('focusout', () => card.style.setProperty('--brilho', '0'));
    });
  }

  /* ── 6. Lightbox da galeria ───────────────────────────────────────────── */

  const lightbox = (() => {
    const raiz = $('#lightbox');
    let fotos = [];
    let indice = 0;
    let voltarPara = null;

    function pintar() {
      const foto = fotos[indice];
      if (!foto) return;
      $('#lightbox-foto').src = foto.src;
      $('#lightbox-foto').alt = foto.alt || '';
      $('#lightbox-contador').textContent = `${indice + 1} / ${fotos.length}`;
      const soUma = fotos.length < 2;
      $$('.lightbox__seta', raiz).forEach((b) => { b.hidden = soUma; });
      $('#lightbox-contador').hidden = soUma;
    }

    function andar(passo) {
      if (!fotos.length) return;
      indice = (indice + passo + fotos.length) % fotos.length;
      pintar();
    }

    function abrir(lista, inicio = 0) {
      if (!raiz || !lista?.length) return;
      fotos = lista;
      indice = Math.max(0, Math.min(inicio, lista.length - 1));
      voltarPara = document.activeElement;
      pintar();
      raiz.classList.add('is-aberto');
      raiz.setAttribute('aria-hidden', 'false');
      $('.lightbox__fechar', raiz).focus({ preventScroll: true });
    }

    function fechar() {
      if (!raiz || !raiz.classList.contains('is-aberto')) return;
      raiz.classList.remove('is-aberto');
      raiz.setAttribute('aria-hidden', 'true');
      voltarPara?.focus?.({ preventScroll: true });
      voltarPara = null;
    }

    const estaAberto = () => Boolean(raiz?.classList.contains('is-aberto'));

    function iniciar() {
      if (!raiz) return;
      raiz.addEventListener('click', (e) => {
        const passo = e.target.closest('[data-lightbox-passo]');
        if (passo) { andar(Number(passo.dataset.lightboxPasso)); return; }
        fechar();
      });
      addEventListener('keydown', (e) => {
        if (!estaAberto()) return;
        if (e.key === 'Escape') { e.stopPropagation(); fechar(); }
        if (e.key === 'ArrowRight') andar(1);
        if (e.key === 'ArrowLeft') andar(-1);
      }, true);
    }

    return { iniciar, abrir, fechar, estaAberto };
  })();

  /* ── 7. Ficha técnica (painel lateral) ────────────────────────────────── */

  const modal = (() => {
    const raiz = $('#modal');
    let origem = null;
    let atual = null;
    let corAtiva = 0;

    /* Cor com galeria própria troca as fotos do veículo inteiro; as marcadas
       com `detalhe: true` sobrevivem à troca. Sem galeria, a cor só muda a
       mensagem do WhatsApp. */
    function fotosDaCorAtiva(m) {
      const daCor = m.cores?.[corAtiva]?.galeria;
      if (!daCor) return m.galeria || [];
      return [...daCor, ...(m.galeria || []).filter((f) => f.detalhe)];
    }

    function galeria(m, indice = 0) {
      const trilho = $('#modal-slider');
      const fotos = fotosDaCorAtiva(m);
      if (!fotos.length) return;
      const i = Math.min(indice, fotos.length - 1);

      /* `fundo: 'branco'` = catálogo sobre fundo branco (quadro branco);
         o resto cabe no quadro preto. Só o primeiro slide carrega na hora;
         os outros entram quando o trilho rola até eles. */
      trilho.innerHTML = fotos.map((f, k) => `
        <div class="modal__slide" role="group" aria-roledescription="slide" aria-label="${k + 1} de ${fotos.length}">
          <img src="${f.src}" alt="${escapar(f.alt)}" draggable="false" decoding="async"
               class="${f.fundo === 'branco' ? 'is-branca' : ''}"${k > 0 ? ' loading="lazy"' : ''}>
        </div>`).join('');

      // Miniatura própria (240 px) quando existe: abrir a ficha não baixa a galeria inteira.
      $('#modal-miniaturas').innerHTML = fotos.map((f, k) => `
        <button class="modal__mini" type="button" data-foto="${k}" aria-current="${k === i}" aria-label="Ver foto ${k + 1} de ${fotos.length}">
          <img src="${f.mini || f.src}" alt="" loading="lazy" decoding="async" width="240" height="192">
        </button>`).join('');
      $('#modal-miniaturas').hidden = fotos.length < 2;

      irPara(i, 'auto');
    }

    let houveArrasto = false;
    const trilhoArrastou = () => houveArrasto;

    function slideAtual() {
      const trilho = $('#modal-slider');
      const largura = trilho.clientWidth || 1;
      return Math.round(trilho.scrollLeft / largura);
    }

    function irPara(indice, comportamento = 'smooth') {
      const trilho = $('#modal-slider');
      const slides = trilho.children.length;
      if (!slides) return;
      const alvo = Math.max(0, Math.min(indice, slides - 1));
      trilho.scrollTo({ left: alvo * trilho.clientWidth, behavior: comportamento });
      marcarMiniatura(alvo);
    }

    function marcarMiniatura(indice) {
      $$('#modal-miniaturas .modal__mini').forEach((b, k) => {
        b.setAttribute('aria-current', String(k === indice));
      });
    }

    function ligarSlider() {
      const trilho = $('#modal-slider');
      if (!trilho) return;

      let pendente = false;
      trilho.addEventListener('scroll', () => {
        if (pendente) return;
        pendente = true;
        requestAnimationFrame(() => { pendente = false; marcarMiniatura(slideAtual()); });
      }, { passive: true });

      trilho.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); irPara(slideAtual() + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(slideAtual() - 1); }
      });

      let arrastando = false;
      let inicioX = 0;
      let inicioScroll = 0;
      let moveu = 0;

      trilho.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        arrastando = true;
        moveu = 0;
        inicioX = e.clientX;
        inicioScroll = trilho.scrollLeft;
        trilho.classList.add('is-arrastando');
        trilho.setPointerCapture(e.pointerId);
      });

      trilho.addEventListener('pointermove', (e) => {
        if (!arrastando) return;
        const delta = e.clientX - inicioX;
        moveu = Math.abs(delta);
        trilho.scrollLeft = inicioScroll - delta;
      });

      const soltar = (e) => {
        if (!arrastando) return;
        arrastando = false;
        houveArrasto = moveu > 6;
        setTimeout(() => { houveArrasto = false; }, 0);
        trilho.classList.remove('is-arrastando');
        if (trilho.hasPointerCapture?.(e.pointerId)) trilho.releasePointerCapture(e.pointerId);
        const largura = trilho.clientWidth || 1;
        const partiu = Math.round(inicioScroll / largura);
        const delta = trilho.scrollLeft - inicioScroll;
        if (moveu > largura * 0.2) irPara(partiu + (delta > 0 ? 1 : -1));
        else irPara(partiu);
      };

      trilho.addEventListener('pointerup', soltar);
      trilho.addEventListener('pointercancel', soltar);
    }

    function ficha(m) {
      const alvo = $('#modal-ficha');
      if (!m.specs) {
        alvo.innerHTML = `
          <div style="grid-template-columns:1fr">
            <dt style="text-transform:none;letter-spacing:0;font-family:inherit;font-size:14px;color:var(--v-prata);line-height:1.6">
              A ficha técnica completa deste modelo é confirmada pela loja.
            </dt>
          </div>`;
        return;
      }
      /* Campo sem dado simplesmente não aparece. */
      alvo.innerHTML = window.VIRE_FICHA_ORDEM
        .filter(([chave]) => m.specs[chave] != null)
        .map(([chave, rotulo]) => {
          const bruto = m.specs[chave];
          const valor = typeof bruto === 'object' ? `${bruto.valor} ${bruto.unidade}` : bruto;
          const nota = typeof bruto === 'object' && bruto.nota
            ? `<small class="ficha__nota">${escapar(bruto.nota)}</small>`
            : '';
          return `<div><dt>${rotulo}</dt><dd>${escapar(valor)}${nota}</dd></div>`;
        }).join('');
    }

    function equipamentos(m) {
      const bloco = $('#modal-equipamentos');
      const itens = m.equipamentos || [];
      bloco.hidden = !itens.length;
      if (!itens.length) return;
      $('#modal-equipamentos-lista').innerHTML = itens.map((item) => `<li>${escapar(item)}</li>`).join('');
    }

    function preco(m) {
      const bloco = $('#modal-preco');
      if (!m.preco) { bloco.hidden = true; return; }
      const p = parcela(m.preco);
      bloco.hidden = false;
      bloco.innerHTML = `<b>${real.format(m.preco)}</b>${p ? `<span>ou ${escapar(p)}${cfg.pagamento.descontoAVista ? ' · à vista com desconto' : ''}</span>` : ''}`;
    }

    /* O valor entra numa declaração CSS dentro de `style`: caminho suspeito é
       descartado e cai no hex, que é validado. */
    const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;
    function fundoDoSwatch(c) {
      if (c.imagem && !/["'()\\]/.test(c.imagem)) {
        return `background:url('${c.imagem}') center/cover no-repeat`;
      }
      return `background:${HEX_VALIDO.test(c.hex || '') ? c.hex : 'transparent'}`;
    }

    function cores(m) {
      const bloco = $('#modal-cores');
      if (!m.cores || !m.cores.length) { bloco.hidden = true; return; }
      bloco.hidden = false;
      $('#modal-cor-nome').textContent = m.cores[corAtiva].nome;
      $('#modal-swatches').innerHTML = m.cores.map((c, i) => `
        <button class="modal__swatch" type="button" data-cor="${i}"
                aria-pressed="${i === corAtiva}" aria-label="Cor ${escapar(c.nome)}" title="${escapar(c.nome)}">
          <i style="${fundoDoSwatch(c)}" aria-hidden="true"></i>
        </button>`).join('');
    }

    function cta() {
      const botao = $('#modal-cta');
      const nome = nomeCompleto(atual);
      const cor = atual.cores?.[corAtiva]?.nome;
      botao.href = cor
        ? linkWhats('modeloCor', { modelo: nome, cor })
        : linkWhats('modelo', { modelo: nome });
    }

    function abrir(id, gatilho) {
      atual = (window.VIRE_MODELOS || []).find((m) => m.id === id);
      if (!atual) return;
      origem = gatilho || null;
      corAtiva = 0;

      const classe = atual.classificacao ? window.VIRE_CLASSIFICACOES[atual.classificacao] : null;
      $('#modal-eyebrow').textContent = `${atual.fabricante ? `${atual.fabricante} · ` : ''}${classe ? classe.extenso : atual.descritivo}`;
      $('#modal-titulo').textContent = atual.nome;
      $('#modal-tags').innerHTML = classe ? `<span class="tag tag--${classe.tom}">${escapar(classe.rotulo)}</span>` : '';

      const chamada = $('#modal-chamada');
      chamada.textContent = atual.chamada || '';
      chamada.hidden = !atual.chamada;

      const notaLegal = $('#modal-nota-legal');
      notaLegal.textContent = classe?.nota || '';
      notaLegal.hidden = !classe?.nota;

      galeria(atual);
      ficha(atual);
      equipamentos(atual);
      preco(atual);
      cores(atual);
      cta();
      $('#modal-corpo').scrollTop = 0;

      emitir('view_item', {
        item_id: atual.id,
        item_name: nomeCompleto(atual),
        item_brand: atual.fabricante || undefined,
        item_category: atual.categoria || undefined,
        value: atual.preco || undefined,
        currency: atual.preco ? 'BRL' : undefined,
      });

      raiz.classList.add('is-aberto');
      raiz.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      window.VIRE_MOTION?.travarScroll(true);
      history.replaceState(null, '', `#modelo/${atual.id}`);
      $('#modal-titulo').setAttribute('tabindex', '-1');
      $('#modal-titulo').focus({ preventScroll: true });
    }

    function fechar() {
      lightbox.fechar();
      raiz.classList.remove('is-aberto');
      raiz.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      window.VIRE_MOTION?.travarScroll(false);
      if (location.hash.startsWith('#modelo/')) {
        history.replaceState(null, '', location.pathname + location.search);
      }
      origem?.focus({ preventScroll: true });
      origem = null;
      atual = null;
    }

    function iniciar() {
      if (!raiz) return;
      ligarSlider();
      lightbox.iniciar();

      // Qualquer [data-detalhes] na página abre a ficha: card, hero, comparativo.
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-detalhes]');
        if (btn) abrir(btn.dataset.detalhes, btn);
      });

      raiz.addEventListener('click', (e) => {
        if (e.target.closest('[data-fechar-modal]')) { fechar(); return; }

        const mini = e.target.closest('[data-foto]');
        if (mini) { irPara(Number(mini.dataset.foto)); return; }

        if (e.target.closest('.modal__slider') && !trilhoArrastou()) {
          lightbox.abrir(fotosDaCorAtiva(atual), slideAtual());
          return;
        }

        const botaoCta = e.target.closest('#modal-cta');
        if (botaoCta && atual) {
          botaoCta.dataset.rastreado = '1';
          interesseNoModelo(atual, 'ficha', { cor: atual.cores?.[corAtiva]?.nome });
          return;
        }

        const swatch = e.target.closest('[data-cor]');
        if (swatch) {
          const anterior = fotosDaCorAtiva(atual)[0]?.src;
          corAtiva = Number(swatch.dataset.cor);
          cores(atual);
          if (fotosDaCorAtiva(atual)[0]?.src !== anterior) galeria(atual, 0);
          cta();
        }
      });

      addEventListener('keydown', (e) => {
        if (!raiz.classList.contains('is-aberto')) return;
        if (lightbox.estaAberto()) return;
        if (e.key === 'Escape') { fechar(); return; }
        if (e.key !== 'Tab') return;

        const focaveis = $$('button, a[href], [tabindex]:not([tabindex="-1"])', raiz)
          .filter((el) => el.offsetParent !== null);
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
      });

      /* Âncora compartilhável: /#modelo/v35 abre a ficha direto. */
      const abrirPorHash = () => {
        const hash = location.hash.match(/^#modelo\/(.+)$/);
        if (hash) abrir(decodeURIComponent(hash[1]), null);
      };
      addEventListener('hashchange', abrirPorHash);
      requestAnimationFrame(abrirPorHash);
    }

    return { iniciar, abrir };
  })();

  /* ── 8. FAQ ───────────────────────────────────────────────────────────── */

  function faq() {
    const alvo = $('#faq-lista');
    if (!alvo) return;

    alvo.innerHTML = (window.VIRE_FAQ || []).map((f, i) => `
      <div class="faq__item${i === 0 ? ' is-aberto' : ''}">
        <h3 style="margin:0">
          <button class="faq__botao" type="button" aria-expanded="${i === 0}" aria-controls="faq-r${i}">
            <span>${escapar(f.q)}</span>
            <span class="faq__sinal" aria-hidden="true">${i === 0 ? '−' : '+'}</span>
          </button>
        </h3>
        <div class="faq__resposta" id="faq-r${i}" role="region">
          <div><p>${escapar(f.a)}</p></div>
        </div>
      </div>
    `).join('');

    alvo.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq__botao');
      if (!btn) return;
      const item = btn.closest('.faq__item');
      const aberto = item.classList.toggle('is-aberto');
      btn.setAttribute('aria-expanded', String(aberto));
      $('.faq__sinal', btn).textContent = aberto ? '−' : '+';
      // A resposta muda a altura da página: os gatilhos abaixo precisam saber.
      setTimeout(() => window.VIRE_MOTION?.recalcular(), 260);
    });
  }

  /* ── 9. Depoimentos ───────────────────────────────────────────────────── */

  function depoimentos() {
    const lista = window.VIRE_DEPOIMENTOS || [];
    const secao = $('#depoimentos');
    if (!secao || !lista.length) return; // sem depoimento real, o bloco não existe

    secao.hidden = false;
    $('#depoimentos-grade').innerHTML = lista.map((d) => `
      <figure class="depoimento" data-anima style="margin:0">
        <blockquote class="depoimento__texto" style="margin:0">${escapar(d.texto)}</blockquote>
        <figcaption class="depoimento__autor">
          ${d.foto ? `<img class="depoimento__foto" src="${escapar(d.foto)}" alt="" loading="lazy">` : ''}
          <span>
            <span class="depoimento__nome">${escapar(d.nome)}</span><br>
            <span class="depoimento__bairro">${escapar(d.bairro)} · ${escapar(d.modelo)}</span>
          </span>
        </figcaption>
      </figure>
    `).join('');
  }

  /* ── 10. Simulador de custo ───────────────────────────────────────────── */

  function simulador() {
    const km = $('#km-dia');
    if (!km) return;
    const e = cfg.economia;

    $('#economia-premissas').textContent =
      `Estimativa: ${e.diasPorMes} dias de uso. App de carro a R$ ${e.precoKmApp.toFixed(2).replace('.', ',')}/km em corrida curta; ` +
      `gasolina a R$ ${e.precoGasolina.toFixed(2).replace('.', ',')}/l com moto a ${e.consumoMoto} km/l; ` +
      `energia a R$ ${e.precoKwh.toFixed(2).replace('.', ',')}/kWh com consumo de ${String(e.consumoEbike).replace('.', ',')} kWh por km ` +
      `(bateria 48V 15,6Ah para 60 km). Valores mudam com a sua tarifa e o seu trajeto.`;

    const atualizar = () => {
      const dia = Number(km.value);
      const mes = dia * e.diasPorMes;
      const app = mes * e.precoKmApp;
      const gasolina = (mes / e.consumoMoto) * e.precoGasolina;
      const eletrico = mes * e.consumoEbike * e.precoKwh;
      const trecho = e.kmBotafogoCentro * e.consumoEbike * e.precoKwh;

      $('#km-saida').textContent = `${dia} km/dia`;
      $('#custo-app').textContent = real.format(app);
      $('#custo-gasolina').textContent = real.format(gasolina);
      $('#custo-eletrico').textContent = realCentavos.format(eletrico);
      $('#economia-nota').textContent =
        `Diferença de ${real.format(app - eletrico)} por mês frente ao app, ${real.format((app - eletrico) * 12)} no ano. ` +
        `Botafogo → Centro (cerca de ${e.kmBotafogoCentro} km) sai por ${realCentavos.format(trecho)} de energia.`;
    };

    km.addEventListener('input', atualizar);
    atualizar();
  }

  /* ── 11. Formulário de test-ride (dois campos) ────────────────────────── */

  function formulario() {
    const form = $('#form-testride');
    if (!form) return;

    const marcar = (campo, erroId, mensagem) => {
      const erro = $(`#${erroId}`);
      campo.setAttribute('aria-invalid', String(Boolean(mensagem)));
      erro.textContent = mensagem || '';
      return !mensagem;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = $('#tr-nome');
      const whats = $('#tr-whats');

      const nomeOk = marcar(nome, 'erro-nome',
        nome.value.trim().length < 2 ? 'Informe o seu nome para a loja te chamar.' : '');

      const digitos = whats.value.replace(/\D/g, '');
      const whatsOk = marcar(whats, 'erro-whats',
        digitos.length < 10 || digitos.length > 11 ? 'Informe o WhatsApp com DDD, ex.: (21) 90000-0000.' : '');

      if (!nomeOk || !whatsOk) {
        (!nomeOk ? nome : whats).focus();
        return;
      }

      const interesse = $('#tr-interesse').value;
      const url = linkWhats('testRide', { nome: nome.value.trim(), interesse });

      emitir('generate_lead', {
        origem: 'formulario',
        interesse,
        telefone: whats.value,
        nome_lead: nome.value.trim(),
        value: 1,
        currency: 'BRL',
      });

      window.open(url, '_blank', 'noopener');

      form.outerHTML = `
        <div class="form__sucesso" role="status">
          <h3 class="t-h3">Quase lá, ${escapar(nome.value.trim().split(' ')[0])}.</h3>
          <p style="margin:0;color:var(--v-corpo)">
            Abrimos o WhatsApp com a sua mensagem pronta. Se a janela não apareceu,
            toque no botão abaixo. A loja responde em horário comercial.
          </p>
          <a class="btn btn--escuro" href="${url}" target="_blank" rel="noopener" style="justify-self:center">
            Abrir o WhatsApp
          </a>
        </div>`;
    });
  }

  /* ── 12. Vídeo do hero ────────────────────────────────────────────────
     Carrega só depois do pôster e só quando faz sentido: nunca em
     prefers-reduced-motion, save-data ou conexão 2G. Se o autoplay for
     bloqueado, o pôster fica e nada quebra. O vídeo não tem faixa de áudio. */

  function midia() {
    const video = $('#hero-video');
    if (!video) return;

    const conexao = navigator.connection || {};
    const evitar = matchMedia('(prefers-reduced-motion: reduce)').matches
      || conexao.saveData === true
      || /(^|[^3-5])2g/.test(conexao.effectiveType || '');
    if (evitar) return;

    const mobile = matchMedia('(max-width: 860px)').matches;
    const src = mobile ? video.dataset.srcMobile : video.dataset.src;
    if (!src) return;
    if (mobile && video.dataset.posterMobile) video.poster = video.dataset.posterMobile;

    const ligar = () => {
      if (video.src) return;
      video.src = src;
      video.addEventListener('canplay', () => video.classList.add('is-pronto'), { once: true });
      video.play().catch(() => { /* autoplay bloqueado: o pôster fica */ });
    };

    // Depois do load, para o vídeo não disputar banda com o pôster e as fontes.
    if (document.readyState === 'complete') ligar();
    else addEventListener('load', ligar, { once: true });
  }

  /* ── 13. Mapa ─────────────────────────────────────────────────────────── */

  function mapa() {
    const frame = $('#mapa');
    if (!frame) return;
    const src = `https://www.google.com/maps?q=${encodeURIComponent(cfg.endereco.busca)}&output=embed`;
    const obs = new IntersectionObserver((entradas, o) => {
      if (!entradas[0].isIntersecting) return;
      frame.src = src;
      o.disconnect();
    }, { rootMargin: '300px' });
    obs.observe(frame);
  }

  /* ── partida ──────────────────────────────────────────────────────────── */

  function iniciar() {
    aplicarConfig();
    scrollUI();
    menu();
    vitrine.iniciar();
    modal.iniciar();
    faq();
    depoimentos();
    simulador();
    formulario();
    midia();
    mapa();

    /* motion.js roda antes daqui (é `defer`), então o que foi injetado agora
       ainda não tem tween. Sem esta chamada, ficaria preso em opacity 0. */
    window.VIRE_MOTION?.revelar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
