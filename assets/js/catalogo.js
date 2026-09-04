/* ==========================================================================
   VIRE · catálogo de modelos
   --------------------------------------------------------------------------
   FONTE DOS DADOS: fichas enviadas pela loja (projeto/modelos_scooters_loja/
   descricao_modelos), uma por modelo, com preço, especificações, lista técnica
   e cores. Nada aqui é estimativa. O que a ficha não traz, não aparece.

   PENDÊNCIAS (ver README):
   · Fabricante: "Inow" é o que está impresso na bateria em todas as fotos.
     A ficha não nomeia a marca. Confirmar antes de publicar.
   · Garantia: a ficha não informa prazo. O campo fica fora da ficha técnica.
   · `prontaEntrega`: só vira `true` com confirmação de estoque. A etiqueta
     amarela "Pronta entrega" NÃO aparece enquanto for false.
   · Foto por cor: só a V20 PRO tem foto da segunda cor (marrom). As demais
     cores trocam apenas a mensagem do WhatsApp.

   COMO COMPLETAR: cada modelo tem `specs`, `equipamentos`, `cores`, `preco` e
   `filtros`. O card monta os números, o preço e a parcela sozinho; campo sem
   dado some da ficha em vez de virar "não informado".
   ========================================================================== */

/* Ordem canônica da ficha técnica. Campo ausente não é renderizado. */
window.VIRE_FICHA_ORDEM = [
  ['classificacao', 'Classificação legal'],
  ['velocidade', 'Velocidade máxima'],
  ['potencia', 'Potência do motor'],
  ['autonomia', 'Autonomia'],
  ['bateria', 'Bateria'],
  ['recarga', 'Tempo de recarga'],
  ['marchas', 'Marchas'],
  ['freios', 'Freios'],
  ['suspensao', 'Suspensão'],
  ['carga', 'Carga máxima'],
  ['peso', 'Peso'],
  ['fabricante', 'Fabricante'],
];

/* Chips da vitrine. Com seis modelos da MESMA categoria legal, filtrar por
   "e-bike" seria um chip só. Os recortes abaixo saem dos dados das fichas
   (preço, autonomia, itens de série) e respondem perguntas reais de quem
   compra: quanto custa, quanto anda, leva alguém, leva carga. */
window.VIRE_CATEGORIAS = [
  {
    id: 'todos',
    nome: 'Todos',
    nota: 'Os seis modelos em loja. Todos são bicicletas elétricas pela CONTRAN 996/2023: até 1.000 W, motor até 32 km/h e pedal assistido. Sem CNH, sem placa.',
  },
  {
    id: 'ate9',
    nome: 'Até R$ 9 mil',
    nota: 'A entrada da linha, em até 12x sem juros: V20 Mini, V20 Brake Pro e V20 Pro. Mesmo limite legal, mesma bateria removível de 48 V.',
  },
  {
    id: 'carona',
    nome: 'Pedal carona',
    nota: 'Modelos com pedal carona de fábrica, para levar alguém junto. O limite de carga de cada um está na ficha.',
  },
  {
    id: 'longa',
    nome: 'Mais de 100 km',
    nota: 'Autonomia declarada pelo fabricante acima de 100 km por carga. Para quem não quer ver tomada durante a semana.',
  },
  {
    id: 'carga',
    nome: 'Para carga',
    nota: 'Suporte de fábrica para cesta e baú: compra do mercado, mochila e entrega sem gambiarra.',
  },
];

/* Rótulo e tom da etiqueta legal. Preta com texto amarelo = classificação
   legal; amarela com texto preto = comercial ("Pronta entrega"). Uma de cada,
   no máximo, como manda o styleguide. */
window.VIRE_CLASSIFICACOES = {
  ebike: {
    rotulo: 'Sem CNH',
    tom: 'legal',
    extenso: 'Bicicleta elétrica',
    nota: 'Até 1.000 W, motor limitado a 32 km/h e pedal assistido obrigatório: o motor só funciona enquanto você pedala. Resolução CONTRAN 996/2023.',
  },
};

/* ── Cores ────────────────────────────────────────────────────────────────
   Hex informado pela loja na ficha. "Carbono" e "Preto" usam o mesmo tom. */
