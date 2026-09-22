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
  var K_LANG = STORAGE_PREFIX + 'lang';
  var LANGS = ['pt', 'es', 'en'];
  var DEFAULT_LANG = 'pt';
  var DAY_MS = 86400000;
  var START_LIVES = 5;
  var STATUS_PLAYING = 'playing';
  var STATUS_WON = 'won';
  var STATUS_LOST = 'lost';

  // ---------- Internacionalização (pt-BR base) ----------
  var I18N = {
    pt: {
      locale: 'pt-BR',
      skip: 'Pular para o conteúdo',
      howtoOpen: 'Abrir como jogar',
      kicker: 'Arquivo confidencial',
      title: 'Detetive Diário',
      langLabel: 'Idioma',
      caseStamp: 'CASO Nº ',
      loadingTitle: 'Carregando caso…',
      loadingDesc: 'Buscando o relatório do dia…',
      cluesHeading: 'Pistas',
      cluesPlaceholder: 'As pistas aparecerão aqui.',
      evidenceHeading: 'Painel de Evidências',
      evidenceWeapon: 'Arma do crime',
      evidenceLocation: 'Local do crime',
      evidenceKiller: 'Assassino',
      guessHeading: 'Acusação',
      phWeapon: 'Escolha a arma…',
      phLocation: 'Escolha o local…',
      phKiller: 'Escolha o assassino…',
      submitBtn: 'Fechar a acusação',
      hintHeading: 'Interrogatório — Dicas',
      livesHeading: 'Vidas',
      livesAria: 'Vidas restantes',
      historyHeading: 'Tentativas',
      epilogoTitle: 'Arquivo encerrado',
      statsAria: 'Estatísticas do jogador',
      statsStreak: 'Sequência',
      statsSolved: 'Casos resolvidos',
      footer: 'Detetive Diário — um mistério novo todos os dias.',
      howtoStamp: 'SIGILOSO',
      howtoTitle: 'Como jogar',
      h1a: 'Você tem', h1b: '5 vidas', h1c: ' por dia (🔍).',
      h2a: 'Faça', h2b: 'UMA acusação completa', h2c: ': arma + local + assassino.',
      h3a: 'Cada erro tira', h3b: '1 vida', h3c: ' — EXCETO se acertar arma e local juntos: aí você não perde vida e ganha uma', h3d: 'dica forte', h3e: ' do assassino.',
      h4a: 'Acertar', h4b: 'parcialmente', h4c: ' revela pistas e evidências no Painel de Evidências.',
      h5a: 'Acertou tudo?', h5b: 'Caso resolvido!', h5c: ' Volte amanhã para um caso novo e mantenha sua sequência.',
      howtoClose: 'Entendi, vamos investigar',
      lblWeapon: 'Arma: ', lblLocation: 'Local: ', lblKiller: 'Assassino: ',
      msgInvalid: 'Acusação inválida. Selecione arma, local e assassino entre as opções disponíveis.',
      msgWrong: '❌ Acusação incorreta ({hits}/3). Vidas restantes: {lives}.',
      msgWin: '🕵️ Caso Resolvido! {killer} é o assassino, com {weapon} em {location}. Sequência atual: {streak}.',
      msgGameOver: '❌ Game Over — Caso Não Resolvido. Você esgotou as 5 vidas. Volte amanhã para um novo caso.',
      msgAlreadyWon: '✅ Você já resolveu o caso de hoje. Volte amanhã para um novo mistério!',
      msgAlreadyLost: '❌ Você esgotou as vidas hoje. Volte amanhã para um novo caso.',
      msgLoadErrTitle: 'Não foi possível carregar o caso',
      msgLoadErrDesc: 'Verifique se o arquivo data/casos.json está acessível (o jogo precisa ser servido via HTTP).',
      msgLoadErrFeedback: 'Erro ao carregar os casos do dia. Tente recarregar a página.',
      msgNoWeakHint: 'O interrogatório não rendeu novas pistas.',
      noTitle: 'Caso sem título'
    },
    es: {
      locale: 'es-ES',
      skip: 'Saltar al contenido',
      howtoOpen: 'Abrir cómo jugar',
      kicker: 'Archivo confidencial',
      title: 'Detective Diario',
      langLabel: 'Idioma',
      caseStamp: 'CASO Nº ',
      loadingTitle: 'Cargando caso…',
      loadingDesc: 'Buscando el informe del día…',
      cluesHeading: 'Pistas',
      cluesPlaceholder: 'Las pistas aparecerán aquí.',
      evidenceHeading: 'Panel de Evidencias',
      evidenceWeapon: 'Arma del crimen',
      evidenceLocation: 'Lugar del crimen',
      evidenceKiller: 'Asesino',
      guessHeading: 'Acusación',
      phWeapon: 'Elige el arma…',
      phLocation: 'Elige el lugar…',
      phKiller: 'Elige al asesino…',
      submitBtn: 'Cerrar la acusación',
      hintHeading: 'Interrogatorio — Pistas',
      livesHeading: 'Vidas',
      livesAria: 'Vidas restantes',
      historyHeading: 'Intentos',
      epilogoTitle: 'Archivo cerrado',
      statsAria: 'Estadísticas del jugador',
      statsStreak: 'Racha',
      statsSolved: 'Casos resueltos',
      footer: 'Detective Diario — un misterio nuevo cada día.',
      howtoStamp: 'CONFIDENCIAL',
      howtoTitle: 'Cómo jugar',
      h1a: 'Tienes', h1b: '5 vidas', h1c: ' por día (🔍).',
      h2a: 'Haz', h2b: 'UNA acusación completa', h2c: ': arma + lugar + asesino.',
      h3a: 'Cada error quita', h3b: '1 vida', h3c: ' — EXCEPTO si aciertas arma y lugar a la vez: entonces no pierdes vida y ganas una', h3d: 'pista fuerte', h3e: ' del asesino.',
      h4a: 'Acertar', h4b: 'parcialmente', h4c: ' revela pistas y evidencias en el Panel de Evidencias.',
      h5a: '¿Acertaste todo?', h5b: '¡Caso resuelto!', h5c: ' Vuelve mañana para un caso nuevo y mantén tu racha.',
      howtoClose: 'Entendido, vamos a investigar',
      lblWeapon: 'Arma: ', lblLocation: 'Lugar: ', lblKiller: 'Asesino: ',
      msgInvalid: 'Acusación inválida. Selecciona arma, lugar y asesino entre las opciones disponibles.',
      msgWrong: '❌ Acusación incorrecta ({hits}/3). Vidas restantes: {lives}.',
      msgWin: '🕵️ ¡Caso Resuelto! {killer} es el asesino, con {weapon} en {location}. Racha actual: {streak}.',
      msgGameOver: '❌ Game Over — Caso No Resuelto. Agotaste las 5 vidas. Vuelve mañana para un caso nuevo.',
      msgAlreadyWon: '✅ Ya resolviste el caso de hoy. ¡Vuelve mañana para un nuevo misterio!',
      msgAlreadyLost: '❌ Agotaste las vidas hoy. Vuelve mañana para un caso nuevo.',
      msgLoadErrTitle: 'No se pudo cargar el caso',
      msgLoadErrDesc: 'Comprueba que el archivo data/casos.json esté accesible (el juego debe servirse vía HTTP).',
      msgLoadErrFeedback: 'Error al cargar los casos del día. Intenta recargar la página.',
      msgNoWeakHint: 'El interrogatorio no dio nuevas pistas.',
      noTitle: 'Caso sin título'
    },
    en: {
      locale: 'en-US',
      skip: 'Skip to content',
      howtoOpen: 'Open how to play',
      kicker: 'Confidential file',
      title: 'Daily Detective',
      langLabel: 'Language',
      caseStamp: 'CASE No. ',
      loadingTitle: 'Loading case…',
      loadingDesc: 'Fetching today\'s report…',
      cluesHeading: 'Clues',
      cluesPlaceholder: 'Clues will appear here.',
      evidenceHeading: 'Evidence Board',
      evidenceWeapon: 'Murder weapon',
      evidenceLocation: 'Crime scene',
      evidenceKiller: 'Killer',
      guessHeading: 'Accusation',
      phWeapon: 'Choose the weapon…',
      phLocation: 'Choose the location…',
      phKiller: 'Choose the killer…',
      submitBtn: 'Close the accusation',
      hintHeading: 'Interrogation — Hints',
      livesHeading: 'Lives',
      livesAria: 'Lives remaining',
      historyHeading: 'Attempts',
      epilogoTitle: 'File closed',
      statsAria: 'Player statistics',
      statsStreak: 'Streak',
      statsSolved: 'Cases solved',
      footer: 'Daily Detective — a new mystery every day.',
      howtoStamp: 'CONFIDENTIAL',
      howtoTitle: 'How to play',
      h1a: 'You have', h1b: '5 lives', h1c: ' per day (🔍).',
      h2a: 'Make', h2b: 'ONE complete accusation', h2c: ': weapon + location + killer.',
      h3a: 'Each mistake costs', h3b: '1 life', h3c: ' — UNLESS you get weapon and location right at once: then you lose no life and earn a', h3d: 'strong hint', h3e: ' about the killer.',
      h4a: 'Getting it', h4b: 'partially right', h4c: ' reveals clues and evidence on the Evidence Board.',
      h5a: 'Got everything?', h5b: 'Case closed!', h5c: ' Come back tomorrow for a new case and keep your streak.',
      howtoClose: 'Got it, let\'s investigate',
      lblWeapon: 'Weapon: ', lblLocation: 'Location: ', lblKiller: 'Killer: ',
      msgInvalid: 'Invalid accusation. Select weapon, location and killer from the available options.',
      msgWrong: '❌ Wrong accusation ({hits}/3). Lives remaining: {lives}.',
      msgWin: '🕵️ Case Solved! {killer} is the killer, with {weapon} in {location}. Current streak: {streak}.',
      msgGameOver: '❌ Game Over — Case Unsolved. You ran out of all 5 lives. Come back tomorrow for a new case.',
      msgAlreadyWon: '✅ You already solved today\'s case. Come back tomorrow for a new mystery!',
      msgAlreadyLost: '❌ You ran out of lives today. Come back tomorrow for a new case.',
      msgLoadErrTitle: 'Could not load the case',
      msgLoadErrDesc: 'Check that the data/casos.json file is accessible (the game must be served over HTTP).',
      msgLoadErrFeedback: 'Error loading today\'s cases. Try reloading the page.',
      msgNoWeakHint: 'The interrogation yielded no new clues.',
      noTitle: 'Untitled case'
    }
  };

  var currentLang = DEFAULT_LANG;

  function t(key) {
    var lang = I18N[currentLang] || I18N[DEFAULT_LANG];
    if (lang && typeof lang[key] === 'string') return lang[key];
    var base = I18N[DEFAULT_LANG];
    return Object.prototype.hasOwnProperty.call(base, key) ? String(base[key]) : '';
  }

  function template(text, vars) {
    var out = String(text);
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        out = out.split('{' + k + '}').join(String(vars[k]));
      }
    }
    return out;
  }

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

  // Fallbacks traduzidos: mesma estrutura/schema do FALLBACK_CASOS (pt-BR).
  var FALLBACK_CASOS_ES = [
    {
      id: 'caso-001',
      data: '2026-09-22',
      titulo: 'El Reloj Detenido a las 23:47',
      relatorio:
        'El coleccionista Álvaro Mendes fue encontrado sin vida en su biblioteca. Todos los relojes de la casa se detuvieron exactamente a las 23:47, excepto uno. La escena del crimen está preservada y cuatro personas estaban en la mansión aquella noche. La policía necesita descubrir el arma, el lugar exacto y el responsable.',
      pistas: [
        'El reloj de bolsillo del coleccionista fue encontrado en el bolsillo del mayordomo, pero este afirma que nunca entró en la biblioteca.',
        'La gobernanta vio una sombra cruzar el pasillo a las 23:45, vistiendo un abrigo largo.',
        'La hija del coleccionista discutió con su padre esa mañana por la herencia de la colección.',
        'Había polvo de cobre en los puños de la camisa del sobrino, aunque juró haber pasado el día entero en el jardín.',
        'Una marca de impacto profunda fue encontrada en el lateral de la estantería, a la altura de la cabeza.'
      ],
      armaCorreta: 'El Reloj de Bolsillo',
      localCorreto: 'La Biblioteca',
      assassinoCorreto: 'El Sobrino',
      opcoesArma: ['El Reloj de Bolsillo', 'Un Cuchillo de Cocina', 'Una Cuerda de Cortina', 'Un Candelero de Bronce', 'Un Tintero de Bronce'],
      opcoesLocal: ['La Biblioteca', 'El Jardín', 'La Cocina', 'El Pasillo', 'El Despacho del Coleccionista'],
      opcoesAssassino: ['El Mayordomo', 'La Gobernanta', 'La Hija', 'El Sobrino', 'El Médico de la Familia'],
      dicaBoaArma:
        'La marca en la estantería coincide con un objeto pequeño y denso, del tamaño de una palma — el único así ausente de la vitrina es justamente el que el coleccionista nunca se quitaba del bolsillo.',
      dicaBoaLocal:
        'El olor a papel viejo y el silencio apagado delatan la estancia: la sala de lectura, sin ventanas, explica por qué nadie oyó el golpe.',
      dicaBoaAssassino:
        'El sobrino heredaría la colección si la hija fuera desheredada — y el polvo de cobre en sus puños vino del interior de la vitrina, la misma que cubría el objeto desaparecido.',
      dicasFracas: [
        'Todos en la mansión durmieron mal aquella noche; el viento golpeaba fuerte contra las persianas.',
        'El mayordomo sirvió la cena a las 20h y recogió la vajilla sin prisa.',
        'Había un retrato antiguo en la pared, con el vidrio empañado por la humedad.',
        'La gobernanta dijo que la casa solía ser silenciosa después de las 22h.'
      ],
      epilogo:
        'Archivo cerrado el 22/09. El sobrino confesó el golpe con el reloj de bolsillo del tío, atraído por el polvo de cobre de la vitrina. La hija heredó la colección, y la biblioteca volvió a exhibir todos los relojes — menos uno.'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'La Carta sin Remitente',
      relatorio:
        'Una carta anónima llegó a la redacción del periódico local denunciando el robo de una joya rara en la mansión de los Oliveira. El texto fue escrito en una máquina antigua. La caja fuerte fue forzada durante una cena y nadie escuchó nada. La policía investiga el arma usada, el lugar del asalto y quién envió la carta.',
      pistas: [
        'La cinta de la máquina de escribir de la mansión estaba fresca, con tinta recién aplicada.',
        'La empleada encontró un botón dorado cerca de la caja fuerte forzada.',
        'El mayordomo sabe escribir a máquina, pero afirma que estaba libre el día del robo.',
        'La joya fue vista por última vez en una cena en la que solo cuatro invitados permanecieron hasta el final.',
        'Había marcas de palanca en el marco de la caja fuerte, hechas por una herramienta pesada.'
      ],
      armaCorreta: 'Un Pie de Cabra',
      localCorreto: 'La Mansión de los Oliveira',
      assassinoCorreto: 'La Empleada',
      opcoesArma: ['Un Pie de Cabra', 'Una Máquina de Escribir', 'Una Daga', 'Un Candelabro', 'Una Llave Inglesa'],
      opcoesLocal: ['La Mansión de los Oliveira', 'La Redacción del Periódico', 'La Caja Fuerte del Banco', 'El Jardín Botánico', 'El Comedor'],
      opcoesAssassino: ['El Mayordomo', 'La Empleada', 'El Chofer', 'El Periodista', 'El Chef de Cocina'],
      dicaBoaArma:
        'Las marcas en el marco forman un surco ancho y en ángulo — la firma de una barra de hierro con punta curva, no de una hoja ni de una herramienta de escritura.',
      dicaBoaLocal:
        'La cinta fresca de la máquina de escribir y el botón dorado junto a la caja fuerte tienen un solo punto en común: la casa de los Oliveira, donde ocurrió la cena.',
      dicaBoaAssassino:
        'El botón dorado pertenecía al uniforme de la empleada, y fue ella quien «encontró» la pista demasiado buena para ser coincidencia.',
      dicasFracas: [
        'El periodista que recibió la carta parecía nervioso al prestar declaración.',
        'La mansión de los Oliveira tiene fama de recibir invitados ilustres desde hace generaciones.',
        'El chofer lavó el coche a la mañana siguiente a la cena.',
        'La joya estaba guardada en un estuche de terciopelo, dentro de un cajón secreto.'
      ],
      epilogo:
        'Archivo cerrado el 23/09. La empleada cayó cuando el botón dorado de su propio uniforme fue reconocido por la policía científica; la carta anónima era suya, escrita para desviar sospechas. El pie de cabra fue recuperado en el jardín, y la joya volvió a la caja fuerte.'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'El Enigma del Laboratorio',
      relatorio:
        'El científico Dr. Bastos desapareció de su propio laboratorio la noche del experimento. La puerta estaba trancada por dentro, pero la ventana entreabierta revela algo sospechoso. No hay señales de allanamiento y el cuerpo fue retirado sin dejar rastros claros. La policía investiga el arma, el lugar y el responsable del crimen.',
      pistas: [
        'Había marcas de guantes en el marco de la ventana, del lado de dentro.',
        'El asistente desapareció con el cuaderno de anotaciones la misma noche.',
        'Una taza de té todavía tibia fue encontrada en la mesa, con lápiz labial en el borde.',
        'La seguridad registró solo una persona saliendo por el portón después de la medianoche.',
        'Un frasco de reactivo estaba abierto y vacío sobre la mesa de trabajo, con el lacre roto.'
      ],
      armaCorreta: 'Un Frasco de Veneno',
      localCorreto: 'El Laboratorio',
      assassinoCorreto: 'La Asistente de Laboratorio',
      opcoesArma: ['Un Frasco de Veneno', 'Una Probeta de Vidrio', 'Un Bisturí', 'Un Palo de Madera', 'Un Soplete de Mesa'],
      opcoesLocal: ['El Laboratorio', 'El Estacionamiento', 'La Sala de Seguridad', 'El Almacén', 'El Ala de Investigación'],
      opcoesAssassino: ['El Asistente', 'La Asistente de Laboratorio', 'El Guardia', 'El Científico Vecino', 'El Pasante'],
      dicaBoaArma:
        'El lacre roto y el olor dulzón en el aire delatan que la muerte salió de dentro de un frasco — algo que se disuelve sin dejar marca en el cuerpo.',
      dicaBoaLocal:
        'La puerta trancada por dentro y las marcas de guante en el batiente interno prueban que el crimen no salió de esa estancia: el laboratorio fue escenario y tumba.',
      dicaBoaAssassino:
        'La taza de té con lápiz labial en el borde fue servida por quien tenía libre acceso a la mesa de trabajo — y solo la asistente usaba ese tono de labial.',
      dicasFracas: [
        'El guardia dormía en el servicio con frecuencia, según los colegas.',
        'El asistente tenía fama de distraído y vivía perdiendo el cuaderno.',
        'El laboratorio recibía una subvención generosa y tenía equipos importados.',
        'Había un olor persistente a éter en el pasillo, incluso días después.'
      ],
      epilogo:
        'Archivo cerrado el 24/09. La asistente confesó haber cambiado el té del científico por el reactivo del frasco abierto, aprovechando los guantes del laboratorio. El lápiz labial en la taza la delató; cumple condena por homicidio calificado.'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'El Violín Desafinado',
      relatorio:
        'Durante el ensayo de gala en el Teatro Aurora, el maestro Érico Salgado fue encontrado sin vida en el foso de la orquesta. Las luces parpadearon, el telón cayó y, cuando volvieron, ya no respiraba. El teatro estaba lleno, pero nadie vio el golpe. La policía debe determinar el arma, el lugar exacto y el responsable.',
      pistas: [
        'La cuerda del violín principal estaba rota y con marcas de sangre seca.',
        'El utilero juró haber visto el telón moverse solo minutos antes del apagón.',
        'Una partitura con la dedicatoria rasgada fue encontrada bajo el asiento de la primera fila.',
        'La soprano discutió con el maestro la víspera por el papel principal.',
        'Había polvo de resina en las suelas de los zapatos de quien bajó al foso aquella noche.'
      ],
      armaCorreta: 'Una Cuerda de Violín',
      localCorreto: 'El Foso de la Orquesta',
      assassinoCorreto: 'La Soprano',
      opcoesArma: ['Una Cuerda de Violín', 'Una Batuta de Maestro', 'Un Candelabro del Vestíbulo', 'Unas Tijeras de Vestuario', 'Un Arco de Violín'],
      opcoesLocal: ['El Foso de la Orquesta', 'El Camarín', 'El Escenario', 'El Vestíbulo', 'La Platea'],
      opcoesAssassino: ['El Utilero', 'La Soprano', 'El Violinista Principal', 'El Empresario', 'El Maestro Asistente'],
      dicaBoaArma:
        'La marca fina y profunda en el cuello vino de un hilo tensado — y el único hilo del teatro con sangre seca es el que se rompió en el violín principal.',
      dicaBoaLocal:
        'El polvo de resina en las suelas cuenta la historia: solo quien bajó al foso de la orquesta lo llevaría de vuelta a la superficie.',
      dicaBoaAssassino:
        'La dedicatoria rasgada de la partitura había sido escrita para la soprano — la misma que, al perder el papel principal, juró que el maestro «no llegaría al tercer acto».',
      dicasFracas: [
        'El Teatro Aurora agotó las entradas aquella noche.',
        'El utilero era conocido por su nerviosismo antes de cada función.',
        'Los telones del escenario se cambiaban cada temporada.',
        'El empresario presionaba al maestro por resultados y patrocinios.'
      ],
      epilogo:
        'Archivo cerrado el 25/09. La soprano fue condenada al descubrirse que la cuerda de violín rota llevaba la sangre del maestro; ella misma cortó la cuerda y bajó al foso siguiendo el polvo de resina. El Teatro Aurora reabrió sin ella en el elenco.'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'La Última Transmisión',
      relatorio:
        'En la madrugada del sábado, el locutor Válter Nobre interrumpió el programa en vivo con un grito y nunca más fue visto. La emisora de radio fue aislada, y la cinta de la transmisión desapareció. La policía investiga el arma del crimen, el lugar exacto y quién borró la grabación.',
      pistas: [
        'Un cable de micrófono fue encontrado enrollado detrás de la mesa de sonido, todavía húmedo.',
        'El operador de audio borró los últimos diez minutos de la cinta antes de llamar a la policía.',
        'La puerta del Estudio 3 estaba trancada por dentro, pero la ventana de ventilación estaba abierta.',
        'La locutora rival había amenazado con demandar al presentador la semana anterior.',
        'Había marcas de café derramado sobre el guion, cubriendo un nombre escrito a mano.'
      ],
      armaCorreta: 'Un Cable de Micrófono',
      localCorreto: 'El Estudio 3',
      assassinoCorreto: 'El Técnico de Sonido',
      opcoesArma: ['Un Cable de Micrófono', 'Una Cinta Magnética', 'Una Lámpara de Metal', 'Una Grapadora', 'Unos Auriculares'],
      opcoesLocal: ['El Estudio 3', 'La Cabina de Control', 'El Estacionamiento', 'La Cafetería', 'El Archivo de Cintas'],
      opcoesAssassino: ['La Locutora Rival', 'El Técnico de Sonido', 'El Director de la Radio', 'El Vigilante Nocturno', 'La Recepcionista'],
      dicaBoaArma:
        'La marca en el cuello de la víctima era un surco estrecho y uniforme — no un golpe, sino un cable flexible tensado por detrás.',
      dicaBoaLocal:
        'El grito captado en vivo solo pudo salir de una cabina con el micrófono abierto: el Estudio 3.',
      dicaBoaAssassino:
        'Quien borró los últimos diez minutos de la cinta tenía acceso a la mesa de sonido — y el técnico fue el único que tocó el equipo antes de que llegara la policía.',
      dicasFracas: [
        'La radio venía perdiendo audiencia frente a la competencia desde hacía meses.',
        'El locutor era famoso por sus entrevistas polémicas.',
        'La cafetería de la emisora servía café fuerte a cualquier hora de la madrugada.',
        'Había un vigilante que hacía rondas por el edificio cada dos horas.'
      ],
      epilogo:
        'Archivo cerrado el 26/09. El técnico de sonido confesó haber borrado la cinta para encubrir el crimen; el cable de micrófono todavía húmedo fue el arma. Cumple condena, y el Estudio 3 nunca más transmitió en vivo a esa hora.'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'El Jardín de las Estatuas',
      relatorio:
        'En la inauguración de la exposición al aire libre del Museo Bandeirante, el curador Heitor Prado fue encontrado caído entre las esculturas. La noche no tenía luna y el jardín estaba iluminado solo por antorchas. Nadie admite haberse acercado a él. La policía busca el arma, el lugar y el responsable.',
      pistas: [
        'Una antorcha de bronce fue encontrada apagada junto a una estatua derribada.',
        'Las huellas en el jardín indicaban a alguien que conocía el camino a oscuras.',
        'El guardia nocturno afirmó haber hecho la ronda hora a hora, pero el libro de registro tenía una página arrancada.',
        'La restauradora había sido despedida esa tarde por el curador.',
        'Había esquirlas de granito en la base de una estatua que debería estar intacta.'
      ],
      armaCorreta: 'Una Antorcha de Bronce',
      localCorreto: 'El Jardín de las Estatuas',
      assassinoCorreto: 'La Restauradora',
      opcoesArma: ['Una Antorcha de Bronce', 'Un Cincel', 'Una Estatua de Mármol', 'Un Martillo de Piedra', 'Un Pedestal de Piedra'],
      opcoesLocal: ['El Jardín de las Estatuas', 'La Galería Principal', 'El Despacho del Curador', 'La Entrada del Museo', 'El Depósito de Obras'],
      opcoesAssassino: ['El Guardia Nocturno', 'La Restauradora', 'El Patrocinador', 'El Periodista de Arte', 'El Fotógrafo'],
      dicaBoaArma:
        'La antorcha de bronce hallada apagada tenía la base abollada y cabellos prendidos en el metal — fue empuñada, no cayó sola.',
      dicaBoaLocal:
        'Las huellas en el jardín avanzaban sin titubear entre las esculturas, en oscuridad total: el crimen ocurrió en el jardín de las estatuas, donde solo quien conoce el lugar anda a ciegas.',
      dicaBoaAssassino:
        'La restauradora despedida esa tarde conocía cada estatua al tacto y sabía exactamente qué base cedía bajo el peso de una caída.',
      dicasFracas: [
        'La exposición al aire libre atrajo a más público del que el museo esperaba.',
        'El patrocinador del evento dio un largo discurso antes de la cena.',
        'Había antorchas encendidas por todo el jardín para la inauguración.',
        'El guardia usaba una linterna débil que apenas iluminaba el camino.'
      ],
      epilogo:
        'Archivo cerrado el 27/09. La restauradora despedida confesó el golpe con la antorcha de bronce; conocía cada estatua a oscuras y arrancó la página del libro de rondas. El jardín reabrió, y la estatua esquirlada fue restaurada por otras manos.'
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'El Puente Cubierto',
      relatorio:
        'El mercante Estrela do Norte atracó con un pasajero menos. El capitán Raul Vasquez fue visto por última vez en el puente de mando, en una noche de niebla densa. El cuaderno de bitácora tiene páginas mojadas y una anotación ilegible. La policía portuaria investiga el arma, el lugar y el responsable.',
      pistas: [
        'Un sextante fue encontrado con la lente agrietada y residuos de sangre en el aro de latón.',
        'El primer oficial asumió el mando antes de la hora marcada, sin que nadie lo hubiera llamado.',
        'Había cuerdas recién cortadas junto al mástil de popa.',
        'Una carta de dimisión firmada por el capitán estaba en el cajón del primer oficial.',
        'La brújula del puente apuntaba al norte magnético, pero el navío navegaba hacia el oeste.'
      ],
      armaCorreta: 'Un Sextante de Latón',
      localCorreto: 'El Puente de Mando',
      assassinoCorreto: 'El Primer Oficial',
      opcoesArma: ['Un Sextante de Latón', 'Un Cable de Acero', 'Un Ancla', 'Un Machete de Cubierta', 'Un Cronómetro de Bolsillo'],
      opcoesLocal: ['El Puente de Mando', 'La Bodega de Carga', 'La Cubierta Principal', 'La Sala de Máquinas', 'El Camarote del Capitán'],
      opcoesAssassino: ['El Cocinero', 'El Primer Oficial', 'El Maquinista', 'El Práctico del Puerto', 'El Timonel'],
      dicaBoaArma:
        'La lente agrietada y el aro de latón con residuos de sangre apuntan al instrumento que el capitán siempre llevaba al pecho — un sextante, no un cable ni una hoja.',
      dicaBoaLocal:
        'El cuaderno de bitácora empapado y la brújula desalineada solo tienen sentido en un lugar: el puente de mando, la única estancia con vista al mar y acceso a la navegación.',
      dicaBoaAssassino:
        'El primer oficial asumió el mando antes de tiempo y tenía en el cajón la propia carta de dimisión firmada por el capitán — móvil y oportunidad en el mismo camarote.',
      dicasFracas: [
        'La tripulación del Estrela do Norte era pequeña y había trabajado junta por años.',
        'La niebla densa de aquella noche obligaba al navío a reducir la velocidad.',
        'El cocinero se quejaba del poco espacio de la despensa.',
        'El práctico del puerto embarcó solo en las últimas millas antes del atraque.'
      ],
      epilogo:
        'Archivo cerrado el 28/09. El primer oficial fue preso por asumir el mando antes de la hora; la carta de dimisión en el cajón selló el móvil, y el sextante de latón era el arma. El Estrela do Norte navega bajo un nuevo capitán, y la brújula volvió al norte.'
    }
  ];

  var FALLBACK_CASOS_EN = [
    {
      id: 'caso-001',
      data: '2026-09-22',
      titulo: 'The Clock That Stopped at 23:47',
      relatorio:
        'The collector Álvaro Mendes was found lifeless in his library. Every clock in the house stopped at exactly 11:47 p.m., except one. The crime scene has been preserved and four people were in the mansion that night. The police must find the weapon, the exact location, and the person responsible.',
      pistas: [
        "The collector's pocket watch was found in the butler's pocket, yet the butler claims he never entered the library.",
        'The housekeeper saw a shadow cross the hallway at 11:45 p.m., wearing a long overcoat.',
        "The collector's daughter argued with her father that morning over the inheritance of the collection.",
        "There was copper dust on the nephew's shirt cuffs, even though he swore he had spent the whole day in the garden.",
        'A deep impact mark was found on the side of the bookshelf, at head height.'
      ],
      armaCorreta: 'The Pocket Watch',
      localCorreto: 'The Library',
      assassinoCorreto: 'The Nephew',
      opcoesArma: ['The Pocket Watch', 'A Kitchen Knife', 'A Curtain Cord', 'A Bronze Candlestick', 'A Bronze Inkwell'],
      opcoesLocal: ['The Library', 'The Garden', 'The Kitchen', 'The Hallway', "The Collector's Study"],
      opcoesAssassino: ['The Butler', 'The Housekeeper', 'The Daughter', 'The Nephew', 'The Family Doctor'],
      dicaBoaArma:
        'The mark on the bookshelf matches a small, dense object, the size of a palm — the only one of its kind missing from the display case is precisely the one the collector never let out of his pocket.',
      dicaBoaLocal:
        'The smell of old paper and the muffled silence give the room away: the windowless reading room explains why no one heard the blow.',
      dicaBoaAssassino:
        "The nephew would inherit the collection if the daughter were disinherited — and the copper dust on his cuffs came from inside the display case, the same one that covered the missing object.",
      dicasFracas: [
        'Everyone in the mansion slept badly that night; the wind rattled the shutters hard.',
        'The butler served dinner at 8 p.m. and cleared the dishes without hurrying.',
        'An old portrait hung on the wall, its glass fogged by the humidity.',
        'The housekeeper said the house was usually quiet after 10 p.m.'
      ],
      epilogo:
        "File closed on 09/22. The nephew confessed to the blow with his uncle's pocket watch, lured by the copper dust of the display case. The daughter inherited the collection, and the library once again displays every clock — except one."
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'The Letter with No Sender',
      relatorio:
        "An anonymous letter arrived at the local newspaper's newsroom reporting the theft of a rare jewel at the Oliveira mansion. The text was typed on an old typewriter. The safe was broken into during a dinner party and no one heard a thing. The police are investigating the weapon used, the location of the break-in, and who sent the letter.",
      pistas: [
        "The ribbon of the mansion's typewriter was fresh, with newly applied ink.",
        'The maid found a gold button near the broken-open safe.',
        'The butler can type, but claims he was off duty on the day of the theft.',
        'The jewel was last seen at a dinner where only four guests stayed until the end.',
        "There were crowbar marks on the safe's frame, made by a heavy tool."
      ],
      armaCorreta: 'A Crowbar',
      localCorreto: 'The Oliveira Mansion',
      assassinoCorreto: 'The Maid',
      opcoesArma: ['A Crowbar', 'A Typewriter', 'A Dagger', 'A Candelabrum', 'A Wrench'],
      opcoesLocal: ['The Oliveira Mansion', 'The Newspaper Newsroom', 'The Bank Vault', 'The Botanical Garden', 'The Dining Room'],
      opcoesAssassino: ['The Butler', 'The Maid', 'The Chauffeur', 'The Journalist', 'The Chef'],
      dicaBoaArma:
        'The marks on the frame form a wide, angled groove — the signature of an iron bar with a curved tip, not a blade or a writing tool.',
      dicaBoaLocal:
        'The fresh typewriter ribbon and the gold button by the safe have only one place in common: the Oliveira house, where the dinner took place.',
      dicaBoaAssassino:
        'The gold button belonged to the maid\'s uniform, and it was she who "found" the clue that was too good to be a coincidence.',
      dicasFracas: [
        'The journalist who received the letter seemed nervous when giving his statement.',
        'The Oliveira mansion has been famous for hosting illustrious guests for generations.',
        'The chauffeur washed the car the morning after the dinner.',
        'The jewel was kept in a velvet case, inside a secret drawer.'
      ],
      epilogo:
        'File closed on 09/23. The maid fell when the gold button from her own uniform was identified by forensics; the anonymous letter was hers, written to divert suspicion. The crowbar was recovered in the garden, and the jewel returned to the safe.'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'The Laboratory Enigma',
      relatorio:
        'The scientist Dr. Bastos vanished from his own laboratory on the night of the experiment. The door was locked from the inside, but the half-open window reveals something suspicious. There is no sign of forced entry, and the body was removed without leaving clear traces. The police are investigating the weapon, the location, and the person responsible for the crime.',
      pistas: [
        'There were glove marks on the window frame, on the inside.',
        'The assistant disappeared with the notebook on that very same night.',
        'A still-warm cup of tea was found on the table, with lipstick on the rim.',
        'Security recorded only one person leaving through the gate after midnight.',
        'A flask of reagent lay open and empty on the workbench, its seal broken.'
      ],
      armaCorreta: 'A Flask of Poison',
      localCorreto: 'The Laboratory',
      assassinoCorreto: 'The Lab Assistant',
      opcoesArma: ['A Flask of Poison', 'A Glass Beaker', 'A Scalpel', 'A Wooden Club', 'A Bench Burner'],
      opcoesLocal: ['The Laboratory', 'The Parking Lot', 'The Security Room', 'The Storage Room', 'The Research Wing'],
      opcoesAssassino: ['The Assistant', 'The Lab Assistant', 'The Guard', 'The Neighboring Scientist', 'The Intern'],
      dicaBoaArma:
        'The broken seal and the sweet smell in the air reveal that death came from inside a flask — something that dissolves without leaving a mark on the body.',
      dicaBoaLocal:
        'The door locked from the inside and the glove marks on the inner frame prove the crime never left that room: the laboratory was both stage and tomb.',
      dicaBoaAssassino:
        'The cup of tea with lipstick on the rim was served by someone with free access to the workbench — and only the assistant wore that shade of lipstick.',
      dicasFracas: [
        'The guard often slept on the job, according to his colleagues.',
        'The assistant was known for being absent-minded and kept losing the notebook.',
        'The laboratory received generous funding and had imported equipment.',
        'There was a persistent smell of ether in the corridor, even days later.'
      ],
      epilogo:
        "File closed on 09/24. The assistant confessed to swapping the scientist's tea for the reagent from the open flask, taking advantage of the laboratory gloves. The lipstick on the cup gave her away; she is serving a sentence for premeditated homicide."
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'The Out-of-Tune Violin',
      relatorio:
        'During the gala rehearsal at the Aurora Theater, the conductor Érico Salgado was found lifeless in the orchestra pit. The lights flickered, the curtain fell and, when they came back up, he was no longer breathing. The theater was full, but no one saw the blow. The police must determine the weapon, the exact location, and the person responsible.',
      pistas: [
        "The lead violin's string was snapped and bore marks of dried blood.",
        'The stagehand swore he saw the curtain move by itself minutes before the blackout.',
        'A score with the dedication torn off was found under a front-row seat.',
        'The soprano argued with the conductor the day before over the lead role.',
        'There was rosin dust on the soles of the shoes of whoever went down to the pit that night.'
      ],
      armaCorreta: 'A Violin String',
      localCorreto: 'The Orchestra Pit',
      assassinoCorreto: 'The Soprano',
      opcoesArma: ['A Violin String', "A Conductor's Baton", 'A Lobby Candelabrum', 'A Pair of Costume Shears', 'A Violin Bow'],
      opcoesLocal: ['The Orchestra Pit', 'The Dressing Room', 'The Stage', 'The Lobby', 'The Auditorium'],
      opcoesAssassino: ['The Stagehand', 'The Soprano', 'The Lead Violinist', 'The Agent', 'The Assistant Conductor'],
      dicaBoaArma:
        'The thin, deep mark on the neck came from a tensioned wire — and the only thread in the theater with dried blood on it is the one that snapped on the lead violin.',
      dicaBoaLocal:
        'The rosin dust on the soles tells the story: only someone who went down to the orchestra pit would carry it back up to the surface.',
      dicaBoaAssassino:
        'The torn dedication on the score had been written for the soprano — the same one who, upon losing the lead role, swore the conductor "would not reach the third act".',
      dicasFracas: [
        'The Aurora Theater had sold out every ticket that night.',
        'The stagehand was known for his nervousness before every performance.',
        'The stage curtains were replaced every season.',
        'The agent pressured the conductor for results and sponsorships.'
      ],
      epilogo:
        "File closed on 09/25. The soprano was convicted when the snapped violin string was found to carry the conductor's blood; she herself cut the string and went down to the pit, following the rosin dust. The Aurora Theater reopened without her in the cast."
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'The Last Transmission',
      relatorio:
        'In the early hours of Saturday, the announcer Válter Nobre interrupted the live program with a scream and was never seen again. The radio station was sealed off, and the transmission tape disappeared. The police are investigating the murder weapon, the exact location, and who erased the recording.',
      pistas: [
        'A microphone cable was found coiled behind the mixing console, still damp.',
        'The audio operator erased the last ten minutes of the tape before calling the police.',
        "Studio 3's door was locked from the inside, but the ventilation window was open.",
        'The rival announcer had threatened to sue the host the previous week.',
        'There were spilled coffee stains on the script, covering a name written by hand.'
      ],
      armaCorreta: 'A Microphone Cable',
      localCorreto: 'Studio 3',
      assassinoCorreto: 'The Sound Technician',
      opcoesArma: ['A Microphone Cable', 'A Magnetic Tape', 'A Metal Lamp', 'A Stapler', 'A Pair of Headphones'],
      opcoesLocal: ['Studio 3', 'The Control Booth', 'The Parking Lot', 'The Break Room', 'The Tape Archive'],
      opcoesAssassino: ['The Rival Announcer', 'The Sound Technician', 'The Station Director', 'The Night Watchman', 'The Receptionist'],
      dicaBoaArma:
        "The mark on the victim's neck was a narrow, uniform groove — not a blow, but a flexible cable pulled taut from behind.",
      dicaBoaLocal:
        'The scream picked up live could only have come from a booth with an open microphone: Studio 3.',
      dicaBoaAssassino:
        'Whoever erased the last ten minutes of the tape had access to the mixing console — and the technician was the only one who touched the equipment before the police arrived.',
      dicasFracas: [
        'The station had been losing audience to its rival for months.',
        'The announcer was famous for his controversial interviews.',
        "The station's break room served strong coffee at any hour of the night.",
        'There was a watchman who patrolled the building every two hours.'
      ],
      epilogo:
        'File closed on 09/26. The sound technician confessed to erasing the tape to cover up the crime; the still-damp microphone cable was the weapon. He is serving his sentence, and Studio 3 never again went live at that hour.'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'The Garden of Statues',
      relatorio:
        "At the opening of the Bandeirante Museum's open-air exhibition, the curator Heitor Prado was found collapsed among the sculptures. The night was moonless and the garden was lit only by torches. No one admits having approached him. The police are searching for the weapon, the location, and the person responsible.",
      pistas: [
        'A bronze torch was found extinguished next to a toppled statue.',
        'The footprints in the flowerbed belonged to someone who knew the path in the dark.',
        'The night guard claimed to have done his rounds every hour, but the logbook had a torn-out page.',
        'The restorer had been fired by the curator that very afternoon.',
        'There were granite chips on the base of a statue that should have been intact.'
      ],
      armaCorreta: 'A Bronze Torch',
      localCorreto: 'The Garden of Statues',
      assassinoCorreto: 'The Restorer',
      opcoesArma: ['A Bronze Torch', 'A Chisel', 'A Marble Statue', 'A Stone Hammer', 'A Stone Pedestal'],
      opcoesLocal: ['The Garden of Statues', 'The Main Gallery', "The Curator's Office", 'The Museum Entrance', 'The Works Storage'],
      opcoesAssassino: ['The Night Guard', 'The Restorer', 'The Sponsor', 'The Art Journalist', 'The Photographer'],
      dicaBoaArma:
        'The bronze torch found extinguished had a dented base and strands of hair caught in the metal — it was wielded; it did not fall on its own.',
      dicaBoaLocal:
        'The footprints in the flowerbed moved without hesitation among the sculptures, in total darkness: the crime happened in the garden of statues, where only those who know the place walk blind.',
      dicaBoaAssassino:
        'The restorer fired that afternoon knew every statue by touch and knew exactly which base would give way under the weight of a fall.',
      dicasFracas: [
        'The open-air exhibition drew a bigger crowd than the museum expected.',
        "The event's sponsor gave a long speech before dinner.",
        'Torches were lit throughout the garden for the opening.',
        'The guard carried a weak flashlight that barely lit the path.'
      ],
      epilogo:
        'File closed on 09/27. The fired restorer confessed to the blow with the bronze torch; she knew every statue in the dark and tore out the logbook page. The garden reopened, and the chipped statue was restored by another hand.'
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'The Shrouded Bridge',
      relatorio:
        'The merchant ship Estrela do Norte docked with one passenger fewer. Captain Raul Vasquez was last seen on the command bridge, on a night of dense fog. The logbook has wet pages and an illegible note. The port police are investigating the weapon, the location, and the person responsible.',
      pistas: [
        'A sextant was found with a cracked lens and blood residue on its brass rim.',
        'The first mate took command before the appointed hour, without anyone having called for him.',
        'There were freshly cut ropes by the aft mast.',
        "A resignation letter signed by the captain was in the first mate's drawer.",
        'The bridge compass pointed to magnetic north, but the ship was sailing west.'
      ],
      armaCorreta: 'A Brass Sextant',
      localCorreto: 'The Command Bridge',
      assassinoCorreto: 'The First Mate',
      opcoesArma: ['A Brass Sextant', 'A Steel Cable', 'An Anchor', 'A Deck Machete', 'A Pocket Chronometer'],
      opcoesLocal: ['The Command Bridge', 'The Cargo Hold', 'The Main Deck', 'The Engine Room', "The Captain's Cabin"],
      opcoesAssassino: ['The Cook', 'The First Mate', 'The Engineer', 'The Harbor Pilot', 'The Helmsman'],
      dicaBoaArma:
        'The cracked lens and the brass ring with blood residue point to the instrument the captain always carried against his chest — a sextant, not a cable or a blade.',
      dicaBoaLocal:
        'The soaked logbook and the misaligned compass only make sense in one place: the command bridge, the only room with a view of the sea and access to navigation.',
      dicaBoaAssassino:
        "The first mate took command ahead of schedule and had the captain's own signed resignation letter in his drawer — motive and opportunity in the same cabin.",
      dicasFracas: [
        "The Estrela do Norte's crew was small and had worked together for years.",
        'The dense fog that night forced the ship to slow down.',
        'The cook complained about the little space in the pantry.',
        'The harbor pilot boarded only in the last miles before docking.'
      ],
      epilogo:
        "File closed on 09/28. The first mate was arrested for taking command ahead of schedule; the resignation letter in the drawer sealed the motive, and the brass sextant was the weapon. The Estrela do Norte sails under a new captain, and the compass points north again."
    }
  ];

  function fallbackForLang(lang) {
    if (lang === 'es') return FALLBACK_CASOS_ES;
    if (lang === 'en') return FALLBACK_CASOS_EN;
    return FALLBACK_CASOS;
  }

  function casosUrlForLang(lang) {
    if (lang === 'es') return 'data/casos.es.json';
    if (lang === 'en') return 'data/casos.en.json';
    return 'data/casos.json';
  }

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
      return date.toLocaleDateString(t('locale'), {
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
      return date.toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' });
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
    var weapon = typeof h.weapon === 'number' ? h.weapon : (typeof h.weapon === 'string' ? h.weapon : '');
    var location = typeof h.location === 'number' ? h.location : (typeof h.location === 'string' ? h.location : '');
    var killer = typeof h.killer === 'number' ? h.killer : (typeof h.killer === 'string' ? h.killer : '');
    if (
      (weapon === '' || weapon === null || weapon === undefined) &&
      (location === '' || location === null || location === undefined) &&
      (killer === '' || killer === null || killer === undefined)
    ) return null;
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
    return fetch(casosUrlForLang(currentLang), { cache: 'no-store' })
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
        // file:// ou falha de rede: usa o fallback embutido no idioma atual.
        var fallback = validarCasos(fallbackForLang(currentLang));
        if (fallback.length === 0) throw new Error('Sem casos disponíveis');
        return fallback;
      });
  }

  // ---------- Renderização (somente textContent / createElement) ----------
  function renderCaso(caso) {
    document.getElementById('case-title').textContent =
      typeof caso.titulo === 'string' && caso.titulo ? caso.titulo : t('noTitle');

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
      // Valor = índice da opção: a lógica compara índices, então trocar o
      // idioma (que traduz os textos das opções) não quebra o jogo.
      opt.value = String(i);
      opt.textContent = nome;
      select.appendChild(opt);
    }
  }

  function renderAllOptions(caso) {
    renderOptions('guess-weapon', caso.opcoesArma, t('phWeapon'));
    renderOptions('guess-location', caso.opcoesLocal, t('phLocation'));
    renderOptions('guess-killer', caso.opcoesAssassino, t('phKiller'));
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

  function historyEntryText(value, lista, label) {
    // Entradas antigas guardam texto; novas guardam o índice da opção.
    var text = value;
    if (typeof value === 'number' && Array.isArray(lista) && lista[value] !== undefined) {
      text = String(lista[value]);
    } else if (typeof value === 'string') {
      text = value;
    } else {
      text = '???';
    }
    return label + text;
  }

  function renderHistory(history) {
    var list = document.getElementById('history-list');
    list.replaceChildren();
    for (var i = history.length - 1; i >= 0; i--) {
      var h = history[i];
      var li = document.createElement('li');
      li.className = 'history-item';

      var caso = state.caso;
      li.appendChild(historyGuess((h.weaponOk ? '✅' : '❌') + ' ' + historyEntryText(h.weapon, caso ? caso.opcoesArma : null, t('lblWeapon')), h.weaponOk));
      li.appendChild(historyGuess((h.locationOk ? '✅' : '❌') + ' ' + historyEntryText(h.location, caso ? caso.opcoesLocal : null, t('lblLocation')), h.locationOk));
      li.appendChild(historyGuess((h.killerOk ? '✅' : '❌') + ' ' + historyEntryText(h.killer, caso ? caso.opcoesAssassino : null, t('lblKiller')), h.killerOk));

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
    document.getElementById('case-title').textContent = t('msgLoadErrTitle');
    document.getElementById('case-desc').textContent = t('msgLoadErrDesc');
    showFeedback('error', t('msgLoadErrFeedback'));
    lockForm();
  }

  // ---------- Regras do jogo ----------
  function readSelect(id) {
    var el = document.getElementById(id);
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  function isValidOption(lista, value) {
    // value é o índice da opção (string numérica), nunca ''.
    if (value === '' || !Array.isArray(lista)) return false;
    var idx = Number(value);
    return isFinite(idx) && idx >= 0 && idx < lista.length && String(idx) === value.trim();
  }

  function consumeWeakHint(caso, progress) {
    var pool = Array.isArray(caso.dicasFracas) ? caso.dicasFracas : [];
    if (pool.length === 0) return t('msgNoWeakHint');
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
      template(t('msgWin'), {
        killer: String(caso.assassinoCorreto),
        weapon: String(caso.armaCorreta),
        location: String(caso.localCorreto),
        streak: state.streak
      })
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
    showFeedback('gameover', t('msgGameOver'));
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
      showFeedback('error', t('msgInvalid'));
      return;
    }

    // Comparações por índice: independentes do idioma ativo.
    var weaponOk = String(caso.opcoesArma[Number(weapon)]) === String(caso.armaCorreta);
    var locationOk = String(caso.opcoesLocal[Number(location)]) === String(caso.localCorreto);
    var killerOk = String(caso.opcoesAssassino[Number(killer)]) === String(caso.assassinoCorreto);

    // Descobertas persistem entre tentativas.
    if (weaponOk) progress.armaOk = true;
    if (locationOk) progress.localOk = true;

    recordHistory(progress, {
      weapon: Number(weapon),
      location: Number(location),
      killer: Number(killer),
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
      template(t('msgWrong'), { hits: hits, lives: progress.lives })
    );
  }

  // ---------- Internacionalização: aplicação na UI estática ----------
  function readLang() {
    var raw = readString(K_LANG, DEFAULT_LANG);
    return LANGS.indexOf(raw) !== -1 ? raw : DEFAULT_LANG;
  }

  function applyI18n() {
    try {
      document.documentElement.setAttribute('lang', t('locale'));
    } catch (e) { /* ignora */ }

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      var text = t(key);

      // Elementos com filhos com id (ex.: selo "CASO Nº <span>") recebem
      // apenas o primeiro nó de texto, preservando os filhos.
      if (el.firstElementChild && el.firstElementChild.id) {
        var tn = el.firstChild;
        while (tn && tn.nodeType !== 3) tn = tn.nextSibling;
        if (tn) tn.nodeValue = text;
        else el.insertBefore(document.createTextNode(text), el.firstChild);
      } else {
        el.textContent = text;
      }
    }

    var aria = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < aria.length; j++) {
      aria[j].setAttribute('aria-label', t(aria[j].getAttribute('data-i18n-aria')));
    }
  }

  function initLangSelect() {
    var sel = document.getElementById('lang-select');
    if (!sel) return;
    sel.value = currentLang;
    sel.addEventListener('change', function () {
      var lang = sel.value;
      if (LANGS.indexOf(lang) === -1) return;
      writeValue(K_LANG, lang);
      // Recarrega para recarregar caso + textos de forma consistente.
      window.location.reload();
    });
  }

  // ---------- Inicialização ----------
  function init() {
    currentLang = readLang();
    applyI18n();
    initLangSelect();

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

        var caso = pickCase(casos, now, todayKey);
        state.caso = caso;

        // Re-renderiza o histórico agora que caso/opções estão no idioma ativo.
        renderCaso(caso);
        renderAllOptions(caso);
        renderEvidence(caso, progress);
        renderHistory(progress.history);
        renderEpilogo(caso, progress.status === STATUS_WON);

        if (progress.status === STATUS_PLAYING) {
          unlockForm();
        } else {
          lockForm();
          if (progress.status === STATUS_WON) {
            showFeedback('success', t('msgAlreadyWon'));
          } else {
            showFeedback('gameover', t('msgAlreadyLost'));
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
