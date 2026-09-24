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
      relatorio: 'O colecionador Álvaro Mendes foi encontrado sem vida em sua biblioteca. Todos os relógios da casa pararam exatamente às 23:47, exceto um. A cena do crime está preservada e quatro pessoas estavam na mansão naquela noite. A polícia precisa descobrir a arma, o local exato e o responsável.',
      pistas: ['O ferimento era fundo, de bordas arredondadas, e nem lâmina, nem fio, nem cabo apareceram na cena.', 'A vitrine guarda a poeira por igual, menos num retângulo limpo do tamanho de uma mão fechada.', 'A criada da noite viu alguém sair do aposento dos livros às 23h45 e voltar sete minutos depois, com o passo apressado.', 'Dois moradores não têm álibi para as 23h47; um deles estava com as mãos sujas de algo que só existe num aposento da casa.', 'O aposento da queda não tem janelas e abafa qualquer som; o vidro da porta embaçou de dentro naquela noite.'],
      armaCorreta: 'O Relógio de Bolso',
      localCorreto: 'A Biblioteca',
      assassinoCorreto: 'O Sobrinho',
      opcoesArma: ['O Relógio de Bolso', 'Uma Faca de Cozinha', 'Uma Corda de Cortina', 'Um Castiçal de Bronze', 'Um Tinteiro de Bronze'],
      opcoesLocal: ['A Biblioteca', 'O Jardim', 'A Cozinha', 'O Corredor', 'O Escritório do Colecionador'],
      opcoesAssassino: ['O Mordomo', 'A Governanta', 'A Filha', 'O Sobrinho', 'O Médico da Família'],
      dicaBoaArma: 'Nada de corte, fio ou chama: a faca segue no suporte, a corda no gancho da janela e o castiçal na mesa. O objeto usado é compacto, denso e veio da coleção — sobram duas peças de metal que cabem numa palma.',
      dicaBoaLocal: 'A terra do jardim não pisou na casa naquela noite, a cozinha encerrou às 22h e o corredor foi apenas atravessado. O crime aconteceu num aposento fechado — e há dois no andar de cima.',
      dicaBoaAssassino: 'O sobrinho herdaria a coleção caso a filha fosse deserdada — e a poeira de cobre em seus punhos veio do interior da vitrine, a mesma que cobria o objeto desaparecido.',
      dicasFracas: ['O jantar foi servido às 20h e a louça recolhida sem pressa, como em todas as noites da mansão.', 'O retrato do fundador, na parede da sala, embaça com a umidade de setembro.', 'A governanta costuma trancar as portas de serviço às 22h e guardar a chave no gancho da cozinha.', 'O médico da família só é chamado à casa em urgências; era a segunda visita no mês.'],
      epilogo: 'Arquivo encerrado em 22/09. O sobrinho confessou o golpe com o relógio de bolso do tio, atraído pela poeira de cobre da vitrine. A filha herdou a coleção, e a biblioteca voltou a exibir todos os relógios — menos um.'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'A Carta sem Remetente',
      relatorio: 'Uma carta anônima chegou à redação do jornal local denunciando o roubo de uma joia rara na mansão dos Oliveira. O texto foi escrito em uma máquina antiga. O cofre foi arrombado durante um jantar e ninguém ouviu nada. A polícia investiga a arma usada, o local do arrombamento e quem enviou a carta.',
      pistas: ['Dois sulcos paralelos, afastados como os braços de uma garra, marcam a moldura do cofre.', 'A fita da máquina da residência foi trocada naquela semana, e ninguém lembra quem a comprou.', 'Um funcionário circulou pela casa a noite inteira sem tarefa definida; outro, que alegava folga, foi reconhecido na rua dos fundos às 21h.', 'O alarme da residência ficou desarmado pelo tempo exato em que a sobremesa era servida.', 'A denúncia chegou ao jornal com carimbo do dia anterior ao roubo — escrita por quem sabia do crime antes dele.'],
      armaCorreta: 'Um Pé de Cabra',
      localCorreto: 'A Mansão dos Oliveira',
      assassinoCorreto: 'A Empregada',
      opcoesArma: ['Um Pé de Cabra', 'Uma Máquina de Escrever', 'Um Punhal', 'Um Candelabro', 'Uma Chave Inglesa'],
      opcoesLocal: ['A Mansão dos Oliveira', 'A Redação do Jornal', 'O Cofre do Banco', 'O Jardim Botânico', 'A Sala de Jantar'],
      opcoesAssassino: ['O Mordomo', 'A Empregada', 'O Motorista', 'O Jornalista', 'O Chef de Cozinha'],
      dicaBoaArma: 'O cofre cedeu a uma alavanca, não a uma lâmina nem a um peso de mesa: utensílios de escrita e ornamentos ficam fora. Restam duas ferramentas de aço da oficina — e a forma da garra na moldura separa uma da outra.',
      dicaBoaLocal: 'A fita trocada, o alarme desarmado e o jantar servido pertencem ao mesmo endereço; redação, banco e jardim não reúnem os três. O crime ficou dentro da residência, num aposento usado à noite para receber.',
      dicaBoaAssassino: 'O botão dourado achado junto ao cofre pertencia ao uniforme da empregada — e foi a própria empregada quem o \'encontrou\', pista boa demais para ser coincidência.',
      dicasFracas: ['A joia dormia num estojo de veludo, dentro de uma gaveta com fundo falso.', 'O chef serviu o jantar em três tempos e saiu antes do café, como manda a casa.', 'O motorista lava o carro toda manhã; naquela manhã, também o encerrou.', 'A mansão recebe convidados ilustres desde os tempos do avô dos Oliveira.'],
      epilogo: 'Arquivo encerrado em 23/09. A empregada caiu quando o botão dourado do próprio uniforme foi reconhecido pela perícia; a carta anônima era sua, escrita para desviar suspeitas. O pé de cabra foi recuperado no jardim, e a joia voltou ao cofre.'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'O Enigma do Laboratório',
      relatorio: 'O cientista Dr. Bastos desapareceu do próprio laboratório na noite do experimento. A porta estava trancada por dentro, mas a janela entreaberta revela algo suspeito. Não há sinal de arrombamento, e o corpo foi removido sem deixar rastros claros. A polícia investiga a arma, o local e o responsável pelo crime.',
      pistas: ['O corpo não tem cortes, contusões, queimaduras nem sinais de choque — apenas um rubor estranho na pele e o hálito alterado.', 'Um recipiente de vidro da bancada amanheceu vazio, com o lacre rompido e sem registro de descarte.', 'O crachá que abriu a catraca depois da meia-noite estava esquecido, desde o fim do expediente, na mesa de um colega.', 'A xícara no balcão guarda batom num só lado — e a rotina do setor proíbe bebidas junto à bancada.', 'A janela trancou-se por dentro, e as marcas de luvas ficaram no batente interno.'],
      armaCorreta: 'Um Frasco de Veneno',
      localCorreto: 'O Laboratório',
      assassinoCorreto: 'A Assistente de Laboratório',
      opcoesArma: ['Um Frasco de Veneno', 'Uma Proveta de Vidro', 'Um Bisturi', 'Um Cabo de Madeira', 'Um Maçarico de Bancada'],
      opcoesLocal: ['O Laboratório', 'O Estacionamento', 'A Sala de Segurança', 'O Almoxarifado', 'A Ala de Pesquisa'],
      opcoesAssassino: ['O Assistente', 'A Assistente de Laboratório', 'O Segurança', 'O Cientista Vizinho', 'O Estagiário'],
      dicaBoaArma: 'Sem cortes, chamas ou impacto, o arsenal da bancada perde bisturi, maçarico e cabo de madeira. Restam os dois recipientes de vidro que guardam conteúdo.',
      dicaBoaLocal: 'Terra, chuva e caixas não combinam com o cenário; pátio, guarita e estoque ficam fora. O ar pesa química e o vidro trancou por dentro — sobra a área científica, entre o recinto principal e a ala vizinha.',
      dicaBoaAssassino: 'A xícara de chá com batom na borda foi servida por quem tinha livre acesso à bancada — e só a assistente usava aquele tom de batom.',
      dicasFracas: ['O laboratório funciona com verba de projeto e recebe equipamento importado todo trimestre.', 'O assistente de pesquisa é distraído; já perdeu três cadernos neste semestre.', 'O éter do corredor fica no ar até tarde nos dias de destilação.', 'O segurança fazia as rodadas dormitando, segundo a própria folha de ponto.'],
      epilogo: 'Arquivo encerrado em 24/09. A assistente confessou ter trocado o chá do cientista pelo reagente do frasco aberto, aproveitando as luvas do laboratório. O batom na xícara a entregou; ela cumpre pena por homicídio qualificado.'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'O Violino Desafinado',
      relatorio: 'Durante o ensaio de gala no Teatro Aurora, o maestro Érico Salgado foi encontrado sem vida no fosso da orquestra. As luzes piscaram, a cortina caiu e, quando voltaram, ele já não respirava. O teatro estava lotado, mas ninguém viu o golpe. A polícia precisa determinar a arma, o local exato e o responsável.',
      pistas: ['A marca no pescoço é um sulco fino e sem nós, traço de algo puxado entre dois pontos de tensão.', 'A encordoação mais fina do instrumento principal foi substituída horas antes; o luthier não veio ao teatro.', 'As solas de quem circulou abaixo do piso da orquestra guardavam pó escuro e resinoso.', 'A solista do papel principal anunciou que não cantaria o segundo ato e deixou o camarim antes do apagão.', 'A cortina desceu cinco minutos antes do combinado — tempo justo para descer ao nível mais baixo e voltar.'],
      armaCorreta: 'Uma Corda de Violino',
      localCorreto: 'O Fosso da Orquestra',
      assassinoCorreto: 'A Soprano',
      opcoesArma: ['Uma Corda de Violino', 'Uma Batuta de Maestro', 'Um Candelabro do Saguão', 'Uma Tesoura de Figurino', 'Um Arco de Violino'],
      opcoesLocal: ['O Fosso da Orquestra', 'O Camarim', 'O Palco', 'O Saguão', 'A Plateia'],
      opcoesAssassino: ['O Contra-Regra', 'A Soprano', 'O Violinista Principal', 'O Empresário', 'O Maestro Assistente'],
      dicaBoaArma: 'O sulco fino e ininterrupto não nasce de rombo nem de haste: batuta, candelabro e tesoura ficam fora. Restam os dois fios do palco que se tensionam entre as mãos.',
      dicaBoaLocal: 'Palco, saguão e plateia viveram cheios de olhos naquela noite; sobram o nível abaixo do piso e os bastidores fechados — e o pó resinoso decide entre os dois.',
      dicaBoaAssassino: 'A soprano perdeu o papel principal na véspera e jurou que o maestro \'não chegaria ao terceiro ato\'; a partitura com a dedicatória rasgada, achada sob a primeira fila, era dela.',
      dicasFracas: ['A bilheteria esgotou na véspera; os corredores ficaram apertados no intervalo.', 'O contra-regra confere as cortinas três vezes por sessão, sempre tremendo.', 'As cortinas do palco são trocadas a cada temporada, por costume da casa.', 'O empresário cobra resultados em cada ensaio; o maestro responde com silêncio.'],
      epilogo: 'Arquivo encerrado em 25/09. A soprano foi condenada ao saber que o fio de violino arrebentado carregava o sangue do maestro; ela mesma cortou a corda e desceu ao fosso pelo pó de breu. O Teatro Aurora reabriu sem ela no elenco.'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'A Última Transmissão',
      relatorio: 'Na madrugada de sábado, o locutor Válter Nobre interrompeu o programa ao vivo com um grito e nunca mais foi visto. A estação de rádio foi isolada, e a fita da transmissão desapareceu. A polícia investiga a arma do crime, o local exato e quem apagou a gravação.',
      pistas: ['O sulco no pescoço é contínuo, sem lâmina, deixado por material flexível e áspero.', 'O último som antes do grito foi o clique de um conector encaixado na mesa de captação.', 'O contador da fita foi zerado e rebobinado quinze minutos; o carretel original nunca apareceu no arquivo.', 'A catraca do terceiro andar registra saída às 1h05 e retorno às 1h10, no corredor das cabines.', 'A senha de gravação foi usada dez minutos após o grito, por um perfil de manutenção de áudio.'],
      armaCorreta: 'Um Cabo de Microfone',
      localCorreto: 'O Estúdio 3',
      assassinoCorreto: 'O Técnico de Som',
      opcoesArma: ['Um Cabo de Microfone', 'Uma Fita Magnética', 'Um Abajur de Metal', 'Um Grampeador', 'Um Fone de Ouvido'],
      opcoesLocal: ['O Estúdio 3', 'A Cabine de Controle', 'O Estacionamento', 'A Copa', 'O Arquivo de Fitas'],
      opcoesAssassino: ['A Locutora Concorrente', 'O Técnico de Som', 'O Diretor da Rádio', 'O Vigia Noturno', 'A Recepcionista'],
      dicaBoaArma: 'A marca pede algo longo, flexível e áspero: fita frágil, peso de mesa e metal de gaveta ficam fora. Restam os dois acessórios que os operadores penduram no ombro.',
      dicaBoaLocal: 'Nem copa, nem pátio e nem arquivo têm sinal no ar: o grito foi captado ao vivo, com o clique de um conector na mesa. Sobram duas salas de som.',
      dicaBoaAssassino: 'Quem apagou os últimos minutos da fita tinha acesso à mesa de som — e o técnico foi o único a mexer no equipamento antes de a polícia chegar.',
      dicasFracas: ['A estação perde audiência para a concorrente desde o carnaval.', 'O locutor gostava de entrevistas polêmicas e nunca quis segurança no ar.', 'A copa serve café forte a qualquer hora; a jarra raramente esfria.', 'O vigia faz ronda a cada duas horas e nunca sobe ao terceiro andar.'],
      epilogo: 'Arquivo encerrado em 26/09. O técnico de som confessou ter apagado a fita para encobrir o crime; o cabo de microfone ainda úmido foi a arma. Ele cumpre pena, e o Estúdio 3 nunca mais transmitiu ao vivo àquela hora.'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'O Jardim das Estátuas',
      relatorio: 'Na abertura da exposição ao ar livre do Museu Bandeirante, o curador Heitor Prado foi encontrado caído entre as esculturas. A noite estava sem lua e o jardim, iluminado apenas por tochas. Ninguém admite ter se aproximado dele. A polícia busca a arma, o local e o responsável.',
      pistas: ['O golpe subiu de baixo para cima, de uma haste longa e base pesada — algo feito para segurar ou iluminar, não para cortar ou pregar.', 'A escultura tombada sofreu impacto na base, não pressão lateral.', 'Um único par de pegadas vai e volta pelo mesmo caminho do canteiro, sem hesitar nas curvas.', 'A última página do livro de ronda foi arrancada; o guarda culpa o vento.', 'A própria vítima demitiu alguém no fim do expediente; essa pessoa saiu do depósito minutos depois, com uma chave de reserva.'],
      armaCorreta: 'Uma Tocha de Bronze',
      localCorreto: 'O Jardim das Estátuas',
      assassinoCorreto: 'A Restauradora',
      opcoesArma: ['Uma Tocha de Bronze', 'Um Cinzel', 'Uma Estátua de Mármore', 'Um Martelo de Pedra', 'Um Pedestal de Pedra'],
      opcoesLocal: ['O Jardim das Estátuas', 'A Galeria Principal', 'O Escritório do Curador', 'A Entrada do Museu', 'O Depósito de Obras'],
      opcoesAssassino: ['O Segurança Noturno', 'A Restauradora', 'O Patrocinador', 'O Jornalista de Arte', 'O Fotógrafo'],
      dicaBoaArma: 'Haste longa e base pesada, empunhada de baixo para cima: cinzel, estátua inteira e pedestal fixo ficam fora. Restam duas peças do acervo que se seguram pela base — uma de bronze, outra de pedra.',
      dicaBoaLocal: 'Galeria vigiada, escritório fechado e entrada com portaria não explicam pegadas em canteiro; sobra o ar livre — o espaço das obras expostas ou o anexo das peças guardadas.',
      dicaBoaAssassino: 'A restauradora demitida naquela tarde conhecia cada estátua pelo toque e sabia exatamente qual base cedia sob o peso de uma queda.',
      dicasFracas: ['A abertura ao ar livre atraiu mais público que o previsto; as luzes do jardim foram acesas ao anoitecer.', 'O patrocinador discursou longamente antes do jantar, como faz em toda estreia.', 'A lanterna do guarda noturno tem pilha fraca desde a última inspeção.', 'As obras do anexo aguardam restauração há dois verões.'],
      epilogo: 'Arquivo encerrado em 27/09. A restauradora demitida confessou o golpe com a tocha de bronze; conhecia cada estátua no escuro e apagou a página do livro de ronda. O jardim reabriu, e a estátua lascada foi restaurada por outra mão.'
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'A Ponte Encoberta',
      relatorio: 'O navio mercante Estrela do Norte atracou com um passageiro a menos. O capitão Raul Vasquez foi visto por último na ponte de comando, numa noite de névoa densa. O diário de bordo tem páginas molhadas e uma anotação ilegível. A polícia portuária investiga a arma, o local e o responsável.',
      pistas: ['O impacto na cabeça é angular, de bordas duras, e sem ferrugem no ponto do golpe — metal polido, não aço de maresia.', 'O instrumento que o capitão usava ao amanhecer estava molhado por fora e seco por dentro, como quem o limpa às pressas.', 'A bússola do leme apontava para oeste enquanto o diário de bordo registrava rumo norte.', 'O oficial que assumiria às três horas assumiu às duas e mandou calar os telégrafos.', 'Uma carta datada daquele dia, assinada pela vítima, foi encontrada na gaveta do segundo no comando.'],
      armaCorreta: 'Um Sextante de Latão',
      localCorreto: 'A Ponte de Comando',
      assassinoCorreto: 'O Imediato',
      opcoesArma: ['Um Sextante de Latão', 'Um Cabo de Aço', 'Uma Âncora', 'Um Facão de Convés', 'Um Cronômetro de Bolso'],
      opcoesLocal: ['A Ponte de Comando', 'O Porão de Carga', 'O Convés Principal', 'A Casa de Máquinas', 'O Camarote do Capitão'],
      opcoesAssassino: ['O Cozinheiro', 'O Imediato', 'O Maquinista', 'O Prático do Porto', 'O Timoneiro'],
      dicaBoaArma: 'Borda angular e polida, sem ferrugem: cabo de aço, âncora e facão ficam fora. Restam dois instrumentos de precisão, de metal claro, que o capitão mantinha junto ao leme.',
      dicaBoaLocal: 'O rumo errado só se corrige de onde se vê o horizonte: porão, convés e casa de máquinas ficam abaixo da linha de comando. Sobram o posto do leme e o aposento do capitão — e a bússola decide entre eles.',
      dicaBoaAssassino: 'O imediato assumiu o comando antes da hora e tinha na gaveta a própria carta de demissão assinada pelo capitão — motivação e oportunidade no mesmo camarote.',
      dicasFracas: ['A tripulação é pequena e trabalha junta desde a rota do Pacífico.', 'A névoa densa daquela noite impôs velocidade reduzida por quase três horas.', 'O cozinheiro reclama da despensa apertada em toda travessia.', 'O prático do porto embarca só nas últimas milhas, como manda o regulamento.'],
      epilogo: 'Arquivo encerrado em 28/09. O imediato foi preso ao assumir o comando antes da hora; a carta de demissão na gaveta selou o motivo, e o sextante de latão era a arma. O Estrela do Norte navega sob novo capitão, e a bússola voltou ao norte.'
    }
  ];

  // Fallbacks traduzidos: mesma estrutura/schema do FALLBACK_CASOS (pt-BR).
  var FALLBACK_CASOS_ES = [
    {
      id: 'caso-001',
      data: '2026-09-22',
      titulo: 'El Reloj Detenido a las 23:47',
      relatorio: 'El coleccionista Álvaro Mendes fue encontrado sin vida en su biblioteca. Todos los relojes de la casa se detuvieron exactamente a las 23:47, excepto uno. La escena del crimen está preservada y cuatro personas estaban en la mansión aquella noche. La policía necesita descubrir el arma, el lugar exacto y el responsable.',
      pistas: ['La herida era profunda, de bordes redondeados, y ni hoja, ni hilo, ni cable aparecieron en la escena.', 'La vitrina guarda el polvo por igual, salvo en un rectángulo limpio del tamaño de un puño.', 'La criada nocturna vio a alguien salir de la estancia de los libros a las 23h45 y volver siete minutos después, con el paso apresurado.', 'Dos residentes no tienen coartada para las 23h47; uno de ellos tenía las manos sucias de algo que solo existe en una estancia de la casa.', 'La estancia de la caída no tiene ventanas y ahoga cualquier sonido; el vidrio de la puerta se empañó desde dentro aquella noche.'],
      armaCorreta: 'El Reloj de Bolsillo',
      localCorreto: 'La Biblioteca',
      assassinoCorreto: 'El Sobrino',
      opcoesArma: ['El Reloj de Bolsillo', 'Un Cuchillo de Cocina', 'Una Cuerda de Cortina', 'Un Candelero de Bronce', 'Un Tintero de Bronce'],
      opcoesLocal: ['La Biblioteca', 'El Jardín', 'La Cocina', 'El Pasillo', 'El Despacho del Coleccionista'],
      opcoesAssassino: ['El Mayordomo', 'La Gobernanta', 'La Hija', 'El Sobrino', 'El Médico de la Familia'],
      dicaBoaArma: 'Nada de corte, hilo ni llama: el cuchillo sigue en su soporte, la cuerda en el gancho de la ventana y el candelero en la mesa. El objeto usado es compacto, denso y vino de la colección — quedan dos piezas de metal que caben en una palma.',
      dicaBoaLocal: 'La tierra del jardín no pisó la casa aquella noche, la cocina cerró a las 22h y el pasillo fue solo atravesado. El crimen ocurrió en una estancia cerrada — y hay dos en el piso de arriba.',
      dicaBoaAssassino: 'El sobrino heredaría la colección si la hija fuera desheredada — y el polvo de cobre en sus puños vino del interior de la vitrina, la misma que cubría el objeto desaparecido.',
      dicasFracas: ['La cena fue servida a las 20h y la vajilla recogida sin prisa, como en todas las noches de la mansión.', 'El retrato del fundador, en la pared de la sala, se empaña con la humedad de septiembre.', 'La gobernanta suele trancar las puertas de servicio a las 22h y guardar la llave en el gancho de la cocina.', 'El médico de la familia solo es llamado a la casa en urgencias; era la segunda visita del mes.'],
      epilogo: 'Archivo cerrado el 22/09. El sobrino confesó el golpe con el reloj de bolsillo del tío, atraído por el polvo de cobre de la vitrina. La hija heredó la colección, y la biblioteca volvió a exhibir todos los relojes — menos uno.'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'La Carta sin Remitente',
      relatorio: 'Una carta anónima llegó a la redacción del periódico local denunciando el robo de una joya rara en la mansión de los Oliveira. El texto fue escrito en una máquina antigua. La caja fuerte fue forzada durante una cena y nadie escuchó nada. La policía investiga el arma usada, el lugar del asalto y quién envió la carta.',
      pistas: ['Dos surcos paralelos, separados como los brazos de una garra, marcan el marco de la caja fuerte.', 'La cinta de la máquina de la residencia fue cambiada esa semana, y nadie recuerda quién la compró.', 'Un empleado recorrió la casa toda la noche sin tarea definida; otro, que alegaba estar libre, fue reconocido en la calle de atrás a las 21h.', 'La alarma de la residencia quedó desarmada por el tiempo exacto en que el postre era servido.', 'La denuncia llegó al periódico con matasellos del día anterior al robo — escrita por quien sabía del crimen antes de que ocurriera.'],
      armaCorreta: 'Un Pie de Cabra',
      localCorreto: 'La Mansión de los Oliveira',
      assassinoCorreto: 'La Empleada',
      opcoesArma: ['Un Pie de Cabra', 'Una Máquina de Escribir', 'Una Daga', 'Un Candelabro', 'Una Llave Inglesa'],
      opcoesLocal: ['La Mansión de los Oliveira', 'La Redacción del Periódico', 'La Caja Fuerte del Banco', 'El Jardín Botánico', 'El Comedor'],
      opcoesAssassino: ['El Mayordomo', 'La Empleada', 'El Chofer', 'El Periodista', 'El Chef de Cocina'],
      dicaBoaArma: 'La caja fuerte cedió a una palanca, no a una hoja ni a un peso de mesa: los utensilios de escritura y los ornamentos quedan fuera. Quedan dos herramientas de acero del taller — y la forma de la garra en el marco separa una de la otra.',
      dicaBoaLocal: 'La cinta cambiada, la alarma desarmada y la cena servida pertenecen a la misma dirección; la redacción, el banco y el jardín no reúnen los tres. El crimen quedó dentro de la residencia, en una estancia usada de noche para recibir.',
      dicaBoaAssassino: 'El botón dorado hallado junto a la caja fuerte pertenecía al uniforme de la empleada — y fue la propia empleada quien lo «encontró», pista demasiado buena para ser coincidencia.',
      dicasFracas: ['La joya dormía en un estuche de terciopelo, dentro de un cajón con fondo falso.', 'El chef sirvió la cena en tres tiempos y salió antes del café, como manda la casa.', 'El chofer lava el coche toda mañana; aquella mañana, además, lo enceró.', 'La mansión recibe invitados ilustres desde los tiempos del abuelo de los Oliveira.'],
      epilogo: 'Archivo cerrado el 23/09. La empleada cayó cuando el botón dorado de su propio uniforme fue reconocido por la policía científica; la carta anónima era suya, escrita para desviar sospechas. El pie de cabra fue recuperado en el jardín, y la joya volvió a la caja fuerte.'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'El Enigma del Laboratorio',
      relatorio: 'El científico Dr. Bastos desapareció de su propio laboratorio la noche del experimento. La puerta estaba trancada por dentro, pero la ventana entreabierta revela algo sospechoso. No hay señales de allanamiento y el cuerpo fue retirado sin dejar rastros claros. La policía investiga el arma, el lugar y el responsable del crimen.',
      pistas: ['El cuerpo no tiene cortes, contusiones, quemaduras ni señales de descarga — solo un rubor extraño en la piel y el aliento alterado.', 'Un recipiente de vidrio de la mesa de trabajo amaneció vacío, con el lacre roto y sin registro de descarte.', 'La tarjeta que abrió el torno después de la medianoche estaba olvidada, desde el fin del turno, en la mesa de un colega.', 'La taza del mostrador guarda lápiz labial en un solo lado — y la rutina del sector prohíbe bebidas junto a la mesa de trabajo.', 'La ventana se trancó por dentro, y las marcas de guantes quedaron en el batiente interno.'],
      armaCorreta: 'Un Frasco de Veneno',
      localCorreto: 'El Laboratorio',
      assassinoCorreto: 'La Asistente de Laboratorio',
      opcoesArma: ['Un Frasco de Veneno', 'Una Probeta de Vidrio', 'Un Bisturí', 'Un Palo de Madera', 'Un Soplete de Mesa'],
      opcoesLocal: ['El Laboratorio', 'El Estacionamiento', 'La Sala de Seguridad', 'El Almacén', 'El Ala de Investigación'],
      opcoesAssassino: ['El Asistente', 'La Asistente de Laboratorio', 'El Guardia', 'El Científico Vecino', 'El Pasante'],
      dicaBoaArma: 'Sin cortes, llamas ni impacto, el arsenal de la mesa de trabajo pierde bisturí, soplete y palo de madera. Quedan los dos recipientes de vidrio que guardan contenido.',
      dicaBoaLocal: 'Tierra, lluvia y cajas no combinan con la escena; patio, garita y almacén quedan fuera. El aire pesa a química y el vidrio se trancó por dentro — queda el área científica, entre el recinto principal y el ala vecina.',
      dicaBoaAssassino: 'La taza de té con lápiz labial en el borde fue servida por quien tenía libre acceso a la mesa de trabajo — y solo la asistente usaba ese tono de labial.',
      dicasFracas: ['El laboratorio funciona con subvención de proyecto y recibe equipo importado cada trimestre.', 'El asistente de investigación es distraído; ya perdió tres cuadernos este semestre.', 'El olor a éter del pasillo permanece en el aire hasta tarde los días de destilación.', 'El guardia hacía las rondas dormitando, según su propia hoja de registro.'],
      epilogo: 'Archivo cerrado el 24/09. La asistente confesó haber cambiado el té del científico por el reactivo del frasco abierto, aprovechando los guantes del laboratorio. El lápiz labial en la taza la delató; cumple condena por homicidio calificado.'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'El Violín Desafinado',
      relatorio: 'Durante el ensayo de gala en el Teatro Aurora, el maestro Érico Salgado fue encontrado sin vida en el foso de la orquesta. Las luces parpadearon, el telón cayó y, cuando volvieron, ya no respiraba. El teatro estaba lleno, pero nadie vio el golpe. La policía debe determinar el arma, el lugar exacto y el responsable.',
      pistas: ['La marca en el cuello es un surco fino y sin nudos, trazo de algo tirado entre dos puntos de tensión.', 'La cuerda más fina del instrumento principal fue cambiada horas antes; el lutier no vino al teatro.', 'Las suelas de quien circuló bajo el piso de la orquesta guardaban polvo oscuro y resinoso.', 'La solista del papel principal anunció que no cantaría el segundo acto y dejó el camarín antes del apagón.', 'El telón bajó cinco minutos antes de lo previsto — tiempo justo para bajar al nivel más bajo y volver.'],
      armaCorreta: 'Una Cuerda de Violín',
      localCorreto: 'El Foso de la Orquesta',
      assassinoCorreto: 'La Soprano',
      opcoesArma: ['Una Cuerda de Violín', 'Una Batuta de Maestro', 'Un Candelabro del Vestíbulo', 'Unas Tijeras de Vestuario', 'Un Arco de Violín'],
      opcoesLocal: ['El Foso de la Orquesta', 'El Camarín', 'El Escenario', 'El Vestíbulo', 'La Platea'],
      opcoesAssassino: ['El Utilero', 'La Soprano', 'El Violinista Principal', 'El Empresario', 'El Maestro Asistente'],
      dicaBoaArma: 'El surco fino e ininterrumpido no nace de rombo ni de vara: batuta, candelabro y tijeras quedan fuera. Quedan los dos hilos del escenario que se tensan entre las manos.',
      dicaBoaLocal: 'Escenario, vestíbulo y platea vivieron llenos de ojos aquella noche; quedan el nivel bajo el piso y los bastidores cerrados — y el polvo resinoso decide entre los dos.',
      dicaBoaAssassino: 'La soprano perdió el papel principal la víspera y juró que el maestro «no llegaría al tercer acto»; la partitura con la dedicatoria rasgada, hallada bajo la primera fila, era suya.',
      dicasFracas: ['La taquilla agotó la víspera; los pasillos quedaron apretados en el intermedio.', 'El utilero revisa los telones tres veces por función, siempre temblando.', 'Los telones del escenario se cambian cada temporada, por costumbre de la casa.', 'El empresario exige resultados en cada ensayo; el maestro responde con silencio.'],
      epilogo: 'Archivo cerrado el 25/09. La soprano fue condenada al descubrirse que la cuerda de violín rota llevaba la sangre del maestro; ella misma cortó la cuerda y bajó al foso siguiendo el polvo de resina. El Teatro Aurora reabrió sin ella en el elenco.'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'La Última Transmisión',
      relatorio: 'En la madrugada del sábado, el locutor Válter Nobre interrumpió el programa en vivo con un grito y nunca más fue visto. La emisora de radio fue aislada, y la cinta de la transmisión desapareció. La policía investiga el arma del crimen, el lugar exacto y quién borró la grabación.',
      pistas: ['El surco en el cuello es continuo, sin hoja, dejado por un material flexible y áspero.', 'El último sonido antes del grito fue el chasquido de un conector encajado en la mesa de captación.', 'El contador de la cinta fue puesto a cero y rebobinado quince minutos; el carrete original nunca apareció en el archivo.', 'El torno del tercer piso registra salida a la 1h05 y regreso a la 1h10, en el pasillo de las cabinas.', 'La contraseña de grabación fue usada diez minutos después del grito, por un perfil de mantenimiento de audio.'],
      armaCorreta: 'Un Cable de Micrófono',
      localCorreto: 'El Estudio 3',
      assassinoCorreto: 'El Técnico de Sonido',
      opcoesArma: ['Un Cable de Micrófono', 'Una Cinta Magnética', 'Una Lámpara de Metal', 'Una Grapadora', 'Unos Auriculares'],
      opcoesLocal: ['El Estudio 3', 'La Cabina de Control', 'El Estacionamiento', 'La Cafetería', 'El Archivo de Cintas'],
      opcoesAssassino: ['La Locutora Rival', 'El Técnico de Sonido', 'El Director de la Radio', 'El Vigilante Nocturno', 'La Recepcionista'],
      dicaBoaArma: 'La marca pide algo largo, flexible y áspero: la cinta frágil, el peso de mesa y el metal de gaveta quedan fuera. Quedan los dos accesorios que los operadores cuelgan del hombro.',
      dicaBoaLocal: 'Ni cafetería, ni patio y ni archivo tienen señal al aire: el grito fue captado en vivo, con el chasquido de un conector en la mesa. Quedan dos salas de sonido.',
      dicaBoaAssassino: 'Quien borró los últimos minutos de la cinta tenía acceso a la mesa de sonido — y el técnico fue el único en tocar el equipo antes de que llegara la policía.',
      dicasFracas: ['La emisora pierde audiencia frente a la competencia desde el carnaval.', 'El locutor gustaba de entrevistas polémicas y nunca quiso seguridad al aire.', 'La cafetería sirve café fuerte a cualquier hora; la jarra casi nunca se enfría.', 'El vigilante hace ronda cada dos horas y nunca sube al tercer piso.'],
      epilogo: 'Archivo cerrado el 26/09. El técnico de sonido confesó haber borrado la cinta para encubrir el crimen; el cable de micrófono todavía húmedo fue el arma. Cumple condena, y el Estudio 3 nunca más transmitió en vivo a esa hora.'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'El Jardín de las Estatuas',
      relatorio: 'En la inauguración de la exposición al aire libre del Museo Bandeirante, el curador Heitor Prado fue encontrado caído entre las esculturas. La noche no tenía luna y el jardín estaba iluminado solo por antorchas. Nadie admite haberse acercado a él. La policía busca el arma, el lugar y el responsable.',
      pistas: ['El golpe subió de abajo hacia arriba, desde una vara larga y base pesada — algo hecho para sostener o iluminar, no para cortar ni clavar.', 'La escultura caída sufrió el impacto en la base, no presión lateral.', 'Un único par de huellas va y vuelve por el mismo camino del jardín, sin titubear en las curvas.', 'La última página del libro de rondas fue arrancada; el guardia culpa al viento.', 'La propia víctima despidió a alguien al fin del turno; esa persona salió del depósito minutos después, con una llave de reserva.'],
      armaCorreta: 'Una Antorcha de Bronce',
      localCorreto: 'El Jardín de las Estatuas',
      assassinoCorreto: 'La Restauradora',
      opcoesArma: ['Una Antorcha de Bronce', 'Un Cincel', 'Una Estatua de Mármol', 'Un Martillo de Piedra', 'Un Pedestal de Piedra'],
      opcoesLocal: ['El Jardín de las Estatuas', 'La Galería Principal', 'El Despacho del Curador', 'La Entrada del Museo', 'El Depósito de Obras'],
      opcoesAssassino: ['El Guardia Nocturno', 'La Restauradora', 'El Patrocinador', 'El Periodista de Arte', 'El Fotógrafo'],
      dicaBoaArma: 'Vara larga y base pesada, empuñada de abajo hacia arriba: cincel, estatua entera y pedestal fijo quedan fuera. Quedan dos piezas del acervo que se sostienen por la base — una de bronce, otra de piedra.',
      dicaBoaLocal: 'Galería vigilada, despacho cerrado y entrada con conserjería no explican huellas en el jardín; queda el aire libre — el espacio de las obras expuestas o el anexo de las piezas guardadas.',
      dicaBoaAssassino: 'La restauradora despedida esa tarde conocía cada estatua al tacto y sabía exactamente qué base cedía bajo el peso de una caída.',
      dicasFracas: ['La apertura al aire libre atrajo más público del previsto; las luces del jardín se encendieron al anochecer.', 'El patrocinador dio un largo discurso antes de la cena, como hace en cada estreno.', 'La linterna del guardia nocturno tiene pilas débiles desde la última inspección.', 'Las obras del anexo esperan restauración desde hace dos veranos.'],
      epilogo: 'Archivo cerrado el 27/09. La restauradora despedida confesó el golpe con la antorcha de bronce; conocía cada estatua a oscuras y arrancó la página del libro de rondas. El jardín reabrió, y la estatua esquirlada fue restaurada por otras manos.'
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'El Puente Cubierto',
      relatorio: 'El mercante Estrela do Norte atracó con un pasajero menos. El capitán Raul Vasquez fue visto por última vez en el puente de mando, en una noche de niebla densa. El cuaderno de bitácora tiene páginas mojadas y una anotación ilegible. La policía portuaria investiga el arma, el lugar y el responsable.',
      pistas: ['El impacto en la cabeza es angular, de bordes duros, y sin óxido en el punto del golpe — metal pulido, no acero de marejada.', 'El instrumento que el capitán usaba al amanecer estaba mojado por fuera y seco por dentro, como quien lo limpia a las prisas.', 'La brújula del timón apuntaba al oeste mientras el cuaderno de bitácora registraba rumbo norte.', 'El oficial que asumiría a las tres asumió a las dos y mandó callar los telégrafos.', 'Una carta datada aquel día, firmada por la víctima, fue encontrada en el cajón del segundo al mando.'],
      armaCorreta: 'Un Sextante de Latón',
      localCorreto: 'El Puente de Mando',
      assassinoCorreto: 'El Primer Oficial',
      opcoesArma: ['Un Sextante de Latón', 'Un Cable de Acero', 'Un Ancla', 'Un Machete de Cubierta', 'Un Cronómetro de Bolsillo'],
      opcoesLocal: ['El Puente de Mando', 'La Bodega de Carga', 'La Cubierta Principal', 'La Sala de Máquinas', 'El Camarote del Capitán'],
      opcoesAssassino: ['El Cocinero', 'El Primer Oficial', 'El Maquinista', 'El Práctico del Puerto', 'El Timonel'],
      dicaBoaArma: 'Borde angular y pulido, sin óxido: cable de acero, ancla y machete quedan fuera. Quedan dos instrumentos de precisión, de metal claro, que el capitán mantenía junto al timón.',
      dicaBoaLocal: 'El rumbo errado solo se corrige desde donde se ve el horizonte: bodega, cubierta y sala de máquinas quedan bajo la línea de mando. Quedan el puesto del timón y el camarote del capitán — y la brújula decide entre ellos.',
      dicaBoaAssassino: 'El primer oficial asumió el mando antes de tiempo y tenía en el cajón la propia carta de dimisión firmada por el capitán — móvil y oportunidad en el mismo camarote.',
      dicasFracas: ['La tripulación es pequeña y trabaja junta desde la ruta del Pacífico.', 'La niebla densa de aquella noche impuso velocidad reducida durante casi tres horas.', 'El cocinero se queja de la despensa apretada en cada travesía.', 'El práctico del puerto embarca solo en las últimas millas, como manda el reglamento.'],
      epilogo: 'Archivo cerrado el 28/09. El primer oficial fue preso por asumir el mando antes de la hora; la carta de dimisión en el cajón selló el móvil, y el sextante de latón era el arma. El Estrela do Norte navega bajo un nuevo capitán, y la brújula volvió al norte.'
    }
  ];

  var FALLBACK_CASOS_EN = [
    {
      id: 'caso-001',
      data: '2026-09-22',
      titulo: 'The Clock That Stopped at 23:47',
      relatorio: 'The collector Álvaro Mendes was found lifeless in his library. Every clock in the house stopped at exactly 11:47 p.m., except one. The crime scene has been preserved and four people were in the mansion that night. The police must find the weapon, the exact location, and the person responsible.',
      pistas: ['The wound was deep with rounded edges, and no blade, no cord, no handle appeared at the scene.', 'The display case holds its dust evenly, except for one clean rectangle the size of a fist.', 'The night maid saw someone leave the room of books at 11:45 p.m. and return seven minutes later, hurrying.', 'Two residents have no alibi for 11:47 p.m.; one of them had hands stained with something that only exists in one room of the house.', 'The room where the victim fell has no windows and muffles any sound; the glass of the door fogged up from the inside that night.'],
      armaCorreta: 'The Pocket Watch',
      localCorreto: 'The Library',
      assassinoCorreto: 'The Nephew',
      opcoesArma: ['The Pocket Watch', 'A Kitchen Knife', 'A Curtain Cord', 'A Bronze Candlestick', 'A Bronze Inkwell'],
      opcoesLocal: ['The Library', 'The Garden', 'The Kitchen', 'The Hallway', 'The Collector\'s Study'],
      opcoesAssassino: ['The Butler', 'The Housekeeper', 'The Daughter', 'The Nephew', 'The Family Doctor'],
      dicaBoaArma: 'Nothing that cuts, ties or burns: the knife is still on its stand, the cord on the window hook and the candlestick on the table. The object used is compact, dense and came from the collection — two metal pieces that fit in a palm remain.',
      dicaBoaLocal: 'The garden\'s soil never crossed into the house that night, the kitchen closed at 10 p.m. and the hallway was merely crossed. The crime happened in a closed room — and there are two on the upper floor.',
      dicaBoaAssassino: 'The nephew would inherit the collection if the daughter were disinherited — and the copper dust on his cuffs came from inside the display case, the same one that covered the missing object.',
      dicasFracas: ['Dinner was served at 8 p.m. and the dishes cleared without hurry, as on every night at the mansion.', 'The founder\'s portrait, on the living room wall, fogs up with September\'s humidity.', 'The housekeeper usually locks the service doors at 10 p.m. and keeps the key on the kitchen hook.', 'The family doctor is only called to the house in emergencies; it was his second visit that month.'],
      epilogo: 'File closed on 09/22. The nephew confessed to the blow with his uncle\'s pocket watch, lured by the copper dust of the display case. The daughter inherited the collection, and the library once again displays every clock — except one.'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'The Letter with No Sender',
      relatorio: 'An anonymous letter arrived at the local newspaper\'s newsroom reporting the theft of a rare jewel at the Oliveira mansion. The text was typed on an old typewriter. The safe was broken into during a dinner party and no one heard a thing. The police are investigating the weapon used, the location of the break-in, and who sent the letter.',
      pistas: ['Two parallel grooves, spaced like the arms of a claw, mark the safe\'s frame.', 'The residence\'s typewriter ribbon was replaced that week, and no one remembers who bought it.', 'One employee roamed the house all night with no set task; another, who claimed to be off duty, was recognized in the back alley at 9 p.m.', 'The residence\'s alarm stayed disarmed for exactly as long as it took to serve dessert.', 'The tip-off reached the newspaper with a postmark from the day before the theft — written by someone who knew of the crime beforehand.'],
      armaCorreta: 'A Crowbar',
      localCorreto: 'The Oliveira Mansion',
      assassinoCorreto: 'The Maid',
      opcoesArma: ['A Crowbar', 'A Typewriter', 'A Dagger', 'A Candelabrum', 'A Wrench'],
      opcoesLocal: ['The Oliveira Mansion', 'The Newspaper Newsroom', 'The Bank Vault', 'The Botanical Garden', 'The Dining Room'],
      opcoesAssassino: ['The Butler', 'The Maid', 'The Chauffeur', 'The Journalist', 'The Chef'],
      dicaBoaArma: 'The safe gave way to a lever, not to a blade nor a tabletop weight: writing tools and ornaments are out. Two steel tools from the workshop remain — and the claw\'s shape on the frame separates one from the other.',
      dicaBoaLocal: 'The changed ribbon, the disarmed alarm and the served dinner belong to the same address; newsroom, bank and garden do not gather all three. The crime stayed inside the residence, in a room used at night for entertaining.',
      dicaBoaAssassino: 'The gold button found by the safe belonged to the maid\'s uniform — and it was the maid herself who "found" it, a clue too good to be a coincidence.',
      dicasFracas: ['The jewel slept in a velvet case, inside a drawer with a false bottom.', 'The chef served dinner in three courses and left before the coffee, as the house requires.', 'The chauffeur washes the car every morning; that morning, he also waxed it.', 'The mansion has received illustrious guests since the days of the Oliverras\' grandfather.'],
      epilogo: 'File closed on 09/23. The maid fell when the gold button from her own uniform was identified by forensics; the anonymous letter was hers, written to divert suspicion. The crowbar was recovered in the garden, and the jewel returned to the safe.'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'The Laboratory Enigma',
      relatorio: 'The scientist Dr. Bastos vanished from his own laboratory on the night of the experiment. The door was locked from the inside, but the half-open window reveals something suspicious. There is no sign of forced entry, and the body was removed without leaving clear traces. The police are investigating the weapon, the location, and the person responsible for the crime.',
      pistas: ['The body has no cuts, bruises, burns or shock marks — only a strange flush on the skin and altered breath.', 'One glass container on the workbench was found empty at dawn, its seal broken and no disposal record.', 'The badge that opened the turnstile after midnight had been left behind since the end of the shift, on a colleague\'s desk.', 'The counter cup holds lipstick on one side only — and the lab\'s routine forbids drinks at the workbench.', 'The window locked itself from the inside, and the glove marks stayed on the inner frame.'],
      armaCorreta: 'A Flask of Poison',
      localCorreto: 'The Laboratory',
      assassinoCorreto: 'The Lab Assistant',
      opcoesArma: ['A Flask of Poison', 'A Glass Beaker', 'A Scalpel', 'A Wooden Club', 'A Bench Burner'],
      opcoesLocal: ['The Laboratory', 'The Parking Lot', 'The Security Room', 'The Storage Room', 'The Research Wing'],
      opcoesAssassino: ['The Assistant', 'The Lab Assistant', 'The Guard', 'The Neighboring Scientist', 'The Intern'],
      dicaBoaArma: 'With no cuts, flames or impact, the workbench arsenal loses the scalpel, the burner and the wooden club. The two glass containers that hold contents remain.',
      dicaBoaLocal: 'Soil, rain and crates do not match the scene; yard, guard post and storage are out. The air is heavy with chemistry and the glass locked from the inside — the scientific area remains, between the main room and the neighboring wing.',
      dicaBoaAssassino: 'The cup of tea with lipstick on the rim was served by someone with free access to the workbench — and only the assistant wore that shade of lipstick.',
      dicasFracas: ['The lab runs on project funding and receives imported equipment every quarter.', 'The research assistant is absent-minded; he has lost three notebooks this semester.', 'The ether smell in the corridor lingers until late on distillation days.', 'The guard did his rounds dozing off, according to his own time sheet.'],
      epilogo: 'File closed on 09/24. The assistant confessed to swapping the scientist\'s tea for the reagent from the open flask, taking advantage of the laboratory gloves. The lipstick on the cup gave her away; she is serving a sentence for premeditated homicide.'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'The Out-of-Tune Violin',
      relatorio: 'During the gala rehearsal at the Aurora Theater, the conductor Érico Salgado was found lifeless in the orchestra pit. The lights flickered, the curtain fell and, when they came back up, he was no longer breathing. The theater was full, but no one saw the blow. The police must determine the weapon, the exact location, and the person responsible.',
      pistas: ['The mark on the neck is a thin, knotless groove, the line of something pulled between two points of tension.', 'The lead instrument\'s thinner string set was replaced hours before; the luthier never came to the theater.', 'The soles of whoever moved below the orchestra floor carried dark, resinous dust.', 'The lead soloist announced she would not sing the second act and left her dressing room before the blackout.', 'The curtain came down five minutes early — just enough time to reach the lowest level and return.'],
      armaCorreta: 'A Violin String',
      localCorreto: 'The Orchestra Pit',
      assassinoCorreto: 'The Soprano',
      opcoesArma: ['A Violin String', 'A Conductor\'s Baton', 'A Lobby Candelabrum', 'A Pair of Costume Shears', 'A Violin Bow'],
      opcoesLocal: ['The Orchestra Pit', 'The Dressing Room', 'The Stage', 'The Lobby', 'The Auditorium'],
      opcoesAssassino: ['The Stagehand', 'The Soprano', 'The Lead Violinist', 'The Agent', 'The Assistant Conductor'],
      dicaBoaArma: 'The thin, unbroken groove is not born of a blunt blow or a shaft: baton, candelabrum and shears are out. The two stage wires that are tensioned between the hands remain.',
      dicaBoaLocal: 'Stage, lobby and auditorium were full of eyes that night; what remains is the level below the floor and the closed backstage — and the resinous dust decides between the two.',
      dicaBoaAssassino: 'The soprano lost the lead role the night before and swore the conductor "would not reach the third act"; the score with the torn dedication, found under the front row, was hers.',
      dicasFracas: ['The box office sold out the night before; the corridors got crowded at intermission.', 'The stagehand checks the curtains three times per performance, always trembling.', 'The stage curtains are replaced every season, by custom of the house.', 'The agent demands results at every rehearsal; the conductor answers with silence.'],
      epilogo: 'File closed on 09/25. The soprano was convicted when the snapped violin string was found to carry the conductor\'s blood; she herself cut the string and went down to the pit, following the rosin dust. The Aurora Theater reopened without her in the cast.'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'The Last Transmission',
      relatorio: 'In the early hours of Saturday, the announcer Válter Nobre interrupted the live program with a scream and was never seen again. The radio station was sealed off, and the transmission tape disappeared. The police are investigating the murder weapon, the exact location, and who erased the recording.',
      pistas: ['The groove on the neck is continuous, blade-less, left by a flexible and rough material.', 'The last sound before the scream was the click of a connector seating into the capture console.', 'The tape counter was zeroed and rewound fifteen minutes; the original reel never turned up in the archive.', 'The third-floor turnstile logs an exit at 1:05 a.m. and a return at 1:10 a.m., in the booth corridor.', 'The recording password was used ten minutes after the scream, by an audio-maintenance profile.'],
      armaCorreta: 'A Microphone Cable',
      localCorreto: 'Studio 3',
      assassinoCorreto: 'The Sound Technician',
      opcoesArma: ['A Microphone Cable', 'A Magnetic Tape', 'A Metal Lamp', 'A Stapler', 'A Pair of Headphones'],
      opcoesLocal: ['Studio 3', 'The Control Booth', 'The Parking Lot', 'The Break Room', 'The Tape Archive'],
      opcoesAssassino: ['The Rival Announcer', 'The Sound Technician', 'The Station Director', 'The Night Watchman', 'The Receptionist'],
      dicaBoaArma: 'The mark calls for something long, flexible and rough: fragile tape, tabletop weight and drawer metal are out. The two accessories operators sling over their shoulder remain.',
      dicaBoaLocal: 'Neither break room, nor yard and nor archive have a live signal: the scream was picked up live, with the click of a connector on the console. Two sound rooms remain.',
      dicaBoaAssassino: 'Whoever erased the last minutes of the tape had access to the mixing console — and the technician was the only one to touch the equipment before the police arrived.',
      dicasFracas: ['The station has been losing audience to its rival since Carnival.', 'The announcer liked controversial interviews and never wanted security on air.', 'The break room serves strong coffee at any hour; the pot rarely goes cold.', 'The watchman makes his round every two hours and never goes up to the third floor.'],
      epilogo: 'File closed on 09/26. The sound technician confessed to erasing the tape to cover up the crime; the still-damp microphone cable was the weapon. He is serving his sentence, and Studio 3 never again went live at that hour.'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'The Garden of Statues',
      relatorio: 'At the opening of the Bandeirante Museum\'s open-air exhibition, the curator Heitor Prado was found collapsed among the sculptures. The night was moonless and the garden was lit only by torches. No one admits having approached him. The police are searching for the weapon, the location, and the person responsible.',
      pistas: ['The blow rose from below, from a long shaft with a heavy base — something made to hold or to light, not to cut or to nail.', 'The fallen sculpture took the impact on its base, not lateral pressure.', 'A single pair of footprints goes out and back along the same path through the flowerbed, without hesitating at the curves.', 'The last page of the logbook was torn out; the guard blames the wind.', 'The victim herself dismissed someone at the end of the day; that person left the works storage minutes later, with a spare key.'],
      armaCorreta: 'A Bronze Torch',
      localCorreto: 'The Garden of Statues',
      assassinoCorreto: 'The Restorer',
      opcoesArma: ['A Bronze Torch', 'A Chisel', 'A Marble Statue', 'A Stone Hammer', 'A Stone Pedestal'],
      opcoesLocal: ['The Garden of Statues', 'The Main Gallery', 'The Curator\'s Office', 'The Museum Entrance', 'The Works Storage'],
      opcoesAssassino: ['The Night Guard', 'The Restorer', 'The Sponsor', 'The Art Journalist', 'The Photographer'],
      dicaBoaArma: 'Long shaft and heavy base, gripped from below: chisel, whole statue and fixed pedestal are out. Two collection pieces that are held by their base remain — one bronze, one stone.',
      dicaBoaLocal: 'Watched gallery, locked office and staffed entrance do not explain footprints in a flowerbed; the outdoors remains — the space of the displayed works or the annex of the stored pieces.',
      dicaBoaAssassino: 'The restorer fired that afternoon knew every statue by touch and knew exactly which base would give way under the weight of a fall.',
      dicasFracas: ['The open-air opening drew more visitors than expected; the garden lights were switched on at dusk.', 'The sponsor gave a long speech before dinner, as he does at every premiere.', 'The night guard\'s flashlight has had weak batteries since the last inspection.', 'The annex works have been waiting for restoration for two summers.'],
      epilogo: 'File closed on 09/27. The fired restorer confessed to the blow with the bronze torch; she knew every statue in the dark and tore out the logbook page. The garden reopened, and the chipped statue was restored by another hand.'
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'The Shrouded Bridge',
      relatorio: 'The merchant ship Estrela do Norte docked with one passenger fewer. Captain Raul Vasquez was last seen on the command bridge, on a night of dense fog. The logbook has wet pages and an illegible note. The port police are investigating the weapon, the location, and the person responsible.',
      pistas: ['The head wound is angular with hard edges, and rust-free at the point of impact — polished metal, not sea-spray steel.', 'The instrument the captain used at dawn was wet outside and dry inside, as if hastily cleaned.', 'The helm compass pointed west while the logbook recorded a northern heading.', 'The officer due to take command at three took it at two and ordered the telegraphs silenced.', 'A letter dated that day, signed by the victim, was found in the drawer of the second in command.'],
      armaCorreta: 'A Brass Sextant',
      localCorreto: 'The Command Bridge',
      assassinoCorreto: 'The First Mate',
      opcoesArma: ['A Brass Sextant', 'A Steel Cable', 'An Anchor', 'A Deck Machete', 'A Pocket Chronometer'],
      opcoesLocal: ['The Command Bridge', 'The Cargo Hold', 'The Main Deck', 'The Engine Room', 'The Captain\'s Cabin'],
      opcoesAssassino: ['The Cook', 'The First Mate', 'The Engineer', 'The Harbor Pilot', 'The Helmsman'],
      dicaBoaArma: 'Angular, polished edge, no rust: steel cable, anchor and machete are out. Two precision instruments of bright metal remain, which the captain kept by the helm.',
      dicaBoaLocal: 'The wrong heading can only be corrected from where the horizon is visible: hold, deck and engine room lie below the command line. The helm post and the captain\'s cabin remain — and the compass decides between them.',
      dicaBoaAssassino: 'The first mate took command ahead of schedule and had the captain\'s own signed resignation letter in his drawer — motive and opportunity in the same cabin.',
      dicasFracas: ['The crew is small and has worked together since the Pacific route.', 'The dense fog that night forced reduced speed for almost three hours.', 'The cook complains about the cramped pantry on every crossing.', 'The harbor pilot boards only in the last miles, as regulations require.'],
      epilogo: 'File closed on 09/28. The first mate was arrested for taking command ahead of schedule; the resignation letter in the drawer sealed the motive, and the brass sextant was the weapon. The Estrela do Norte sails under a new captain, and the compass points north again.'
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