const COR = {
  preto: { nome: 'Preto', hex: '#0C0D0D' },
  carbono: { nome: 'Carbono', hex: '#0C0D0D' },
  branco: { nome: 'Branco', hex: '#FFFFFF' },
  marrom: { nome: 'Marrom', hex: '#803300' },
};

/* ── Blocos repetidos ─────────────────────────────────────────────────── */

// Comum aos seis modelos, conforme as fichas.
const BASE = {
  classificacao: 'Bicicleta elétrica · CONTRAN 996/2023',
  velocidade: { valor: 32, unidade: 'km/h' },
  recarga: '6 a 8 h · carregador bivolt',
  freios: 'A disco',
  marchas: '7 níveis',
  fabricante: 'Inow', // confirmado pela loja para a V20 Brake Pro; é a marca impressa na bateria dos demais
};

// Itens de série presentes em TODAS as fichas.
const EQUIP_BASE = [
  'Painel em LED', 'Farol em LED', 'Setas', 'Buzina', 'Alarme',
  'Bateria removível', 'Carregador bivolt', 'NFC', 'Chave reserva',
  'Freio a disco', '7 níveis de marcha', 'Cadeado acoplado',
];

/* Uma foto da galeria: arquivo grande (máx. 1400 px) + miniatura de 240 px
   para o slider. `fundo: 'branco'` = catálogo sobre fundo branco (o quadro da
   ficha fica branco); sem `fundo`, cabe no quadro preto. `detalhe: true` =
   close de componente que sobrevive à troca de cor. */
const img = (nome, alt, extra = {}) => ({
  src: `assets/img/models/${nome}.webp`,
  mini: `assets/img/models/${nome}-mini.webp`,
  alt,
  ...extra,
});
const branca = (nome, alt, extra = {}) => img(nome, alt, { fundo: 'branco', ...extra });

