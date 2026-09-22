'use strict';

/*
 * Detetive Diário — lógica do jogo (JavaScript vanilla, sem bibliotecas).
 *
 * Mecânica: ACUSAÇÃO TRIPLA (arma + local + assassino) com 5 vidas e dicas.
 *
 * Segurança:
 *  - Nenhum uso de innerHTML/outerHTML/insertAdjacentHTML/document.write.
 *    Todo texto dinâmico entra via textContent; elementos via createElement.
 *  - Leitura/escrita de localStorage sempre em try/catch + sanitização campo a campo.
 *  - Cada select é validado contra sua lista de opções antes de comparar.
 */

(function () {
  // ---------- Constantes ----------
  var CASOS_URL = 'data/casos.json';
  var STORAGE_PREFIX = 'detetiveDiario:';
  var K_STREAK = STORAGE_PREFIX + 'streak';
  var K_SOLVED = STORAGE_PREFIX + 'solved';
  var K_LAST_PLAYED = STORAGE_PREFIX + 'lastPlayed';
  var K_PROGRESS = STORAGE_PREFIX + 'progress';
  var K_HOWTO = STORAGE_PREFIX + 'howtoDismissed';
  var DAY_MS = 86400000;
  var START_LIVES = 5;
  var STATUS_PLAYING = 'playing';
  var STATUS_WON = 'won';
  var STATUS_LOST = 'lost';

  // Fallback embutido: permite jogar abrindo o index.html direto (file://),
  // onde o fetch de data/casos.json é bloqueado pelo navegador.
  // Sincronizado campo a campo com o casos.json (schema v3).
  var FALLBACK_CASOS = [
    {
      id: 'caso-001',
      data: '2026-09-22',
      titulo: 'O Relógio Parado às 23:47',
      relatorio:
        'O colecionador Álvaro Mendes foi encontrado sem vida em sua biblioteca. Todos os relógios da casa pararam exatamente às 23:47, exceto um. A cena do crime está preservada e quatro pessoas estavam na mansão naquela noite. A polícia precisa descobrir a arma, o local exato e o responsável.',
      pistas: [
        'O relógio de bolso do colecionador foi encontrado no bolso do mordomo, mas este afirma nunca ter entrado na biblioteca.',
        'A governanta viu uma sombra atravessar o corredor às 23:45, vestindo um sobretudo longo.',
        'A filha do colecionador brigou com o pai naquela manhã sobre a herança da coleção.',
        'Havia poeira de cobre nos punhos da camisa do sobrinho, apesar de ele jurar que passou o dia inteiro no jardim.',
        'Uma marca de impacto profunda foi encontrada na lateral da estante, na altura da cabeça.'
      ],
      armaCorreta: 'O Relógio de Bolso',
      localCorreto: 'A Biblioteca',
      assassinoCorreto: 'O Sobrinho',
      opcoesArma: ['O Relógio de Bolso', 'Uma Faca de Cozinha', 'Uma Corda de Cortina', 'Um Castiçal de Bronze', 'Um Tinteiro de Bronze'],
      opcoesLocal: ['A Biblioteca', 'O Jardim', 'A Cozinha', 'O Corredor', 'O Escritório do Colecionador'],
      opcoesAssassino: ['O Mordomo', 'A Governanta', 'A Filha', 'O Sobrinho', 'O Médico da Família'],
      dicaBoaArma:
        'A marca na estante coincide com um objeto pequeno e denso, do tamanho de uma palma — o único assim ausente da vitrine é justamente o que o colecionador nunca tirava do bolso.',
      dicaBoaLocal:
        'O cheiro de papel velho e o silêncio abafado entregam o aposento: a sala de leitura, sem janelas, explica por que ninguém ouviu o golpe.',
      dicaBoaAssassino:
        'O sobrinho herdaria a coleção caso a filha fosse deserdada — e a poeira de cobre em seus punhos veio do interior da vitrine, a mesma que cobria o objeto desaparecido.',
      dicasFracas: [
        'Todos na mansão dormiram mal naquela noite; o vento batia forte nas venezianas.',
        'O mordomo serviu o jantar às 20h e recolheu a louça sem pressa.',
        'Havia um retrato antigo na parede, com o vidro embaçado pela umidade.',
        'A governanta disse que a casa costumava ser silenciosa depois das 22h.'
      ],
      epilogo:
        'Arquivo encerrado em 22/09. O sobrinho confessou o golpe com o relógio de bolso do tio, atraído pela poeira de cobre da vitrine. A filha herdou a coleção, e a biblioteca voltou a exibir todos os relógios — menos um.'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'A Carta sem Remetente',
      relatorio:
        'Uma carta anônima chegou à redação do jornal local denunciando o roubo de uma joia rara na mansão dos Oliveira. O texto foi escrito em uma máquina antiga. O cofre foi arrombado durante um jantar e ninguém ouviu nada. A polícia investiga a arma usada, o local do arrombamento e quem enviou a carta.',
      pistas: [
        'A fita da máquina de escrever da mansão estava fresca, com tinta recém-aplicada.',
        'A empregada encontrou um botão dourado próximo ao cofre arrombado.',
        'O mordomo sabe datilografar, mas alega que estava de folga no dia do roubo.',
        'A joia foi vista pela última vez num jantar em que apenas quatro convidados permaneceram até o fim.',
        'Havia marcas de alavanca na moldura do cofre, feitas por uma ferramenta pesada.'
      ],
      armaCorreta: 'Um Pé de Cabra',
      localCorreto: 'A Mansão dos Oliveira',
      assassinoCorreto: 'A Empregada',
      opcoesArma: ['Um Pé de Cabra', 'Uma Máquina de Escrever', 'Um Punhal', 'Um Candelabro', 'Uma Chave Inglesa'],
      opcoesLocal: ['A Mansão dos Oliveira', 'A Redação do Jornal', 'O Cofre do Banco', 'O Jardim Botânico', 'A Sala de Jantar'],
      opcoesAssassino: ['O Mordomo', 'A Empregada', 'O Motorista', 'O Jornalista', 'O Chef de Cozinha'],
      dicaBoaArma:
        'As marcas na moldura formam um sulco largo e em ângulo — a assinatura de uma barra de ferro com ponta curva, não de uma lâmina ou de uma ferramenta de escrita.',
      dicaBoaLocal:
        'A fita fresca na máquina de escrever e o botão dourado junto ao cofre só têm um lugar em comum: a casa dos Oliveira, onde o jantar aconteceu.',
      dicaBoaAssassino:
        "O botão dourado pertencia ao uniforme da empregada, e foi ela quem 'encontrou' a pista boa demais para ser coincidência.",
      dicasFracas: [
        'O jornalista que recebeu a carta parecia nervoso ao prestar depoimento.',
        'A mansão dos Oliveira tem fama de receber convidados ilustres há gerações.',
        'O motorista lavou o carro na manhã seguinte ao jantar.',
        'A joia era guardada num estojo de veludo, dentro de uma gaveta secreta.'
      ],
      epilogo:
        'Arquivo encerrado em 23/09. A empregada caiu quando o botão dourado do próprio uniforme foi reconhecido pela perícia; a carta anônima era sua, escrita para desviar suspeitas. O pé de cabra foi recuperado no jardim, e a joia voltou ao cofre.'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'O Enigma do Laboratório',
      relatorio:
        'O cientista Dr. Bastos desapareceu do próprio laboratório na noite do experimento. A porta estava trancada por dentro, mas a janela entreaberta revela algo suspeito. Não há sinal de arrombamento, e o corpo foi removido sem deixar rastros claros. A polícia investiga a arma, o local e o responsável pelo crime.',
      pistas: [
        'Havia marcas de luvas no batente da janela, do lado de dentro.',
        'O assistente sumiu com o caderno de anotações na mesma noite.',
        'Uma xícara de chá ainda morna foi encontrada na mesa, com batom na borda.',
        'A segurança registrou apenas uma pessoa saindo pelo portão após a meia-noite.',
        'Um frasco de reagente estava aberto e vazio sobre a bancada, com o lacre rompido.'
      ],
      armaCorreta: 'Um Frasco de Veneno',
      localCorreto: 'O Laboratório',
      assassinoCorreto: 'A Assistente de Laboratório',
      opcoesArma: ['Um Frasco de Veneno', 'Uma Proveta de Vidro', 'Um Bisturi', 'Um Cabo de Madeira', 'Um Maçarico de Bancada'],
      opcoesLocal: ['O Laboratório', 'O Estacionamento', 'A Sala de Segurança', 'O Almoxarifado', 'A Ala de Pesquisa'],
      opcoesAssassino: ['O Assistente', 'A Assistente de Laboratório', 'O Segurança', 'O Cientista Vizinho', 'O Estagiário'],
      dicaBoaArma:
        'O lacre rompido e o cheiro adocicado no ar denunciam que a morte veio de dentro de um frasco — algo que se dissolve sem deixar marca no corpo.',
      dicaBoaLocal:
        'A porta trancada por dentro e as marcas de luva no batente interno provam que o crime não saiu daquele aposento: o laboratório foi palco e túmulo.',
      dicaBoaAssassino:
        'A xícara de chá com batom na borda foi servida por quem tinha livre acesso à bancada — e só a assistente usava aquele tom de batom.',
      dicasFracas: [
        'O segurança dormia em serviço com frequência, segundo os colegas.',
        'O assistente tinha fama de distraído e vivia perdendo o caderno.',
        'O laboratório recebia verba generosa e tinha equipamentos importados.',
        'Havia um cheiro persistente de éter no corredor, mesmo dias depois.'
      ],
      epilogo:
        'Arquivo encerrado em 24/09. A assistente confessou ter trocado o chá do cientista pelo reagente do frasco aberto, aproveitando as luvas do laboratório. O batom na xícara a entregou; ela cumpre pena por homicídio qualificado.'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'O Violino Desafinado',
      relatorio:
        'Durante o ensaio de gala no Teatro Aurora, o maestro Érico Salgado foi encontrado sem vida no fosso da orquestra. As luzes piscaram, a cortina caiu e, quando voltaram, ele já não respirava. O teatro estava lotado, mas ninguém viu o golpe. A polícia precisa determinar a arma, o local exato e o responsável.',
      pistas: [
        'A corda do violino principal estava arrebentada e com marcas de sangue seco.',
        'O contra-regra jurou ter visto a cortina se mexer sozinha minutos antes do apagão.',
        'Uma partitura com a dedicatória rasgada foi encontrada sob o assento da primeira fila.',
        'A soprano discutiu com o maestro na véspera por causa do papel principal.',
        'Havia pó de breu nas solas dos sapatos de quem desceu ao fosso naquela noite.'
      ],
      armaCorreta: 'Uma Corda de Violino',
      localCorreto: 'O Fosso da Orquestra',
      assassinoCorreto: 'A Soprano',
      opcoesArma: ['Uma Corda de Violino', 'Uma Batuta de Maestro', 'Um Candelabro do Saguão', 'Uma Tesoura de Figurino', 'Um Arco de Violino'],
      opcoesLocal: ['O Fosso da Orquestra', 'O Camarim', 'O Palco', 'O Saguão', 'A Plateia'],
      opcoesAssassino: ['O Contra-Regra', 'A Soprano', 'O Violinista Principal', 'O Empresário', 'O Maestro Assistente'],
      dicaBoaArma:
        'A marca fina e profunda no pescoço veio de um fio tensionado — e o único fio do teatro com sangue seco é o que arrebentou no violino principal.',
      dicaBoaLocal:
        'O pó de breu nas solas conta a história: só quem desceu ao fosso da orquestra o carregaria de volta à superfície.',
      dicaBoaAssassino:
        "A dedicatória rasgada na partitura fora escrita para a soprano — a mesma que, ao perder o papel principal, jurou que o maestro 'não chegaria ao terceiro ato'.",
      dicasFracas: [
        'O Teatro Aurora estava com a bilheteria esgotada naquela noite.',
        'O contra-regra era conhecido por seu nervosismo antes de cada sessão.',
        'As cortinas do palco eram trocadas a cada temporada.',
        'O empresário pressionava o maestro por resultados e patrocínios.'
      ],
      epilogo:
        'Arquivo encerrado em 25/09. A soprano foi condenada ao saber que o fio de violino arrebentado carregava o sangue do maestro; ela mesma cortou a corda e desceu ao fosso pelo pó de breu. O Teatro Aurora reabriu sem ela no elenco.'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'A Última Transmissão',
      relatorio:
        'Na madrugada de sábado, o locutor Válter Nobre interrompeu o programa ao vivo com um grito e nunca mais foi visto. A estação de rádio foi isolada, e a fita da transmissão desapareceu. A polícia investiga a arma do crime, o local exato e quem apagou a gravação.',
      pistas: [
        'Um cabo de microfone foi encontrado enrolado atrás da mesa de som, ainda úmido.',
        'O operador de áudio apagou os últimos dez minutos da fita antes de chamar a polícia.',
        'A porta do Estúdio 3 estava trancada por dentro, mas a janela de ventilação estava aberta.',
        'A locutora concorrente havia ameaçado processar o apresentador na semana anterior.',
        'Havia marcas de café derramado sobre o roteiro, cobrindo um nome escrito à mão.'
      ],
      armaCorreta: 'Um Cabo de Microfone',
      localCorreto: 'O Estúdio 3',
      assassinoCorreto: 'O Técnico de Som',
      opcoesArma: ['Um Cabo de Microfone', 'Uma Fita Magnética', 'Um Abajur de Metal', 'Um Grampeador', 'Um Fone de Ouvido'],
      opcoesLocal: ['O Estúdio 3', 'A Cabine de Controle', 'O Estacionamento', 'A Copa', 'O Arquivo de Fitas'],
      opcoesAssassino: ['A Locutora Concorrente', 'O Técnico de Som', 'O Diretor da Rádio', 'O Vigia Noturno', 'A Recepcionista'],
      dicaBoaArma:
        'A marca no pescoço da vítima era um sulco estreito e uniforme — não de um golpe, mas de um cabo flexível tensionado por trás.',
      dicaBoaLocal:
        'O grito captado ao vivo só poderia ter saído de uma cabine com o microfone aberto: o Estúdio 3.',
      dicaBoaAssassino:
        'Quem apagou os últimos dez minutos da fita tinha acesso à mesa de som — e o técnico foi o único que mexeu no equipamento antes de a polícia chegar.',
      dicasFracas: [
        'A rádio vinha perdendo audiência para a concorrente há meses.',
        'O locutor era famoso por suas entrevistas polêmicas.',
        'A copa da estação servia café forte a qualquer hora da madrugada.',
        'Havia um vigia que fazia rondas pelo prédio a cada duas horas.'
      ],
      epilogo:
        'Arquivo encerrado em 26/09. O técnico de som confessou ter apagado a fita para encobrir o crime; o cabo de microfone ainda úmido foi a arma. Ele cumpre pena, e o Estúdio 3 nunca mais transmitiu ao vivo àquela hora.'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'O Jardim das Estátuas',
      relatorio:
        'Na abertura da exposição ao ar livre do Museu Bandeirante, o curador Heitor Prado foi encontrado caído entre as esculturas. A noite estava sem lua e o jardim, iluminado apenas por tochas. Ninguém admite ter se aproximado dele. A polícia busca a arma, o local e o responsável.',
      pistas: [
        'Uma tocha de bronze foi encontrada apagada junto a uma estátua derrubada.',
        'As pegadas no canteiro indicavam alguém que conhecia o caminho às escuras.',
        'O segurança noturno alegou ter feito a ronda de hora em hora, mas o livro de registro tinha uma página arrancada.',
        'A restauradora havia sido demitida naquela tarde pelo curador.',
        'Havia lascas de granito na base de uma estátua que deveria estar intacta.'
      ],
      armaCorreta: 'Uma Tocha de Bronze',
      localCorreto: 'O Jardim das Estátuas',
      assassinoCorreto: 'A Restauradora',
      opcoesArma: ['Uma Tocha de Bronze', 'Um Cinzel', 'Uma Estátua de Mármore', 'Um Martelo de Pedra', 'Um Pedestal de Pedra'],
      opcoesLocal: ['O Jardim das Estátuas', 'A Galeria Principal', 'O Escritório do Curador', 'A Entrada do Museu', 'O Depósito de Obras'],
      opcoesAssassino: ['O Segurança Noturno', 'A Restauradora', 'O Patrocinador', 'O Jornalista de Arte', 'O Fotógrafo'],
      dicaBoaArma:
        'A tocha de bronze achada apagada tinha a base amassada e fios de cabelo presos no metal — foi empunhada, não caiu sozinha.',
      dicaBoaLocal:
        'As pegadas no canteiro seguiam sem hesitar entre as esculturas, na escuridão total: o crime ocorreu no jardim das estátuas, onde só quem conhece o lugar anda às cegas.',
      dicaBoaAssassino:
        'A restauradora demitida naquela tarde conhecia cada estátua pelo toque e sabia exatamente qual base cedia sob o peso de uma queda.',
      dicasFracas: [
        'A exposição ao ar livre atraiu um público maior do que o museu esperava.',
        'O patrocinador do evento discursou longamente antes do jantar.',
        'Havia tochas acesas por todo o jardim para a abertura.',
        'O segurança usava uma lanterna fraca que mal iluminava o caminho.'
      ],
      epilogo:
        'Arquivo encerrado em 27/09. A restauradora demitida confessou o golpe com a tocha de bronze; conhecia cada estátua no escuro e apagou a página do livro de ronda. O jardim reabriu, e a estátua lascada foi restaurada por outra mão.'
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'A Ponte Encoberta',
      relatorio:
        'O navio mercante Estrela do Norte atracou com um passageiro a menos. O capitão Raul Vasquez foi visto por último na ponte de comando, numa noite de névoa densa. O diário de bordo tem páginas molhadas e uma anotação ilegível. A polícia portuária investiga a arma, o local e o responsável.',
      pistas: [
        'Um sextante foi encontrado com a lente rachada e resíduos de sangue no aro de latão.',
        'O imediato assumiu o comando antes da hora marcada, sem que ninguém o tivesse chamado.',
        'Havia cordas recém-cortadas junto ao mastro de ré.',
        'Uma carta de demissão assinada pelo capitão estava na gaveta do imediato.',
        'A bússola da ponte apontava para o norte magnético, mas o navio navegava para oeste.'
      ],
      armaCorreta: 'Um Sextante de Latão',
      localCorreto: 'A Ponte de Comando',
      assassinoCorreto: 'O Imediato',
      opcoesArma: ['Um Sextante de Latão', 'Um Cabo de Aço', 'Uma Âncora', 'Um Facão de Convés', 'Um Cronômetro de Bolso'],
      opcoesLocal: ['A Ponte de Comando', 'O Porão de Carga', 'O Convés Principal', 'A Casa de Máquinas', 'O Camarote do Capitão'],
      opcoesAssassino: ['O Cozinheiro', 'O Imediato', 'O Maquinista', 'O Prático do Porto', 'O Timoneiro'],
      dicaBoaArma:
        'A lente rachada e o aro de latão com resíduos de sangue apontam para o instrumento que o capitão sempre carregava ao peito — um sextante, não um cabo ou uma lâmina.',
      dicaBoaLocal:
        'O diário de bordo encharcado e a bússola desalinhada só fazem sentido num lugar: a ponte de comando, o único aposento com vista para o mar e acesso à navegação.',
      dicaBoaAssassino:
        'O imediato assumiu o comando antes da hora e tinha na gaveta a própria carta de demissão assinada pelo capitão — motivação e oportunidade no mesmo camarote.',
      dicasFracas: [
        'A tripulação do Estrela do Norte era pequena e trabalhara junta por anos.',
        'A névoa densa daquela noite obrigava o navio a reduzir a velocidade.',
        'O cozinheiro reclamava do pouco espaço da despensa.',
        'O prático do porto embarcou apenas nas últimas milhas antes da atracação.'
      ],
      epilogo:
        'Arquivo encerrado em 28/09. O imediato foi preso ao assumir o comando antes da hora; a carta de demissão na gaveta selou o motivo, e o sextante de latão era a arma. O Estrela do Norte navega sob novo capitão, e a bússola voltou ao norte.'
    }
  ];

  // ---------- Estado em memória ----------
  var state = {
    streak: 0,
    solved: 0,
    lastPlayed: '',
    progress: null,
    caso: null
  };

  // ---------- Utilidades de data ----------
  function getDateKey(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function getYesterdayKey(date) {
    return getDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
  }

  function getDayNumber(date) {
    return Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
    );
  }

  function formatLongDate(date) {
    try {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return getDateKey(date);
    }
  }

  function formatTime(date) {
    try {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  // ---------- Acesso seguro ao localStorage ----------
  function readNumber(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      var n = Number(raw);
      if (!isFinite(n) || n < 0) return fallback;
      return Math.floor(n);
    } catch (e) {
      return fallback;
    }
  }

  function readString(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (typeof raw !== 'string') return fallback;
      return raw;
    } catch (e) {
      return fallback;
    }
  }

  function writeValue(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function toBool(value) {
    return value === true;
  }

  function sanitizeHistoryEntry(h) {
    if (!h || typeof h !== 'object') return null;
    var weapon = typeof h.weapon === 'string' ? h.weapon : '';
    var location = typeof h.location === 'string' ? h.location : '';
    var killer = typeof h.killer === 'string' ? h.killer : '';
    if (weapon === '' && location === '' && killer === '') return null;
    return {
      weapon: weapon,
      location: location,
      killer: killer,
      weaponOk: toBool(h.weaponOk),
      locationOk: toBool(h.locationOk),
      killerOk: toBool(h.killerOk),
      time: typeof h.time === 'string' ? h.time : ''
    };
  }

  function sanitizeProgress(obj) {
    if (!obj || typeof obj !== 'object') return null;

    var date = typeof obj.date === 'string' ? obj.date : '';

    var lives = Number(obj.lives);
    if (!isFinite(lives)) lives = START_LIVES;
    lives = Math.min(START_LIVES, Math.max(0, Math.floor(lives)));

    var status = STATUS_PLAYING;
    if (obj.status === STATUS_WON || obj.status === STATUS_LOST) status = obj.status;

    var weakIdx = Number(obj.weakIdx);
    if (!isFinite(weakIdx) || weakIdx < 0) weakIdx = 0;
    weakIdx = Math.min(1000000, Math.floor(weakIdx));

    var history = [];
    if (Array.isArray(obj.history)) {
      for (var i = 0; i < obj.history.length; i++) {
        var entry = sanitizeHistoryEntry(obj.history[i]);
        if (entry) history.push(entry);
      }
    }

    return {
      date: date,
      lives: lives,
      history: history,
      status: status,
      armaOk: toBool(obj.armaOk),
      localOk: toBool(obj.localOk),
      weakIdx: weakIdx
    };
  }

  function readProgress() {
    try {
      var raw = window.localStorage.getItem(K_PROGRESS);
      if (typeof raw !== 'string' || raw === '') return null;
      return sanitizeProgress(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function writeProgress(p) {
    try {
      window.localStorage.setItem(
        K_PROGRESS,
        JSON.stringify({
          date: p.date,
          lives: p.lives,
          history: p.history,
          status: p.status,
          armaOk: p.armaOk,
          localOk: p.localOk,
          weakIdx: p.weakIdx
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  function persistProgress() {
    writeProgress(state.progress);
  }

  // ---------- Seleção determinística do caso do dia ----------
  function pickCase(casos, now, todayKey) {
    for (var i = 0; i < casos.length; i++) {
      if (casos[i] && casos[i].data === todayKey) return casos[i];
    }
    var total = casos.length;
    var idx = ((getDayNumber(now) % total) + total) % total;
    return casos[idx];
  }

  // ---------- Carregamento dos casos ----------
  function validarCasos(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.filter(function (c) {
      return c && typeof c === 'object';
    });
  }

  function loadCasos() {
    return fetch(CASOS_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.casos)) {
          throw new Error('Formato inválido');
        }
        var validos = validarCasos(data.casos);
        if (validos.length === 0) throw new Error('Nenhum caso válido');
        return validos;
      })
      .catch(function () {
        // file:// ou falha de rede: usa o fallback embutido.
        var fallback = validarCasos(FALLBACK_CASOS);
        if (fallback.length === 0) throw new Error('Sem casos disponíveis');
        return fallback;
      });
  }

  // ---------- Renderização (somente textContent / createElement) ----------
  function renderCaso(caso) {
    document.getElementById('case-title').textContent =
      typeof caso.titulo === 'string' && caso.titulo ? caso.titulo : 'Caso sem título';

    var desc = typeof caso.relatorio === 'string' && caso.relatorio
      ? caso.relatorio
      : (typeof caso.descricao === 'string' ? caso.descricao : '');
    document.getElementById('case-desc').textContent = desc;

    var numberEl = document.getElementById('case-number');
    if (numberEl) {
      var match = typeof caso.id === 'string' ? caso.id.match(/\d+/) : null;
      numberEl.textContent = match ? match[0] : String(caso.id || '—');
    }

    var list = document.getElementById('clues-list');
    list.replaceChildren();

    var pistas = Array.isArray(caso.pistas) ? caso.pistas : [];
    for (var i = 0; i < pistas.length; i++) {
      var li = document.createElement('li');
      li.className = 'clue-item';
      li.textContent = String(pistas[i]);
      list.appendChild(li);
    }
  }

  function renderOptions(selectId, opcoes, placeholderText) {
    var select = document.getElementById(selectId);
    if (!select) return;
    select.replaceChildren();

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = placeholderText;
    select.appendChild(placeholder);

    var lista = Array.isArray(opcoes) ? opcoes : [];
    for (var i = 0; i < lista.length; i++) {
      var nome = String(lista[i]);
      var opt = document.createElement('option');
      opt.value = nome;
      opt.textContent = nome;
      select.appendChild(opt);
    }
  }

  function renderAllOptions(caso) {
    renderOptions('guess-weapon', caso.opcoesArma, 'Escolha a arma…');
    renderOptions('guess-location', caso.opcoesLocal, 'Escolha o local…');
    renderOptions('guess-killer', caso.opcoesAssassino, 'Escolha o assassino…');
  }

  function setEvidence(elId, value, revealed) {
    var el = document.getElementById(elId);
    if (!el) return;
    if (revealed) {
      el.textContent = String(value || '');
      el.classList.remove('evidence-unknown');
      el.classList.add('evidence-known');
    } else {
      el.textContent = '???';
      el.classList.remove('evidence-known');
      el.classList.add('evidence-unknown');
    }
  }

  function renderEvidence(caso, progress) {
    var won = progress.status === STATUS_WON;
    setEvidence('evidence-weapon', caso.armaCorreta, won || progress.armaOk);
    setEvidence('evidence-location', caso.localCorreto, won || progress.localOk);
    setEvidence('evidence-killer', caso.assassinoCorreto, won);
  }

  function renderLives(lives) {
    var wrap = document.getElementById('lives');
    wrap.replaceChildren();
    for (var i = 0; i < START_LIVES; i++) {
      var span = document.createElement('span');
      span.className = i >= lives ? 'life is-lost' : 'life';
      span.textContent = '🔍';
      wrap.appendChild(span);
    }
  }

  function historyGuess(text, ok) {
    var span = document.createElement('span');
    span.className = ok ? 'history-guess is-hit' : 'history-guess is-miss';
    span.textContent = text;
    return span;
  }

  function renderHistory(history) {
    var list = document.getElementById('history-list');
    list.replaceChildren();
    for (var i = history.length - 1; i >= 0; i--) {
      var h = history[i];
      var li = document.createElement('li');
      li.className = 'history-item';

      li.appendChild(historyGuess((h.weaponOk ? '✅' : '❌') + ' Arma: ' + h.weapon, h.weaponOk));
      li.appendChild(historyGuess((h.locationOk ? '✅' : '❌') + ' Local: ' + h.location, h.locationOk));
      li.appendChild(historyGuess((h.killerOk ? '✅' : '❌') + ' Assassino: ' + h.killer, h.killerOk));

      var hits = (h.weaponOk ? 1 : 0) + (h.locationOk ? 1 : 0) + (h.killerOk ? 1 : 0);
      var hitsEl = document.createElement('span');
      hitsEl.className = 'history-hits';
      hitsEl.textContent = hits + '/3' + (h.time ? ' · ' + h.time : '');
      li.appendChild(hitsEl);

      list.appendChild(li);
    }
  }

  function renderHints(hints) {
    var area = document.getElementById('hint-area');
    var list = area ? area.querySelector('.hint-list') : null;
    if (!list) return;
    list.replaceChildren();
    var arr = Array.isArray(hints) ? hints : [];
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      var div = document.createElement('div');
      div.className = item.type === 'good' ? 'hint hint-good' : 'hint hint-weak';
      div.textContent = String(item.text);
      list.appendChild(div);
    }
  }

  function renderStats() {
    document.getElementById('streak').textContent = String(state.streak);
    document.getElementById('solved-count').textContent = String(state.solved);
  }

  // ---------- Epílogo (vitória) ----------
  function renderEpilogo(caso, visible) {
    var card = document.getElementById('epilogo');
    var text = document.getElementById('epilogo-text');
    if (!card || !text) return;
    var ep = caso && typeof caso.epilogo === 'string' ? caso.epilogo.trim() : '';
    if (visible && ep !== '') {
      text.textContent = ep;
      card.classList.remove('is-hidden');
      card.hidden = false;
    } else {
      text.textContent = '';
      card.classList.add('is-hidden');
      card.hidden = true;
    }
  }

  // ---------- Modal "Como jogar" ----------
  var howtoOpen = false;

  function setHowtoVisible(visible) {
    var modal = document.getElementById('howto-card');
    var backdrop = document.getElementById('howto-backdrop');
    var body = document.body;
    var show = !!visible;

    if (modal) {
      if (show) {
        modal.classList.remove('is-hidden');
        modal.hidden = false;
      } else {
        modal.classList.add('is-hidden');
        modal.hidden = true;
      }
    }
    if (backdrop) {
      if (show) {
        backdrop.classList.remove('is-hidden');
        backdrop.hidden = false;
      } else {
        backdrop.classList.add('is-hidden');
        backdrop.hidden = true;
      }
    }
    if (body && body.classList) {
      if (show) body.classList.add('modal-open');
      else body.classList.remove('modal-open');
    }
    howtoOpen = show;
  }

  function focusEl(id) {
    var el = document.getElementById(id);
    if (el && typeof el.focus === 'function') el.focus();
  }

  function readHowtoDismissed() {
    // Leitura protegida: em falha, retorna '' e o modal fica visível (gracioso).
    return readString(K_HOWTO, '');
  }

  function initHowto(todayKey) {
    var openBtn = document.getElementById('howto-open');
    var closeBtn = document.getElementById('howto-close');
    var backdrop = document.getElementById('howto-backdrop');

    function open() {
      setHowtoVisible(true);
      focusEl('howto-close');
    }

    function close(dismiss) {
      if (!howtoOpen) return;
      setHowtoVisible(false);
      focusEl('howto-open');
      if (dismiss) writeValue(K_HOWTO, todayKey);
    }

    // Já dispensado hoje? Escondido. Caso contrário, abre focando o botão de fechar.
    if (readHowtoDismissed() !== todayKey) {
      open();
    } else {
      setHowtoVisible(false);
    }

    if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });
    if (openBtn) openBtn.addEventListener('click', open);
    if (backdrop) backdrop.addEventListener('click', function () { close(false); });
    document.addEventListener('keydown', function (e) {
      if (e && e.key === 'Escape') close(false);
    });
  }

  function showFeedback(kind, message) {
    var el = document.getElementById('feedback');
    el.textContent = message;
    el.classList.remove('is-success', 'is-error', 'is-gameover', 'is-visible');
    if (kind === 'success') el.classList.add('is-success');
    else if (kind === 'gameover') el.classList.add('is-gameover');
    else el.classList.add('is-error');
    el.classList.add('is-visible');
  }

  function lockForm() {
    var ids = ['guess-weapon', 'guess-location', 'guess-killer'];
    for (var i = 0; i < ids.length; i++) {
      var sel = document.getElementById(ids[i]);
      if (sel) sel.disabled = true;
    }
    var form = document.getElementById('guess-form');
    var btn = form ? form.querySelector('button[type="submit"]') : null;
    if (btn) btn.disabled = true;
  }

  function unlockForm() {
    var ids = ['guess-weapon', 'guess-location', 'guess-killer'];
    for (var i = 0; i < ids.length; i++) {
      var sel = document.getElementById(ids[i]);
      if (sel) sel.disabled = false;
    }
    var form = document.getElementById('guess-form');
    var btn = form ? form.querySelector('button[type="submit"]') : null;
    if (btn) btn.disabled = false;
  }

  function showLoadError() {
    document.getElementById('case-title').textContent = 'Não foi possível carregar o caso';
    document.getElementById('case-desc').textContent =
      'Verifique se o arquivo data/casos.json está acessível (o jogo precisa ser servido via HTTP).';
    showFeedback('error', 'Erro ao carregar os casos do dia. Tente recarregar a página.');
    lockForm();
  }

  // ---------- Regras do jogo ----------
  function readSelect(id) {
    var el = document.getElementById(id);
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  function isValidOption(lista, value) {
    return value !== '' && Array.isArray(lista) && lista.indexOf(value) !== -1;
  }

  function consumeWeakHint(caso, progress) {
    var pool = Array.isArray(caso.dicasFracas) ? caso.dicasFracas : [];
    if (pool.length === 0) return 'O interrogatório não rendeu novas pistas.';
    var idx = progress.weakIdx % pool.length;
    var text = String(pool[idx]);
    progress.weakIdx = (idx + 1) % pool.length;
    return text;
  }

  function recordHistory(progress, entry) {
    progress.history.push(entry);
  }

  function win(caso, progress) {
    var now = new Date();
    var todayKey = getDateKey(now);
    var yesterdayKey = getYesterdayKey(now);

    progress.status = STATUS_WON;
    if (state.lastPlayed === yesterdayKey) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    state.solved += 1;
    state.lastPlayed = todayKey;

    writeValue(K_STREAK, state.streak);
    writeValue(K_SOLVED, state.solved);
    writeValue(K_LAST_PLAYED, todayKey);
    persistProgress();

    renderStats();
    renderEvidence(caso, progress);
    renderLives(progress.lives);
    renderHistory(progress.history);
    renderEpilogo(caso, true);
    lockForm();
    showFeedback(
      'success',
      '🕵️ Caso Resolvido! ' + String(caso.assassinoCorreto) + ' é o assassino, com ' +
        String(caso.armaCorreta) + ' em ' + String(caso.localCorreto) +
        '. Sequência atual: ' + state.streak + '.'
    );
  }

  function gameOver(progress) {
    var todayKey = getDateKey(new Date());

    progress.status = STATUS_LOST;
    state.streak = 0;
    state.lastPlayed = todayKey;

    writeValue(K_STREAK, 0);
    writeValue(K_LAST_PLAYED, todayKey);
    persistProgress();

    renderStats();
    renderLives(0);
    lockForm();
    showFeedback(
      'gameover',
      '❌ Game Over — Caso Não Resolvido. Você esgotou as 5 vidas. Volte amanhã para um novo caso.'
    );
  }

  function handleAccuse(event) {
    event.preventDefault();
    if (!state.caso || !state.progress) return;

    var caso = state.caso;
    var progress = state.progress;

    if (progress.status !== STATUS_PLAYING) {
      lockForm();
      return;
    }

    var weapon = readSelect('guess-weapon');
    var location = readSelect('guess-location');
    var killer = readSelect('guess-killer');

    if (
      !isValidOption(caso.opcoesArma, weapon) ||
      !isValidOption(caso.opcoesLocal, location) ||
      !isValidOption(caso.opcoesAssassino, killer)
    ) {
      showFeedback(
        'error',
        'Acusação inválida. Selecione arma, local e assassino entre as opções disponíveis.'
      );
      return;
    }

    var weaponOk = weapon === caso.armaCorreta;
    var locationOk = location === caso.localCorreto;
    var killerOk = killer === caso.assassinoCorreto;

    // Descobertas persistem entre tentativas.
    if (weaponOk) progress.armaOk = true;
    if (locationOk) progress.localOk = true;

    recordHistory(progress, {
      weapon: weapon,
      location: location,
      killer: killer,
      weaponOk: weaponOk,
      locationOk: locationOk,
      killerOk: killerOk,
      time: formatTime(new Date())
    });

    if (weaponOk && locationOk && killerOk) {
      win(caso, progress);
      return;
    }

    var hints = [];

    if (weaponOk && locationOk) {
      // Sem perder vida; dica boa do assassino.
      hints.push({ type: 'good', text: caso.dicaBoaAssassino });
    } else if (weaponOk) {
      progress.lives -= 1;
      hints.push({ type: 'good', text: caso.dicaBoaLocal });
      hints.push({ type: 'weak', text: consumeWeakHint(caso, progress) });
    } else if (locationOk) {
      progress.lives -= 1;
      hints.push({ type: 'good', text: caso.dicaBoaArma });
      hints.push({ type: 'weak', text: consumeWeakHint(caso, progress) });
    } else {
      progress.lives -= 1;
      hints.push({ type: 'weak', text: consumeWeakHint(caso, progress) });
    }

    persistProgress();
    renderEvidence(caso, progress);
    renderLives(progress.lives);
    renderHistory(progress.history);
    renderHints(hints);

    if (progress.lives <= 0) {
      gameOver(progress);
      return;
    }

    var hits = (weaponOk ? 1 : 0) + (locationOk ? 1 : 0) + (killerOk ? 1 : 0);
    showFeedback(
      'error',
      '❌ Acusação incorreta (' + hits + '/3). Vidas restantes: ' + progress.lives + '.'
    );
  }

  // ---------- Inicialização ----------
  function init() {
    var now = new Date();
    var todayKey = getDateKey(now);
    var yesterdayKey = getYesterdayKey(now);

    var dateEl = document.getElementById('today-date');
    if (dateEl) dateEl.textContent = formatLongDate(now);

    initHowto(todayKey);

    state.streak = readNumber(K_STREAK, 0);
    state.solved = readNumber(K_SOLVED, 0);
    state.lastPlayed = readString(K_LAST_PLAYED, '');

    var progress = readProgress();
    if (!progress || progress.date !== todayKey) {
      // Virou o dia: zera streak se pulou um dia e reinicia o progresso.
      if (state.lastPlayed !== '' && state.lastPlayed !== yesterdayKey) {
        state.streak = 0;
        writeValue(K_STREAK, 0);
      }
      progress = {
        date: todayKey,
        lives: START_LIVES,
        history: [],
        status: STATUS_PLAYING,
        armaOk: false,
        localOk: false,
        weakIdx: 0
      };
      writeProgress(progress);
    }
    state.progress = progress;

    renderStats();
    renderLives(progress.lives);
    renderHistory(progress.history);
    renderHints([]);

    var form = document.getElementById('guess-form');
    if (form) form.addEventListener('submit', handleAccuse);

    loadCasos()
      .then(function (casos) {
        var caso = pickCase(casos, now, todayKey);
        state.caso = caso;

        renderCaso(caso);
        renderAllOptions(caso);
        renderEvidence(caso, progress);
        renderEpilogo(caso, progress.status === STATUS_WON);

        if (progress.status === STATUS_PLAYING) {
          unlockForm();
        } else {
          lockForm();
          if (progress.status === STATUS_WON) {
            showFeedback(
              'success',
              '✅ Você já resolveu o caso de hoje. Volte amanhã para um novo mistério!'
            );
          } else {
            showFeedback(
              'gameover',
              '❌ Você esgotou as vidas hoje. Volte amanhã para um novo caso.'
            );
          }
        }
      })
      .catch(function () {
        showLoadError();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
