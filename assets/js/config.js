/* ==========================================================================
   VIRE · configuração da loja
   Único lugar onde dados de negócio moram. O HTML e o app.js leem daqui.
   Fonte: Style Guide Vire v1.0 (agosto 2026) + fichas dos modelos.
   ========================================================================== */

window.VIRE_CONFIG = {
  marca: {
    nome: 'Vire Store',
    curto: 'Vire',
    razaoSocial: 'Vire Mobilidade Urbana LTDA',
    cnpj: '65.972.190/0001-54',
  },

  /* WhatsApp: vendas e assistência usam o mesmo número.
     `numero` é só para exibição; `e164` é o que entra no link wa.me. */
  whatsapp: {
    numero: '(21) 97466-0962',
    e164: '5521974660962',
  },

  endereco: {
    logradouro: 'Rua da Passagem, 23',
    bairro: 'Botafogo',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    /* ⚠ CONFIRMAR COM A LOJA: o styleguide não traz o CEP. Este é o CEP da
       Rua da Passagem em Botafogo segundo os Correios, mas confira antes de
       publicar, porque ele entra no schema.org e no rodapé. */
    cep: '22290-030',
    get completo() {
      return `${this.logradouro} · ${this.bairro} · ${this.cidade}/${this.uf}`;
    },
    // Usado no link "traçar rota" e no iframe do mapa.
    get busca() {
      return `${this.logradouro}, ${this.bairro}, ${this.cidade} - ${this.uf}`;
    },
  },

  /* ⚠ CONFIRMAR COM A LOJA antes de publicar: o horário não foi informado.
     Enquanto `confirmado` for false, o site mostra "consulte pelo WhatsApp"
     em vez de um horário que pode estar errado. */
  horarios: {
    confirmado: false,
    semana: 'Segunda a sexta · 9h às 18h',
    sabado: 'Sábado · 9h às 13h',
  },

  redes: {
    instagram: 'https://www.instagram.com/virestore.rj',
    instagramArroba: '@virestore.rj',
  },

  /* Condição comercial informada pela loja nas fichas dos modelos:
     "parcelado em até 12x sem juros, à vista com super desconto". */
  pagamento: {
    parcelas: 12,
    semJuros: true,
    descontoAVista: true,
  },

  /* Premissas do simulador de custo. TODAS aparecem na legenda do bloco:
     mudou aqui, muda lá. Nenhuma é promessa; é conta aberta.
     · consumoEbike: bateria 48V 15,6Ah = 0,75 kWh para 60 km (V20 PRO),
       ou seja 0,0125 kWh por km. É o número da própria ficha.
     ⚠ precoKmApp é ESTIMATIVA média de corrida curta por aplicativo no Rio.
       Confirmar ou ajustar com a loja antes de publicar. */
  economia: {
    diasPorMes: 30,
    precoGasolina: 6.30,     // R$/litro
    consumoMoto: 35,         // km/litro
    precoKwh: 1.00,          // R$/kWh (tarifa residencial no Rio, aproximada)
    consumoEbike: 0.0125,    // kWh/km
    precoKmApp: 2.20,        // R$/km em app de carro, corrida curta
    kmBotafogoCentro: 8,     // trajeto de referência, só ida
  },

  /* Mensagens pré-preenchidas. `{modelo}`, `{cor}`, `{nome}`, `{interesse}` e
     `{categoria}` são trocados em tempo de clique. */
  mensagens: {
    geral: 'Olá! Vim pelo site da Vire e quero falar com a loja sobre bike elétrica.',
    modelo: 'Olá! Vim pelo site da Vire e tenho interesse na {modelo}. Pode me passar preço, parcelas e disponibilidade?',
    modeloCor: 'Olá! Vim pelo site da Vire e tenho interesse na {modelo} na cor {cor}. Pode me passar preço, parcelas e disponibilidade?',
    testRide: 'Olá! Quero agendar um test-ride na Vire, em Botafogo.\n\nNome: {nome}\nModelo de interesse: {interesse}',
    condicao: 'Olá! Vim pelo site da Vire e quero receber as condições de pagamento (12x sem juros e desconto à vista).',
    economia: 'Olá! Vim pelo site da Vire e quero simular o custo por km da minha rota com uma bike elétrica.',
    assistencia: 'Olá! Preciso da assistência técnica da Vire para a minha bike elétrica.',
    categoria: 'Olá! Vim pelo site da Vire e quero ver as opções de {categoria}.',
  },
};