window.VIRE_MODELOS = [
  {
    id: 'v35',
    nome: 'V35',
    fabricante: BASE.fabricante,
    descritivo: 'Bicicleta elétrica',
    categoria: 'ebike',
    classificacao: 'ebike',
    filtros: ['carona', 'longa'],
    chamada: '120 km por carga e amortecedor duplo: a que aguenta a semana inteira de Botafogo ao Centro sem ver tomada.',
    foto: 'assets/img/models/v35-card.webp',
    alt: 'Bicicleta elétrica Inow V35 preta com banco marrom, de perfil, sobre fundo branco',
    galeria: [
      branca('v35-estudio', 'Inow V35 de perfil sobre fundo branco, foto de catálogo'),
      img('v35-rua-frente', 'Inow V35 parada em frente a um jardim e um prédio de vidro, vista de frente em três quartos'),
      img('v35-lateral', 'Inow V35 de perfil, com o banco marrom comprido, a bateria no quadro e os pneus largos'),
      img('v35-rua-aberta', 'Inow V35 em plano aberto numa praça com espelho d\'água e prédios ao fundo'),
      img('v35-rua-sol', 'Inow V35 sob o sol entre árvores e um prédio de vidro, vista de perfil'),
      img('v35-guidao', 'Guidão da Inow V35 visto do banco, com o painel digital no centro e os comandos nas manoplas', { detalhe: true }),
      img('v35-1', 'Bicicleta elétrica Inow V35 preta com banco marrom, em três quartos, sobre fundo escuro de estúdio'),
    ],
    specs: {
      ...BASE,
      potencia: { valor: 1000, unidade: 'W' },
      autonomia: { valor: 120, unidade: 'km' },
      bateria: 'Lítio 48V 15,6Ah · removível',
      suspensao: 'Amortecedor duplo',
      carga: 'Até 180 kg',
      peso: '56,5 kg',
    },
    equipamentos: [...EQUIP_BASE, 'Amortecedor duplo', 'Pedal carona'],
    cores: [COR.preto, COR.branco],
    preco: 11990,
    prontaEntrega: false,
  },
  {
    id: 'x50-action',
    nome: 'X50 Action',
    fabricante: BASE.fabricante,
    descritivo: 'Bicicleta elétrica',
    categoria: 'ebike',
    classificacao: 'ebike',
    filtros: ['carga'],
    chamada: 'Suporte de fábrica para cesta e baú, bateria de 19 Ah: a que leva a compra do mercado e o notebook sem gambiarra.',
    foto: 'assets/img/models/x50-action-card.webp',
    alt: 'Bicicleta elétrica Inow X50 Action preta em três quartos frontal, com farol redondo, retrovisor e suporte dianteiro, sobre fundo branco',
    galeria: [
      branca('x50-action-nova', 'Inow X50 Action em três quartos frontal sobre fundo branco, com farol redondo, retrovisor e suporte dianteiro para cesta'),
      branca('x50-action-lateral', 'Inow X50 Action de perfil no estúdio, com o suporte para cesta na frente, o suporte para baú atrás e os pneus largos'),
      branca('x50-action-frente', 'Inow X50 Action em três quartos frontal no estúdio, com o farol redondo e o suporte dianteiro'),
      branca('x50-action-traseira', 'Inow X50 Action em três quartos traseiro, mostrando o suporte para baú e a suspensão traseira'),
      branca('x50-action-estudio-frente', 'Inow X50 Action em três quartos frontal sobre fundo neutro de estúdio, com retrovisor e suporte dianteiro para cesta'),
      img('x50-action-1', 'Bicicleta elétrica Inow X50 Action preta com farol aceso, vista de três quartos frontal, sobre fundo escuro de estúdio'),
    ],
    specs: {
      ...BASE,
      potencia: { valor: 1000, unidade: 'W' },
      autonomia: { valor: 60, unidade: 'km' },
      bateria: 'Lítio 48V 19Ah · removível',
      carga: 'Até 180 kg',
      peso: '52 kg',
    },
    equipamentos: [...EQUIP_BASE, 'Suporte para cesta', 'Suporte para baú'],
    cores: [COR.preto],
    preco: 10490,
    prontaEntrega: false,
  },
  {
    id: 'd50-cross',
    nome: 'D50 Cross',
    fabricante: BASE.fabricante,
    descritivo: 'Bicicleta elétrica',
    categoria: 'ebike',
    classificacao: 'ebike',
    filtros: [],
    chamada: 'Pneu largo e paralama alto para o calçamento e a ladeira que o Rio insiste em ter.',
    foto: 'assets/img/models/d50-cross-card.webp',
    alt: 'Bicicleta elétrica Inow D50 Cross preta em três quartos frontal, com farol aceso e paralamas altos, sobre fundo claro de estúdio',
    galeria: [
      branca('d50-cross-estudio', 'Inow D50 Cross em três quartos frontal sobre fundo claro, com farol aceso e paralamas altos'),
      branca('d50-cross-lateral', 'Inow D50 Cross de perfil sobre fundo branco, mostrando a bateria no quadro, a suspensão e os pneus de cravos'),
      img('d50-cross-1', 'Bicicleta elétrica Inow D50 Cross preta, estilo motocross com paralamas altos, sobre fundo escuro de estúdio'),
    ],
    specs: {
      ...BASE,
      potencia: { valor: 1000, unidade: 'W' },
      autonomia: { valor: 50, unidade: 'km' },
      bateria: 'Lítio 48V 15,6Ah · removível',
      carga: 'Até 180 kg',
      peso: '51,1 kg',
    },
    equipamentos: EQUIP_BASE,
    cores: [COR.carbono],
    preco: 10490,
    prontaEntrega: false,
  },
  /* V20 Brake Pro (Inow) e V20 Pro (white label) são a MESMA bike, mesma ficha
     e mesmo preço, segundo a loja: a diferença é a marca Inow na bateria. Os
     arquivos de foto da Brake Pro mantêm o prefixo `v20-pro-` por histórico. */
  {
    id: 'v20-brake-pro',
    nome: 'V20 Brake Pro',
    fabricante: BASE.fabricante,
    descritivo: 'Bicicleta elétrica',
    categoria: 'ebike',
    classificacao: 'ebike',
    filtros: ['ate9'],
    chamada: '60 km por carga: dá para ir e voltar de Botafogo ao Centro três vezes antes de encostar na tomada.',
    foto: 'assets/img/models/v20-pro-card.webp',
    alt: 'Bicicleta elétrica Inow V20 Brake Pro preta em três quartos, sobre fundo branco',
    /* Só fotos com o logo Inow na bateria (confirmado pela loja). */
    galeria: [
      branca('v20-pro-estudio', 'Inow V20 Brake Pro preta em três quartos sobre fundo branco, foto de catálogo'),
      branca('v20-pro-detalhe-1', 'Inow V20 Brake Pro em três quartos frontal direito, com o farol e o banco em destaque'),
      branca('v20-pro-detalhe-2', 'Inow V20 Brake Pro em três quartos traseiro direito, com o bagageiro em destaque'),
      branca('v20-pro-detalhe-3', 'Inow V20 Brake Pro em três quartos frontal, com a suspensão dianteira em destaque'),
    ],
    specs: {
      ...BASE,
      potencia: { valor: 1000, unidade: 'W' },
      autonomia: { valor: 60, unidade: 'km' },
      bateria: 'Lítio 48V 15,6Ah · removível',
      carga: 'Até 180 kg',
      peso: '49 kg',
    },
    equipamentos: EQUIP_BASE,
    /* A cor marrom tem fotos próprias: o swatch troca a galeria inteira.
       O preto usa a galeria padrão do modelo. */
    cores: [
      COR.preto,
      {
        ...COR.marrom,
        galeria: [
          branca('v20-pro-marrom', 'Inow V20 Brake Pro com banco marrom em três quartos sobre fundo branco, foto de catálogo'),
          img('v20-pro-2', 'Bicicleta elétrica Inow V20 Brake Pro com banco marrom, em três quartos, sobre fundo escuro de estúdio'),
        ],
      },
    ],
    preco: 8990,
    prontaEntrega: false,
  },
  {
    id: 'v20-pro',
    nome: 'V20 Pro',
    /* White label: sem marca na bateria. `fabricante` vazio some do card, da
       ficha e da mensagem do WhatsApp. */
    fabricante: '',
    descritivo: 'Bicicleta elétrica',
    categoria: 'ebike',
    classificacao: 'ebike',
    filtros: ['ate9'],
    chamada: 'A mesma bike da Brake Pro, sem a marca na bateria: mesma ficha, mesma autonomia de 60 km, mesmo preço.',
    /* Fotos de catálogo SEM logo na bateria (confirmado pela loja): são da
       white label. A de estúdio escuro tem "V20 PRO" escrito na bateria. */
    foto: 'assets/img/models/v20-pro-wl-card.webp',
    alt: 'Bicicleta elétrica V20 Pro preta em três quartos frontal, sem marca na bateria, sobre fundo branco',
    galeria: [
      branca('v20-pro-capa', 'V20 Pro em três quartos frontal esquerdo sobre fundo branco, sem marca na bateria'),
      branca('v20-pro-lateral', 'V20 Pro de perfil, com a bateria removível no quadro, o bagageiro traseiro e os pneus largos'),
      branca('v20-pro-frente', 'V20 Pro em três quartos frontal, com o farol redondo e a suspensão dianteira'),
      branca('v20-pro-traseira', 'V20 Pro em três quartos traseiro, com o bagageiro e a lanterna'),
      branca('v20-pro-tras', 'V20 Pro vista de trás, mostrando o bagageiro, a lanterna e a largura dos pneus'),
      img('v20-pro-1', 'V20 Pro preta de perfil, com "V20 PRO" na bateria, sobre fundo escuro de estúdio'),
    ],
    specs: {
      ...BASE,
      fabricante: 'White label (sem marca)',
      potencia: { valor: 1000, unidade: 'W' },
      autonomia: { valor: 60, unidade: 'km' },
      bateria: 'Lítio 48V 15,6Ah · removível',
      carga: 'Até 180 kg',
      peso: '49 kg',
    },
    equipamentos: EQUIP_BASE,
    cores: [COR.preto],
    preco: 8990,
    prontaEntrega: false,
  },
  {
    id: 'v20-mini',
    nome: 'V20 Mini',
    fabricante: BASE.fabricante,
    descritivo: 'Bicicleta elétrica',
    categoria: 'ebike',
    classificacao: 'ebike',
    filtros: ['ate9', 'carona'],
    chamada: 'A mais leve da loja, 41,5 kg, com pedal carona: cabe no elevador e ainda leva alguém junto.',
    foto: 'assets/img/models/v20-mini-card.webp',
    alt: 'Bicicleta elétrica Inow V20 Mini preta de perfil, com retrovisor e farol redondo, sobre fundo branco',
    galeria: [
      branca('v20-mini-estudio', 'Inow V20 Mini de perfil sobre fundo branco, com retrovisor e farol redondo'),
      img('v20-mini-rua', 'Inow V20 Mini preta parada numa calçada ao lado de uma ciclovia, vista em três quartos'),
      img('v20-mini-guidao', 'Manopla direita da Inow V20 Mini com os botões de comando', { detalhe: true }),
      img('v20-mini-comandos', 'Comandos do lado esquerdo do guidão da Inow V20 Mini: seletor de assistência, setas e buzina', { detalhe: true }),
      img('v20-mini-marchas', 'Passador de marchas Shimano de 7 velocidades da Inow V20 Mini', { detalhe: true }),
      img('v20-mini-bateria', 'Chave na ignição e trava da bateria removível da Inow V20 Mini', { detalhe: true }),
      img('v20-mini-suspensao', 'Amortecedor traseiro da Inow V20 Mini sob o banco, com a bateria no quadro', { detalhe: true }),
      img('v20-mini-1', 'Bicicleta elétrica Inow V20 Mini preta com farol redondo aceso, sobre fundo escuro de estúdio'),
    ],
    specs: {
      ...BASE,
      potencia: { valor: 750, unidade: 'W' },
      autonomia: { valor: 50, unidade: 'km' },
      bateria: 'Lítio 48V 13Ah · removível',
      carga: 'Até 150 kg',
      peso: '41,5 kg',
    },
    equipamentos: [...EQUIP_BASE, 'Pedal carona'],
    cores: [COR.preto, COR.branco],
    preco: 8690,
    prontaEntrega: false,
  },
];

/* Linhas do comparativo, na ordem em que aparecem. `chave` lê de `specs`;
   `preco` e `parcela` são calculados pelo app.js. */
window.VIRE_COMPARATIVO = [
  ['velocidade', 'Velocidade'],
  ['potencia', 'Potência'],
  ['autonomia', 'Autonomia'],
  ['bateria', 'Bateria'],
  ['peso', 'Peso'],
  ['carga', 'Carga máxima'],
  ['preco', 'Preço'],
  ['parcela', 'Em 12x sem juros'],
];

/* Máximo de 6 perguntas (styleguide): as objeções reais de venda. Resposta
   curta, direta, com CTA de texto no fim quando cabe. */
window.VIRE_FAQ = [
  {
    q: 'Preciso de CNH para andar de bike elétrica?',
    a: 'Não. Os seis modelos da Vire são bicicletas elétricas pela Resolução CONTRAN 996/2023: até 1.000 W, motor limitado a 32 km/h e pedal assistido. Sem CNH, sem placa, sem IPVA. O enquadramento do modelo que você escolher é conferido com você antes da compra.',
  },
  {
    q: 'Posso parcelar?',
    a: 'Sim, em até 12x sem juros no cartão. À vista tem desconto. O valor final sai por escrito no WhatsApp antes de qualquer pagamento.',
  },
  {
    q: 'Tem garantia da bateria?',
    a: 'Todo modelo sai com garantia por escrito na nota fiscal, no prazo do fabricante para bateria, motor e quadro. O prazo exato de cada modelo a loja passa pelo WhatsApp antes de fechar.',
  },
  {
    q: 'Quanto custa carregar?',
    a: 'Uma carga completa da bateria de 48 V e 15,6 Ah (cerca de 0,75 kWh) custa perto de R$ 0,75 na tarifa de R$ 1,00 por kWh, e rende até 60 km na V20 Brake Pro. O simulador da página faz a conta com a sua rota.',
  },
  {
    q: 'Vocês fazem manutenção?',
    a: 'Sim. A assistência técnica é própria, na loja da Rua da Passagem, em Botafogo: revisão, bateria e peças dos modelos que vendemos. O prazo de retorno é informado na abertura do atendimento.',
  },
  {
    q: 'Pode andar na ciclovia? E na chuva?',
    a: 'Bicicleta elétrica dentro da 996/2023 circula onde bicicleta comum circula: ciclovia, ciclofaixa e via. Chuva de rua, sim; jato de pressão e submersão, não. Os pontos de atenção de cada modelo o consultor mostra na entrega.',
  },
];

window.VIRE_DEPOIMENTOS = [
  /* PENDENTE: depoimentos reais, com nome, bairro e modelo comprado. Regra do
     styleguide: 3 clientes reais com foto e bairro, sem emoji, sem foto de
     banco de imagens. Enquanto a lista estiver vazia, a seção inteira não é
     renderizada. Melhor sem prova social do que com prova social inventada. */
];
