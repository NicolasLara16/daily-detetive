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

  // ---------- Ofuscação/dissuasão (client-side, não é criptografia forte) ----------
  function normalizeAnswer(value) {
    return String(value)
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  // cyrb53: hash de 53 bits, pure JS, sem dependências.
  function cyrb53(str, seed) {
    var h1 = 0xdeadbeef ^ (seed || 0);
    var h2 = 0x41c6ce57 ^ (seed || 0);
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  function answerHash(value) {
    return String(cyrb53(normalizeAnswer(value), 0));
  }

  function utf8Bytes(str) {
    var s = String(str);
    var out = [];
    if (typeof TextEncoder !== 'undefined') {
      var enc = new TextEncoder();
      var arr = enc.encode(s);
      for (var i = 0; i < arr.length; i++) out.push(arr[i]);
      return out;
    }
    for (var j = 0, c; j < s.length; j++) {
      c = s.charCodeAt(j);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && j + 1 < s.length) {
        var c2 = s.charCodeAt(++j);
        c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return out;
  }

  function utf8ToString(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      try {
        return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
      } catch (e) { /* usa o fallback abaixo */ }
    }
    var out = '';
    var i = 0;
    while (i < bytes.length) {
      var b = bytes[i];
      var cp;
      if (b < 0x80) {
        cp = b;
        i += 1;
      } else if ((b & 0xe0) === 0xc0) {
        cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 63);
        i += 2;
      } else if ((b & 0xf0) === 0xe0) {
        cp = ((b & 0x0f) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
        i += 3;
      } else {
        cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
        i += 4;
      }
      if (cp > 0xffff) {
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      } else {
        out += String.fromCharCode(cp);
      }
    }
    return out;
  }

  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function bytesToBase64(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var b0 = bytes[i];
      var b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      var b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
      out += B64_CHARS.charAt(b0 >> 2);
      out += B64_CHARS.charAt(((b0 & 3) << 4) | (b1 >> 4));
      out += i + 1 < bytes.length ? B64_CHARS.charAt(((b1 & 15) << 2) | (b2 >> 6)) : '=';
      out += i + 2 < bytes.length ? B64_CHARS.charAt(b2 & 63) : '=';
    }
    return out;
  }
  function base64ToBytes(b64) {
    var clean = String(b64).replace(/[^A-Za-z0-9+/=]/g, '');
    function val(ch) {
      var v = B64_CHARS.indexOf(ch);
      return v === -1 ? 0 : v;
    }
    var out = [];
    var i = 0;
    while (i + 3 < clean.length) {
      var c2 = clean.charAt(i + 2);
      var c3 = clean.charAt(i + 3);
      var n = (val(clean.charAt(i)) << 18) | (val(clean.charAt(i + 1)) << 12) | (val(c2) << 6) | val(c3);
      out.push((n >> 16) & 255);
      if (c2 !== '=') out.push((n >> 8) & 255);
      if (c3 !== '=') out.push(n & 255);
      i += 4;
    }
    return out;
  }

  function xorBytes(bytes, id) {
    var key = String(id || '');
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      var k = key.length > 0 ? key.charCodeAt(i % key.length) & 255 : 0;
      out.push(bytes[i] ^ k);
    }
    return out;
  }

  // Decodifica apenas no instante em que a mecânica precisa renderizar.
  function decodeSecret(encoded, id) {
    try {
      if (typeof encoded !== 'string' || encoded === '') return '';
      return utf8ToString(xorBytes(base64ToBytes(encoded), id));
    } catch (e) {
      return '';
    }
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
      hashArma: '4510354646250476',
      hashLocal: '7593442777482029',
      hashAssassino: '3736918178454769',
      opcoesArma: ['O Relógio de Bolso', 'Uma Faca de Cozinha', 'Uma Corda de Cortina', 'Um Castiçal de Bronze', 'Um Tinteiro de Bronze'],
      opcoesLocal: ['A Biblioteca', 'O Jardim', 'A Cozinha', 'O Corredor', 'O Escritório do Colecionador'],
      opcoesAssassino: ['O Mordomo', 'A Governanta', 'A Filha', 'O Sobrinho', 'O Médico da Família'],
      dicaBoaArma: 'LQAXDg1UVREADgEbSBwQVwoOUwBYEFNZAgwSVQ1REFcCAhJPXlVXRAZBHQANQ0VBDBMHCgEQUREADgELTBBeXkMGEgFOWF8RBwBTBUxeVV0CQRZPQhBTUBAVGqyKUVwRDQBTAkhDUR9DLlMAT1pVRQxBBhxMVF8RoMhTDEJdQFAAFRxDDVRVXxAOUwoNRlVYDEEXDg1TX10GotSsjl8Q0+P1UxxCUkJQDkEXGkxDEEEGotQOXhBUVEMMFhtMXBBAFgRTDExSVVxDDwYCTBBAUA8MEkE=',
      dicaBoaLocal: 'IkEHCl9CUREHDlMFTEJUWA5BHayOXxBBChIcGg1eUREAAAAODV5RQBYEHw4NXl9YFwRfT0wQU14ZCB0HTBBVXwAEAR1CRRDywxJTXR9YEFRDDlMMQkJCVAcOAU9LX1kRAhEWAUxDEFAXExIZSENDUAcOXU9iEFNDCgwWT0xTX18XBBAKWBBeRA5BEh9CQ1VfFw5TCUhTWFAHDlONraQQVEMJsM4NVF9YEEEdAA1RXlUCE1MLSBBTWA4AXQ==',
      dicaBoaAssassino: 'LEEAAE9CWV8LDlMHSEJUUBEIEk9MEFNeDwSwyO6TXxEAAAAADVEQVwoNGw4NVl9CEARTC0hDVUMHABcODdKwpUMEUw4NQF9UChMST0lVEFIMAwEKDVVdERAEBhwNQEVfCw4AT1tVWV5DBRxPRF5EVBEIHB0NVFERFQgHHUReVR1DAFMCSENdUEMQBgoNU19TEQgST0IQX1MJBAcADVRVQgIREh1IU1lVDE8=',
      dicasFracas: ['O jantar foi servido às 20h e a louça recolhida sem pressa, como em todas as noites da mansão.', 'O retrato do fundador, na parede da sala, embaça com a umidade de setembro.', 'A governanta costuma trancar as portas de serviço às 22h e guardar a chave no gancho da cozinha.', 'O médico da família só é chamado à casa em urgências; era a segunda visita no mês.'],
      epilogo: 'IhMCGkRGXxEGDxAKX0JRVQxBFgINAgIeU1hdT2IQQ14BExoBRV8QUgwPFQpeQ19EQw5TCEJcQFRDAhwCDV8QQwYNsNxKWV8RBwRTDUJcQ15DBRxPWVlfHUMABx1M851VDEEDCkFREEEMBBodTBBUVEMCHA1fVRBVAkEFBllCWV8GT1MuDVZZXQsAUwdIQlReFkEST05fXFSgxrDMQhwQVEMAUw1EUlxYDBUWDEwQRl4PFRwaDVEQVBsIEQZfEEReBw4AT0JDEEMGDbDcSllfQkOD8/sNXVVfDBJTGkAe'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'A Carta sem Remetente',
      relatorio: 'Uma carta anônima chegou à redação do jornal local denunciando o roubo de uma joia rara na mansão dos Oliveira. O texto foi escrito em uma máquina antiga. O cofre foi arrombado durante um jantar e ninguém ouviu nada. A polícia investiga a arma usada, o local do arrombamento e quem enviou a carta.',
      pistas: ['Dois sulcos paralelos, afastados como os braços de uma garra, marcam a moldura do cofre.', 'A fita da máquina da residência foi trocada naquela semana, e ninguém lembra quem a comprou.', 'Um funcionário circulou pela casa a noite inteira sem tarefa definida; outro, que alegava folga, foi reconhecido na rua dos fundos às 21h.', 'O alarme da residência ficou desarmado pelo tempo exato em que a sobremesa era servida.', 'A denúncia chegou ao jornal com carimbo do dia anterior ao roubo — escrita por quem sabia do crime antes dele.'],
      hashArma: '1460768263715884',
      hashLocal: '4996989984018944',
      hashAssassino: '4336910438941071',
      opcoesArma: ['Um Pé de Cabra', 'Uma Máquina de Escrever', 'Um Punhal', 'Um Candelabro', 'Uma Chave Inglesa'],
      opcoesLocal: ['A Mansão dos Oliveira', 'A Redação do Jornal', 'O Cofre do Banco', 'O Jardim Botânico', 'A Sala de Jantar'],
      opcoesAssassino: ['O Mordomo', 'A Empregada', 'O Motorista', 'O Jornalista', 'O Chef de Cozinha'],
      dicaBoaArma: 'LEEQAEtCVRIABBcKWBBREhYMEk9MXFFEAg8QDgEQXvHADlMODUVdU0MNsM1AWV5TQw8WAg1REEcOQQMKXl8QVgZBHgpeUQoSFhUWAV7znV4KDgBPSVUQVxACAQZZURBXQw4BAUxdVVwXDgBPS1lTUw5BFQBfUR4SMQQAG0xdEFYWAABPS1VCQAIMFgFZUUMSBwRTDu6XXxIHAFMAS1lTWw0AU42tpBBXQwBTCUJCXVNDBRJPSlFCQAJBHQ4NXV9eBxQBDg1DVUICExJPWF1REgcAUwBYREJTTQ==',
      dicaBoaLocal: 'IkEVBllREEYRDhAOSVEcEgxBEgNMQl1XQwUWHExCXVMHDlMKDV8QWAIPBw5fEENXERcaC0IQQFcRFRYBTlVdEgIOUwJIQ11dQwQdC0hCVfHEDkhPX1VUU6DGsMxCHBBQAg8QAA1VEFgCExcGQBBe8cAOUx1I84pcBgxTAF4QRECgywBBDX8QUREIHgoNVllRDBRTC0heREAMQRcODUJVQQoFsMVDU1lTT0EdGkAQUUIMEhYBWV8QRxAAFwAN85ASDQ4aG0gQQFMRAFMdSFNVUAYTXQ==',
      dicaBoaAssassino: 'LEERAFnzk11DBRwaX1FUXUMAEAdMVF8SCRQdG0IQUV1DAhwJX1UQQgYTBwpDU1lTQwAcT1heWVQMEx4KDVRREgYMAx1IV1FWAkGR77kQVRIFDhpPTBBAQKDSAx1EURBXDhEBCkpRVFNDEAYKQBBfEkQEHQxCXkRADBRUQw1AWUEXAFMNQlEQVgYMEgZeEEBTEQBTHEhCEFEMCB0MRFTzmA0CGg4D',
      dicasFracas: ['A joia dormia num estojo de veludo, dentro de uma gaveta com fundo falso.', 'O chef serviu o jantar em três tempos e saiu antes do café, como manda a casa.', 'O motorista lava o carro toda manhã; naquela manhã, também o encerrou.', 'A mansão recebe convidados ilustres desde os tempos do avô dos Oliveira.'],
      epilogo: 'IhMCGkRGXxIGDxAKX0JRVgxBFgINAgMdU1hdT2wQVV8TExYITFRREgAAGhoNQUVTDQUcT0IQUl0XotAADVRfRxEAFwANVF8SExOw3F1CWV1DFB0GS19CXwZBFQBEEEJXAA4dB0hTWVYMQQMKQVEQQgYTsMJOWVEJQwBTDExCRFNDAB2smV5ZXwJBFh1MEENHAk1TCl5TQlsXAFMfTEJREgcEABlEUUISEBQAH0hZRFMQT1MgDUDzm0MFFk9OUVJAAkEVAEQQQlcAFAMKX1FUXUMPHE9HUUJWCgxfT0gQURIJDhoODUZfXhcOBk9MXxBRDAcBCgM='
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'O Enigma do Laboratório',
      relatorio: 'O cientista Dr. Bastos desapareceu do próprio laboratório na noite do experimento. A porta estava trancada por dentro, mas a janela entreaberta revela algo suspeito. Não há sinal de arrombamento, e o corpo foi removido sem deixar rastros claros. A polícia investiga a arma, o local e o responsável pelo crime.',
      pistas: ['O corpo não tem cortes, contusões, queimaduras nem sinais de choque — apenas um rubor estranho na pele e o hálito alterado.', 'Um recipiente de vidro da bancada amanheceu vazio, com o lacre rompido e sem registro de descarte.', 'O crachá que abriu a catraca depois da meia-noite estava esquecido, desde o fim do expediente, na mesa de um colega.', 'A xícara no balcão guarda batom num só lado — e a rotina do setor proíbe bebidas junto à bancada.', 'A janela trancou-se por dentro, e as marcas de luvas ficaram no batente interno.'],
      hashArma: '3508179295000953',
      hashLocal: '4680699923684809',
      hashAssassino: '2695668770334240',
      opcoesArma: ['Um Frasco de Veneno', 'Uma Proveta de Vidro', 'Um Bisturi', 'Um Cabo de Madeira', 'Um Maçarico de Bancada'],
      opcoesLocal: ['O Laboratório', 'O Estacionamento', 'A Sala de Segurança', 'O Almoxarifado', 'A Ala de Pesquisa'],
      opcoesAssassino: ['O Assistente', 'A Assistente de Laboratório', 'O Segurança', 'O Cientista Vizinho', 'O Estagiário'],
      dicaBoaArma: 'MAQeT05fQkcGEl9PTlhRXgISUwBYEFleEwAQG0IcEFxDAAEcSF5RX0MFEk9PUV5QAgUST11VQlcGQREGXkRFQQpNUwJM85dSEQgQAA1VEFACAxxPSVUQXgIFFgZfUR4TMQQAG0xdEFwQQRcAREMQQQYCGh9EVV5HBhJTC0gQRloHExxPXEVVEwQUEh1JUV0TAA4dG0jzilcMTw==',
      dicaBoaLocal: 'NwQBHUwcEFALFAUODVUQUAIICw5eEF7wwA5TDEJdUloNAB5PTl9dEwxBEApD85FBCg5IT13zkUcKDl9PSkVRQQoVEk9IEFVAFw4CGkgQVloAAB5PS19CUk1BPE9MQhBDBhIST1xF854OCBAODVUQXEMXGgtfXxBHEQAdDEJFEEMME1MLSF5EQQxBke+5EENcARMST0wQ85IRBBJPTllVXRei3glEU1EfQwQdG19VEFxDExYMRF5EXEMRAQZDU1lDAg1TCg1REFIPAFMZREpZXQsAXQ==',
      dicaBoaAssassino: 'IkELrIBTUUECQRcKDVNY8MJBEABAEFJSFw4eT0NREFEMExcODVZfWkMSFh1bWVRSQxEcHQ1BRVYOQQcGQ1hREw8IBR1IEFFQBhIAAA3zkBMBAB0MTFRRE4Hh509IEEPw0EEST0xDQ1oQFRYBWVUQRhAABQ4NUUFGBg0WT1lfXRMHBFMNTERfXk0=',
      dicasFracas: ['O laboratório funciona com verba de projeto e recebe equipamento importado todo trimestre.', 'O assistente de pesquisa é distraído; já perdeu três cadernos neste semestre.', 'O éter do corredor fica no ar até tarde nos dias de destilação.', 'O segurança fazia as rodadas dormitando, segundo a própria folha de ponto.'],
      epilogo: 'IhMCGkRGXxMGDxAKX0JRVwxBFgINAgQcU1hdT2wQUUAQCAAbSF5EVkMCHAFLVUNADBRTG0hCEEcRDhAOSV8QXEMCG6yMEFRcQwIaCkNEWUAXAFMfSFxfExEEEghIXkRWQwUcT0tCUUAADlMOT1VCRwxNUw5dQl9FBggHDkNUXxMCElMDWEZRQEMFHE9BUVJcEQAHrJ5CWVxNQTxPT1FEXA5BHQ4NSPOeAAABDg1REFYNFQEKSl9FCEMEHw4NU0VeExMWT11VXlJDERwdDVhfXgoCsMJJWV8TEhQSA0RWWVACBRxB'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'O Violino Desafinado',
      relatorio: 'Durante o ensaio de gala no Teatro Aurora, o maestro Érico Salgado foi encontrado sem vida no fosso da orquestra. As luzes piscaram, a cortina caiu e, quando voltaram, ele já não respirava. O teatro estava lotado, mas ninguém viu o golpe. A polícia precisa determinar a arma, o local exato e o responsável.',
      pistas: ['A marca no pescoço é um sulco fino e sem nós, traço de algo puxado entre dois pontos de tensão.', 'A encordoação mais fina do instrumento principal foi substituída horas antes; o luthier não veio ao teatro.', 'As solas de quem circulou abaixo do piso da orquestra guardavam pó escuro e resinoso.', 'A solista do papel principal anunciou que não cantaria o segundo ato e deixou o camarim antes do apagão.', 'A cortina desceu cinco minutos antes do combinado — tempo justo para descer ao nível mais baixo e voltar.'],
      hashArma: '1887931185340030',
      hashLocal: '3162446556675620',
      hashAssassino: '836196369544970',
      opcoesArma: ['Uma Corda de Violino', 'Uma Batuta de Maestro', 'Um Candelabro do Saguão', 'Uma Tesoura de Figurino', 'Um Arco de Violino'],
      opcoesLocal: ['O Fosso da Orquestra', 'O Camarim', 'O Palco', 'O Saguão', 'A Plateia'],
      opcoesAssassino: ['O Contra-Regra', 'A Soprano', 'O Violinista Principal', 'O Empresário', 'O Maestro Assistente'],
      dicaBoaArma: 'LEEAGkFTXxQFCB0ADVUQXQ0IHRtIQkJBExUcT0Pzk1tDDxIcTlUQUAZBAQBAUl8UDQQeT0lVEFwCEgcKFxBSVRcUBw4BEFNVDQUWA0xSQltDBFMbSENfQREAUwlEU1FZQwccHUweEGYGEgcOQBBfR0MFHAZeEFZdDBJTC0IQQFUPAhxPXEVVFBAEUxtIXkNdDA8SAg1VXkARBFMOXhBd98AOAEE=',
      dicaBoaLocal: 'MwAfDEIcEEcCBgasjl8QUUMRHw5ZVVlVQxcaGUhCUVlDAhsKRF9DFAcEUwBBWF9HQw8SHlhVXFVDDxwGWVULFBAOER1MXRBbQw+wwltVXBQCAxIGVV8QUAxBAwZeXxBRQw4AT09RQ0AKBRwdSEMQUgYCGw5JX0MUgeHnT0gQXxQTosBPX1VDXQ0OAAANVFVXCgUWT0heREYGQRwcDVRfXRBP',
      dicaBoaAssassino: 'IkEAAF1CUVoMQQMKX1RVQUMOUx9MQFVYQxEBBkNTWUQCDVMBTBBG98oSAwpfURBRQwsGHUJFEEUWBFMADV1RURAVAQANF173wA5TDEVVV1URCBJPTF8QQAYTEApEQl8UAhUcSBYQURQTAAEbRERFRgJBEABAEFEUBwQXBk5RRPfQExoODUJRRwQAFw4BEFFXCwAXDg1DX1ZDAFMfX1ldUQoTEk9LWVxVT0EWHUwQVFEPAF0=',
      dicasFracas: ['A bilheteria esgotou na véspera; os corredores ficaram apertados no intervalo.', 'O contra-regra confere as cortinas três vezes por sessão, sempre tremendo.', 'As cortinas do palco são trocadas a cada temporada, por costume da casa.', 'O empresário cobra resultados em cada ensaio; o maestro responde com silêncio.'],
      epilogo: 'IhMCGkRGXxQGDxAKX0JRUAxBFgINAgUbU1hdT2wQQ1sTExIBQhBWWwpBEABDVFVaAgUST0xfEEcCAxYdDUFFUUMOUwlEXxBQBkEFBkJcWVoMQRIdX1VSUQ0VEgtCEFNVERMWCExGURQMQQAOQ1dFUUMFHE9AUVVHFxMcVA1VXFVDDBYcQFEQVwwTBwBYEFEUAA4BC0wQVRQHBAAMSEUQVQxBFQBeQ18UEwQfAA1A84dDBRZPT0JVQU1BPE95VVFAEQ5TLlhCX0YCQQEKTFJCXRZBAApAEFVYAkEdAA1VXFENAhxB'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'A Última Transmissão',
      relatorio: 'Na madrugada de sábado, o locutor Válter Nobre interrompeu o programa ao vivo com um grito e nunca mais foi visto. A estação de rádio foi isolada, e a fita da transmissão desapareceu. A polícia investiga a arma do crime, o local exato e quem apagou a gravação.',
      pistas: ['O sulco no pescoço é contínuo, sem lâmina, deixado por material flexível e áspero.', 'O último som antes do grito foi o clique de um conector encaixado na mesa de captação.', 'O contador da fita foi zerado e rebobinado quinze minutos; o carretel original nunca apareceu no arquivo.', 'A catraca do terceiro andar registra saída às 1h05 e retorno às 1h10, no corredor das cabines.', 'A senha de gravação foi usada dez minutos após o grito, por um perfil de manutenção de áudio.'],
      hashArma: '7757134305025783',
      hashLocal: '5578138777301004',
      hashAssassino: '7638819082423505',
      opcoesArma: ['Um Cabo de Microfone', 'Uma Fita Magnética', 'Um Abajur de Metal', 'Um Grampeador', 'Um Fone de Ouvido'],
      opcoesLocal: ['O Estúdio 3', 'A Cabine de Controle', 'O Estacionamento', 'A Copa', 'O Arquivo de Fitas'],
      opcoesAssassino: ['A Locutora Concorrente', 'O Técnico de Som', 'O Diretor da Rádio', 'O Vigia Noturno', 'A Recepcionista'],
      dicaBoaArma: 'IkEeDl9TURUTBBcKDVFcUgxBHwBDV18ZQwcfClXznUMGDVMKDfORRhMEAQAXEFZcFwBTCV/zkVIKDV9PXVVDWkMFFk9AVUNUQwRTAkhEUVlDBRZPSlFGUBcAUwlEU1FYQwccHUweEGcGEgcOQBBfRkMFHAZeEFFWBhIArJ5CWVoQQQIaSBBfRkMOAwpfUVRaEQQAT11VXlEWExICDV5fFQwMER1CHg==',
      dicaBoaLocal: 'LQQeT05fQFRPQR0KQBBA9sIVGgANVRBbBgxTDl9BRVwVDlMb7ppdFRAIHQ5BEF5aQwABVQ1fEFIRCAcADVZfXEMCEh9ZUVRaQwAcT1tZRlpPQRAAQBBfFQANGh5YVRBRBkEGAg1TX1sGAgcAXxBeVEMMFhxMHhBmDAMBDkAQVEACElMcTFxRRkMFFk9eX10b',
      dicaBoaAssassino: 'MhQWAg1RQFQEDgZPQkMQ9tkNBwZAX0MVDggdGllfQxUHAFMJRERRFRcIHQdMEFFWBhIAAA3zkBUOBAAODVRVFRAOHk/PsKQVBkEcT1nzmVYNCBAADVZfXEMOU6yXXllWDEEST0BVSFARQR0ADVVBQAoREgJIXkRaQwAdG0hDEFEGQRJPXV9c9s4CGg4NU1hQBAABQQ==',
      dicasFracas: ['A estação perde audiência para a concorrente desde o carnaval.', 'O locutor gostava de entrevistas polêmicas e nunca quis segurança no ar.', 'A copa serve café forte a qualquer hora; a jarra raramente esfria.', 'O vigia faz ronda a cada duas horas e nunca sobe ao terceiro andar.'],
      epilogo: 'IhMCGkRGXxUGDxAKX0JRUQxBFgINAgYaU1hdT2IQRPbKAh0GTl8QUQZBAABAEFNaDQcWHF5fRRUXBAFPTEBRUgIFHE9MEFZcFwBTH0xCURUGDxAAT0JZR0MOUwxfWV1QWEEcT05RUlpDBRZPQFlTRwwHHAFIEFFcDQUST+6KXVwHDlMJQlkQVEMAAQJMHhBwDwRTDFhdQEcGQQMKQ1EcFQZBHE9oQ0T22QUaAA0DEFsWDxAODV1RXBBBBx1MXkNYChUaGg1RXxUVCAUADfOQRBYEHw4NWF9HAk8='
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'O Jardim das Estátuas',
      relatorio: 'Na abertura da exposição ao ar livre do Museu Bandeirante, o curador Heitor Prado foi encontrado caído entre as esculturas. A noite estava sem lua e o jardim, iluminado apenas por tochas. Ninguém admite ter se aproximado dele. A polícia busca a arma, o local e o responsável.',
      pistas: ['O golpe subiu de baixo para cima, de uma haste longa e base pesada — algo feito para segurar ou iluminar, não para cortar ou pregar.', 'A escultura tombada sofreu impacto na base, não pressão lateral.', 'Um único par de pegadas vai e volta pelo mesmo caminho do canteiro, sem hesitar nas curvas.', 'A última página do livro de ronda foi arrancada; o guarda culpa o vento.', 'A própria vítima demitiu alguém no fim do expediente; essa pessoa saiu do depósito minutos depois, com uma chave de reserva.'],
      hashArma: '1146216368883471',
      hashLocal: '6903991676673804',
      hashAssassino: '109324960751634',
      opcoesArma: ['Uma Tocha de Bronze', 'Um Cinzel', 'Uma Estátua de Mármore', 'Um Martelo de Pedra', 'Um Pedestal de Pedra'],
      opcoesLocal: ['O Jardim das Estátuas', 'A Galeria Principal', 'O Escritório do Curador', 'A Entrada do Museu', 'O Depósito de Obras'],
      opcoesAssassino: ['O Segurança Noturno', 'A Restauradora', 'O Patrocinador', 'O Jornalista de Arte', 'O Fotógrafo'],
      dicaBoaArma: 'KwAAG0gQXFkNBhJPSBBSVxAEUx9IQ1FSAk1TCkBARVgLABcODVRVFgEAGhdCEEBXEQBTDERdUQxDAhoBV1VcGkMEABvukURDAkEaAVlVWUQCQRZPXVVUUxAVEgMNVllODEEVBk5RXRYFDgEOAxBiUxAVEgINVEVXEEEDCu6XUUVDBRxPTFNVRBUOUx5YVRBFBkEACkpFQlcOQQMKQVEQVAISFk/PsKQWFgwST0lVEFQRDh0VSBwQWRYVAQ4NVFUWEwQXHUwe',
      dicaBoaLocal: 'JAAfCl9ZURYVCBQGTFRRGkMEAAxfWUT10BMaAA1WVVULABcADVUQUw0VAQ5JURBVDAxTH0JCRFcRCBJPQ/OTWUMECx9BWVNXDkEDCkpRVFcQQRYCDVNRWBcEGh1CCxBFDAMBDg1fEFcRQR8GW0JVFoHh509CEFVFEwCwyEIQVFcQQRwNX1FDFgYZAwBeRFFFQw4GT0IQUVgGGRxPSVFDFhMEsMhMQxBRFgABC0xUUUVN',
      dicaBoaAssassino: 'IkEBCl5EUUMRABcAX1EQUgYMGhtEVFEWDQACGkhcURYXAAELSBBTWQ0JFgxEURBVAgUST0hDRPXCFQYODUBVWgxBBwBcRVUWBkEADk9ZURYGGRIbTF1VWBcEUx5YUVwWAQAACg1TVVIKAFMcQlIQWUMRFhxCEFRTQxQeDg1BRVMHAF0=',
      dicasFracas: ['A abertura ao ar livre atraiu mais público que o previsto; as luzes do jardim foram acesas ao anoitecer.', 'O patrocinador discursou longamente antes do jantar, como faz em toda estreia.', 'A lanterna do guarda noturno tem pilha fraca desde a última inspeção.', 'As obras do anexo aguardam restauração há dois verões.'],
      epilogo: 'IhMCGkRGXxYGDxAKX0JRUgxBFgINAgcZU1hdT2wQQlMQFRIaX1FUWREAUwtIXVlCCgUST05fXlAGEgAAWBBfFgQOHx9IEFNZDkEST1lfU14CQRcKDVJCWQ0bFlQNU19YCwQQBkwQU1cHAFMKXkTzlxcUEk9DXxBTEAIGHUIQVRYCERIIQkUQV0MRsM5KWV5XQwUcT0FZRkQMQRcKDUJfWAcAXU9iEFpXEQUaAg1CVVcBExoaARBVFgJBFhxZ85FCFgBTA0xDU1cHAFMJQlkQRAYSBw5YQlFSAkEDAF8QX0MXExJPQPOTWU0='
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'A Ponte Encoberta',
      relatorio: 'O navio mercante Estrela do Norte atracou com um passageiro a menos. O capitão Raul Vasquez foi visto por último na ponte de comando, numa noite de névoa densa. O diário de bordo tem páginas molhadas e uma anotação ilegível. A polícia portuária investiga a arma, o local e o responsável.',
      pistas: ['O impacto na cabeça é angular, de bordas duras, e sem ferrugem no ponto do golpe — metal polido, não aço de maresia.', 'O instrumento que o capitão usava ao amanhecer estava molhado por fora e seco por dentro, como quem o limpa às pressas.', 'A bússola do leme apontava para oeste enquanto o diário de bordo registrava rumo norte.', 'O oficial que assumiria às três horas assumiu às duas e mandou calar os telégrafos.', 'Uma carta datada daquele dia, assinada pela vítima, foi encontrada na gaveta do segundo no comando.'],
      hashArma: '488285770529463',
      hashLocal: '2624309119061753',
      hashAssassino: '7612278064875714',
      opcoesArma: ['Um Sextante de Latão', 'Um Cabo de Aço', 'Uma Âncora', 'Um Facão de Convés', 'Um Cronômetro de Bolso'],
      opcoesLocal: ['A Ponte de Comando', 'O Porão de Carga', 'O Convés Principal', 'A Casa de Máquinas', 'O Camarote do Capitão'],
      opcoesAssassino: ['O Cozinheiro', 'O Imediato', 'O Maquinista', 'O Prático do Porto', 'O Timoneiro'],
      dicaBoaArma: 'IQ4BC0wQUVkEFB8OXxBVFxMOHwZJURwXEAQeT0tVQkUWBhYCFxBTVgEOUwtIEFH0xA5fT+6SXlQMExJPSBBWVgCi0AANVllUAgxTCUJCURlDMxYcWVFdFwcOGhwNWV5EFxMGAkheRFgQQRcKDUBCUgAIAKyOXxwXBwRTAkhEUVtDAh8OX18cFxIUFk9CEFNWEwgHrI5fEFoCDwcGQ1hRFwkUHRtCEFFYQw0WAkge',
      dicaBoaLocal: 'LEEBGkBfEFIRExILQhBD9NBBAAoNU19FEQgUCg1UVRcMDxcKDUNVFxWi2U9CEFhYEQgJAENEVQ1DERwd7pNfG0MCHAFb85lEQwRTDExDURcHBFMC7pFBQgoPEhwNVllUAgxTDk9RWU8MQRcODVxZWQsAUwtIEFNYDgAdC0IeEGQMAwEOQBBfFxMOABtCEFRYQw0WAkgQVRcMQRIfQkNVWRcOUwtCEFNWEwgHrI5fENXj9VMKDVEQVaDbABxCXFEXBwQQBklVEFINFQEKDVVcUhBP',
      dicaBoaAssassino: 'LEEaAkhUWVYXDlMOXkNFWgoUUwANU19aAg8XAA1RXkMGElMLTBBYWBEAUwoNRFlZCwBTAUwQV1YVBAcODVEQRxGiwB9fWVEXAAABG0wQVFJDBRYCREND9MAOUw5eQ1lZAgUST11VXFhDAhIfRETzlAxBke+5EF1YFwgFDu6X85QMQRZPQkBfRRcUHQZJUVRSQw8cT0BVQ1oMQRAOQFFCWBcEXQ==',
      dicasFracas: ['A tripulação é pequena e trabalha junta desde a rota do Pacífico.', 'A névoa densa daquela noite impôs velocidade reduzida por quase três horas.', 'O cozinheiro reclama da despensa apertada em toda travessia.', 'O prático do porto embarca só nas últimas milhas, como manda o regulamento.'],
      epilogo: 'IhMCGkRGXxcGDxAKX0JRUwxBFgINAggYU1hdT2IQWVoGBRoOWV8QUQwIUx9fVUNYQwAcT0xDQ0IOCAFPQhBTWA4AHQtCEFFZFwQAT0lREF8MExJUDVEQVAITBw4NVFUXBwQeBl5D85QMQR0ODVdRQQYVEk9eVVxYFkEcT0BfRF4VDl9PSBBfFxAECxtMXkRSQwUWT0FRRPTADlMKX1EQVkMAAQJMHhB4QyQAG19VXFZDBRxPY19CQwZBHQ5bVVdWQxIcDQ1eX0EMQRAOXVlE9MAOX09IEFEXAaLJHF5fXFZDFxwDWV9FFwIOUwFCQkRSTQ=='
    },
    {
      id: 'caso-008',
      data: '2026-09-29',
      titulo: 'O Coche do Meia-Noite',
      relatorio: 'O trem noturno da linha Central parou numa estação de passagem quando o comissário Octávio Braga foi encontrado sem vida entre as mesas postas de um dos vagões. A névoa cobria a composição e ninguém pode ter descido sem registro. A polícia investiga a arma, o local exato e o responsável.',
      pistas: ['O golpe desceu de cima, de um metal longo e de cabo revestido — sem lâmina, vidro ou couro.', 'A mesa do vagão de refeições estava posta para dois, mas só uma xícara foi usada.', 'O caderno de bordo registra a última conferência de passagens às 23h20 — e a assinatura que a segue é de quem conferiu depois do comissário.', 'As gotas de névoa no piso encerado param exatamente onde a toalha da mesa segue posta.', 'O suporte de ferramentas do trem guarda o contorno de pó de uma peça longa que não repousa mais nele.'],
      hashArma: '630853847364809',
      hashLocal: '3359121168346756',
      hashAssassino: '3515919641533249',
      opcoesArma: ['Uma Chave de Rodas', 'Um Martelo de Emergência', 'Um Cinzel de Gravação', 'Uma Garrafa de Champanhe', 'Um Cinto de Couro'],
      opcoesLocal: ['O Carro-Restaurante', 'O Coche-Dormitório', 'O Corredor de Serviço', 'O Freio do Último Vagão', 'O Vagão de Bagagens'],
      opcoesAssassino: ['O Maquinista', 'O Chef do Trem', 'O Fiscal de Bilhetes', 'A Passageira do Assento 14', 'O Bombeiro de Bordo'],
      dicaBoaArma: 'LQQeT1tZVEoMTVMBSF0QWwwUAQABEF5dDkEbDl5EVRgAFAEbTBBUXUMXGgtfUVNdChMcT0hIQFQKAhICDV8QXwwNAwoXEFdZERMSCUwcEFsKDwcADVUQVQITBwpBXxBcBkEWAkhCV/vJDxAGTBBWUQAAHk9LX0JZTUEhCl5EUVVDAABPSUVRS0MHFh1fUV1dDRUSHA1UVRgOBAcOQRBcVw0GHE9JXxBMEQQeT8+wpBgGQRxPTl9eTAwTHQANVFUYE6LAT0NfEEsWERwdWVUQXRACHANFVRBdDRUBCg1VXFkQTw==',
      dicaBoaLocal: 'Jw4BAkRE84sRCBxDDVNfShEEFwBfEFRdQxIWHVtZ858MQRZPTlFZQAJBFwoNVkJdCg5TAe6TXxgXotkCDURfWQ8JEk9dX0NMAlpTHEJSQlkOQRxPQUVXWRFBHAFJVRBZEEEeDkFRQxgEFBIdSVFdGAZBEh5YVVxdQw4dC0gQURgTExIbTBBSSgoNGw4N85AYDgQADg3SsKxDBFMOXhBXVxcAAE9JVRBWoMgFAEwQXldDERocQhBVSwAOHwdIXRBdDRUBCg1fQxgHDhocAw==',
      dicaBoaAssassino: 'LEEVBl5TUVRDBRZPT1lcUAYVFhwNU19WBQQBBlgQXxgAABcKX15fGAcEUw1CQlRXQ6LTHA0CA1BRUVMKDVNZSgAUHwBYEENXGQgdB0IQVVYXExZPQkMQTgIGsNpIQxBZQw8cBllVEEwMBRJPz7CkGA0IHQhY85lVQwwSBl4QRFENCRJPXVFDSwZBHwZbQlUW',
      dicasFracas: ['A névoa da serra acompanhou o trem desde o último túnel.', 'A cozinha de bordo encerra às 23h, como manda o regimento da linha.', 'A buzina de cruzamento soa três vezes antes de cada ponte.', 'O cheiro de café mistura-se ao carvão nos corredores entre vagões.'],
      epilogo: 'IhMCGkRGXxgGDxAKX0JRXAxBFgINAgkXU1hdT2IQVlEQAhIDDVNfVgUEABxCRRBXQwYcA11VEFsMDFMODVNYWRUEUwtIEEJXBwAAT0lfEEwRBB5DDV5RGA4EAA4NQUVdQwQfCg1dVUsODlMfX1VAWREAAQ4WEF8YAAAXCl9eXxgHBFMNQkJUV0MTFghEQ0RKDBRTAA1YX0qgwAEGQhBUWUMCHAFLWUNLoMIcQQ1/EEwRAB0cXV9CTAZBHQBZRUJWDEEACkpFWU1DFxoOSlVdGBAOEU9CRURKDEEQHUxTWPvCTw=='
    },
    {
      id: 'caso-009',
      data: '2026-09-30',
      titulo: 'O Trampolim Silencioso',
      relatorio: 'Depois da última sessão do Circo Astreia, o dono Horácio Pepê foi encontrado sem vida sob a lona da arena. As luzes apagaram cedo e a plateia já tinha ido embora. A polícia investiga a arma, o local exato e o responsável.',
      pistas: ['O golpe desceu de uma esfera lisa e pesada — sem lâmina, fio ou cabo.', 'O peso esférico do ato de força amanheceu fora do pedestal, com um risco escuro no metal.', 'A serragem aderiu às solas de um dos presentes; os sapatos de couro fino de outro seguiam limpos.', 'Quem ensaiava às escondidas não foi visto no palco oficial naquele intervalo de quinze minutos.', 'A cortina do fundo abriu às 22h15, quinze minutos antes de o corpo ser encontrado.'],
      hashArma: '8407615842859553',
      hashLocal: '711549136237411',
      hashAssassino: '2024051561114320',
      opcoesArma: ['Uma Bola de Ferro', 'Um Chicote de Sela', 'Um Punhal de Palco', 'Um Sino de Latão', 'Uma Corda de Trapézio'],
      opcoesLocal: ['O Picadeiro', 'O Camarim Principal', 'O Vagão do Financeiro', 'A Pista de Treino', 'A Tenda de Refeições'],
      opcoesAssassino: ['O Palhaço', 'A Equilibrista', 'O Domador', 'O Mágico', 'O Gerente da Temporada'],
      dicaBoaArma: 'LEEUAEFAVRkHBAAMSBBUXEMEAAlIQlEZDwgADg1VEEkGEhILTBwQSgYMUwPukl1QDQBfT0tZXxkMFFMMTFJfA0MCGwZOX0RcT0EDGkNYUVVDBFMMQkJUWEMHGgxMXRBfDBMSQQ1iVUoXAB5PQkMQXQwIAE9CUlpcFw4AT19VVFYNBRwcDVRRGQITFgFMENK590EWT0IQQlAQAhxPSENTTBEOUwFCEF1cFwAfT0hDU1YPCRZPSF5ESwZBFgNIQx4=',
      dicaBoaLocal: 'IAAeDl9ZXRVDFxII7pNfGQZBBwpDVFEZF6LZAg1EVUoXBB4aQ1hRSkMOBk9OWPOaDEEXCg1dUV0GCAEOFhBRSkMSFh1fUVdcDRJTAUxDEEoMDRIcDVFAVg0VEgINQFFLAkEST0xCVVcCQZHvuRBVVxcTFk9CEFP6zhMQGkFfEF0GQRYXRFJZ+sSi0AANVRBWQwQAG19RVFZDBRZPWUJVUA0OAEE=',
      dicaBoaAssassino: 'LEEerIxXWVoMQQAaQFlFGRMOAU9cRVlXGQRTAkReRU0MElMBQhBdXAoOUwtIEENcFkEdrJddVUsMQZHvuRBfGRcEHh9CEFVBAhUcT0heREsGQRJPTFJVSxcUAQ4NVFEZAA4BG0ReURkHDlMJWF5UVkMEUwANU19LEw5THEhCEFwNAhwBWUJRXQxP',
      dicasFracas: ['A plateia saiu cedo; a lona ainda guarda o eco da última apresentação.', 'A serragem da arena é trocada a cada dois dias, por costume da trupe.', 'O gerador do circo treme a cada meia hora, e as luzes piscam junto.', 'O vento de setembro levanta as lonas nos cantos que não são amarrados.'],
      epilogo: 'IhMCGkRGXxkGDxAKX0JRXQxBFgINAwAWU1hdT2IQXfrCBhoMQhBTVg0HFhxeX0UZDEEUAEFAVRkADh5PTBBSVg8AUwtIEFZcERMcT0lfEFgXDlMLSBBWVhGi1A4BEFVKAA4dC0RUXxkNDlMfX/ODSREIHE9D84pUBhMcT0lVEFgTAAEG7pfzjAYSSE9CEFNQEQIcT15VV0wKFFMbSF1AVhEAFw4NQ1VUQw5TG19FQUwGQRcODVFFSqDLHQxEUR4='
    },
    {
      id: 'caso-010',
      data: '2026-10-01',
      titulo: 'A Mesa Vinte e Um',
      relatorio: 'No cassino Palácio de Cristal, o gerente Basílio Quadros foi encontrado sem vida após o fechamento, junto às mesas encobertas por panos. As fichas estavam em ordem aparente e três pessoas circulavam no prédio. A polícia investiga a arma, o local e o responsável.',
      pistas: ['O golpe na têmpora veio de um objeto curto, liso e maciço, sem borda cortante nem cabo longo.', 'A caixa de ferramentas da casa amanheceu com uma peça a menos; o feltro da tampa guarda o desenho do que saiu.', 'As fichas da última mesa fechada foram contadas duas vezes; a segunda contagem registrou trezentas a menos.', 'O sinal do cofre disparou às 2h10, mas a porta seguiu trancada por dentro.', 'Quem circulou após a última rodada usava o crachá verde do caixa — cor que só dois setores do cassino carregam.'],
      hashArma: '2543225238836694',
      hashLocal: '8339185916537789',
      hashAssassino: '2280628126081309',
      opcoesArma: ['Um Soco Inglês de Níquel', 'Um Cinzel de Cofre', 'Um Cetro de Latão', 'Uma Corda de Veludo', 'Uma Lima de Aço'],
      opcoesLocal: ['A Mesa Vinte e Um', 'O Cofre das Fichas', 'O Camarim de Artistas', 'A Portaria do Cassino', 'O Salão de Espera'],
      opcoesAssassino: ['O Dealer Noturno', 'A Cantora do Bar', 'O Vigia do Pátio', 'O Barman', 'A Supervisora de Fichas'],
      dicaBoaArma: 'LEEUAEFAVBCgyFMMWEJFX09BFwoNQEReCw5TCUhTWVEHDlMKDUNUXUMCHB1ZVQsQAAgdFUhcEVQGQRAAS0JUHEMCHB1JURFUBkEFCkFFVV9DBFMDRF1QEAcEUw7ul14QBQgQDkAQV18RAF1Pf1VCRAIMUwANQURVQxIWT1tVQkQGQR0ODV3ykwxBFk9CEEBFBkEACg1VXEAWDxsODVVcEAsAABtIEFJFERUSQQ==',
      dicaBoaLocal: 'LEEQAEtCVBAQBBQaREURRBEAHQxMVF4QBkEST11fQ0QCExoODV7ykwxBAQpKWUJEEQ4GT11RQkMCBhYCFhBeEAAAHg5fWVwQBhIHDltREUYCGxoADVURWQ8UHgZDUVVfTUEgAE9CUF1DBQYOXhBCUQ8AAE9JVRFaDAYcT8+wpRAGQRJPTl9fRAIGFgINVERADwBTC0xDEVYKAhsOXhBVVQAIFwoNVV9EEQRTCkFRQh4=',
      dicaBoaAssassino: 'IkEAGl1VQ0YKEhwdTBBVVUMHGgxFUUIQBQQJT0wQQlUEFB0LTBBSXw0VEghIXRFVQwISHV9VVlFDDlMMX1FSWKDAUxlIQlVVQ4Pz+w1WXllDBB8ODVER89kNBwZAURFRQxIWHQ1GWEMXAFMFWF5FX0Oi009AVUJRQwQdDEJSVEIXAF0=',
      dicasFracas: ['O cassino fecha às 2h, como manda a licença da cidade.', 'As fichas azuis valem o que a casa decide naquela noite.', 'O tapete do salão abafa qualquer passo apressado.', 'O ar-condicionado do salão falha nas madrugadas de calor.'],
      epilogo: 'IhMCGkRGXhAGDxAKX0JQVAxBFgINAAAfUlFdT2wQQkUTBAEZRENeQgJBEABDVlRDEA4GT0IQVl8PERZPTl9cEAxBAABOXxFZDQYfrIdDEVQMQRAHTEZUWREOUwoNXxFUBhIFBkIQVVVDFQEKV1VfRAISUwlEU1lREFpTAA1TXlYRBFMBWF5SUUMHHAYNUVNVERUcQQ1xEV0GEhJPW1lfRAZBFk9YXRFWCgIcGg1WVFMLABcODUBeQkMUHk9A85tDT0EWT0IQYVEPotIMRF8RVAZBMB1EQ0VRD0EHHUJTXkVDAFMcWEBUQhUIAKyOXx8='
    },
    {
      id: 'caso-011',
      data: '2026-10-02',
      titulo: 'O Códice Rasgado',
      relatorio: 'Na Biblioteca Pública Central, a arquivista Lívia Cantos foi encontrada sem vida atrás da grade de ferro que protege a ala mais valiosa do acervo. O prédio estava trancado desde as 19h. A polícia investiga a arma, o local exato e a responsável.',
      pistas: ['A marca no pescoço é um sulco duplo e interrompido, com pequenas marcas quadradas em intervalos regulares.', 'O caderno de visitas registra duas entradas na sala trancada depois das 19h — e só uma saída.', 'A grade de ferro da ala rara só abre com duas chaves: a do zelador e a da direção.', 'O feltro da bancada de restauração guarda o desenho de pó de uma peça que não repousa mais nele.', 'O cheiro de cola e couro tomava o corredor dos fundos naquela noite — onde o acervo espera recuperação.'],
      hashArma: '5490935168495330',
      hashLocal: '6984889589459940',
      hashAssassino: '4061044527823804',
      opcoesArma: ['Uma Corrente de Arquivo', 'Um Castiçal de Leitura', 'Um Cinzel de Encadernação', 'Um Peso de Papel de Bronze', 'Uma Tesoura de Arquivo'],
      opcoesLocal: ['A Sala de Obras Raras', 'O Corredor de Periódicos', 'O Balcão de Empréstimos', 'O Depósito de Acervo', 'O Jardim de Leitura'],
      opcoesAssassino: ['O Bibliotecário Noturno', 'A Pesquisadora Visitante', 'O Zelador', 'A Encadernadora', 'O Estagiário de Arquivo'],
      dicaBoaArma: 'LEEAGkFTXhGgyFMLWEBdXkMEUwZDRFRDEQ4eH0RUXh1DAhwCDV1QQwAAAE9cRVBVEQAXDl4QVFxDCB0bSEJHUA8OAFUNXPKTDggdDgEQQV4NFRJPTkVDRQJBFk9dVUJeQwwSDETzll5DD7DMQhBVVBAEHQdMXRFYEBIcQQ12WFICDFMJQkJQEQAIHRVIXB0REwQAAA1UVBETAAMKQRBUERcEAABYQlARgeHnT19VQkUCDFMAXhBVXgoSUwJIRFBYEEECGkgQQVQNBQYdTF0RVEMRFhxMXR8=',
      dicaBoaLocal: 'MwQBBu6DVVgADgBPSF1BWA8JEgtCQx0RAAAaF0xDEVUGQRcKXfOCQgoVHE9IEFBDQw0aGV9VEV+gwhxPSEhBXQoCEgINURFWEQAXCg1EQ1ANAhILTAsRQgwDAQ5AEFARAg0ST0BRWEJDAxYCDVdEUBEFEgtMEFQRDEERDkFT8pIMQRcKDUNQ8s4FEhwN0rGlQwRTAA1TUFUGEx0ADVRUERUIAAZZUUIRBwQQBklVHw==',
      dicaBoaAssassino: 'IkEWAU5RVVQRDxILQkJQEQYTEk9MEPKLDQgQDg1TXlxDCxwdQ1FVUEMEABtIXlVYBwBTAUxBRFQPAFMBQllFVEOD8/sNVRFCBhRTAUJdVB1DExocTlFVXkMAUwPukUFYEE1TDEJeQkUCQR0ADVNQVQYTHQANVFQRFQgABllRQhEHAFMcTFxQERcTEgFOUVVQTQ==',
      dicasFracas: ['As lâmpadas da ala rara têm luz âmbar, por proteção dos papéis.', 'O cheiro de cola e couro toma o corredor dos fundos nos dias de recuperação.', 'O relógio do hall atrasa dois minutos por semana, e ninguém o conserta.', 'No verão, o jardim de leitura enche de estudantes até o crepúsculo.'],
      epilogo: 'IhMCGkRGXhEGDxAKX0JQVQxBFgINAAMeUlFdT2wQVF8AABcKX15QVQwTEk9OX19XBhIAAFgQXhEEDh8fSBBSXg5BEk9OX0NDBg8HCg1UXhECAhYdW18dEQ4OBQZJURFBBg0cT07zglUKAhZPXEVUEQ0UHQxMEFJZBgYcGg3zkUJDEgYOXhBc8sAOAFQNXxFDBgYaHFlCXhEHBFMZRENYRQISUwHuk14RDgQdG0geEXBDEhIDTBBVVEMOER1MQxFDAhMSHA1CVFABExoaDVNeXEMCsM1AVUNQEEEdAFtRQh8='
    },
    {
      id: 'caso-012',
      data: '2026-10-03',
      titulo: 'O Silêncio do Silo',
      relatorio: 'Na fazenda Boa Vista, o capataz Firmino Dutra foi encontrado sem vida ao amanhecer, no fundo da propriedade. O gado berrava desde as 4h e ninguém da casa grande ouviu nada. A polícia investiga a arma, o local exato e o responsável.',
      pistas: ['A pele guarda três perfurações paralelas, igualmente espaçadas — como as pontas de uma mesma ferramenta.', 'O gancho do galpão, onde a ferramenta de campo costuma repousar, amanheceu vazio; o pó desenhou seu contorno.', 'As solas de quem esteve no fundo da propriedade guardavam milho do tanque; a ordenha foi lavada e o curral, revirado.', 'O gado berrava desde as 4h; dois dos presentes só apareceram depois do sol nascente.', 'A porta do quarto mais novo do alojamento não saiu do trinco naquela noite — apesar de as botas de seu ocupante amanhecerem molhadas de orvalho.'],
      hashArma: '226964733753907',
      hashLocal: '8957962219928161',
      hashAssassino: '3472385433675912',
      opcoesArma: ['Um Garfo de Feno', 'Um Machado de Lenha', 'Um Cabo de Arado', 'Um Chicote de Couro', 'Um Martelo de Ferrador'],
      opcoesLocal: ['O Silo de Grãos', 'A Sala de Ordenha', 'O Curral do Gado', 'A Casa do Capataz', 'O Galpão de Máquinas'],
      opcoesAssassino: ['O Peão Recém-Chegado', 'A Filha do Fazendeiro', 'O Veterinário', 'A Cozinheira da Fazenda', 'O Comprador de Gado'],
      dicaBoaArma: 'NxOwxV4QQV0NFRIcDUBQQAINFgNMQxFcoMIcT0NRQlEGDFMLSBBd8cEMGgFMHBFRCwgQAFlVEV0WQR4OX0RUXgxbUwJMU1lTBw5TC0gQXVcNCRJDDVNZWwAOBwoNVFQSAA4GHUIQVBIOAAEbSFxeEgcEUwlIQkNTBw4BT0tZUlMOQRUAX1EfEjEEABtMXRFTEEEXGkxDEVQGEwEOQFVfRgISUwtIEFJTDhEcT0lfEVUCDQOsjl8R0OP1UwoNXxFVAg8QB0IQR1MZCBxPSENSXQ8JFkE=',
      dicaBoaLocal: 'LBMXCkNYUBIPAAUOSVEdEgAUAR1MXBFABhcaHUxUXhIGQRAOXlERVgxBEA5dUUVTGUEaAVlRUkYCQR2sjl8RVxsRHwZOUVwSDEEeBkFYXhINAABPXl9dUxBaUxxCUkNTQw5TCVheVV1DBRJPXUJeQhEIFgtMVFQSgeHnT0heRUAGQRxPWVFfQxYEUwtIEFZAoMIcHA1VEV1DABEdRFdeEgcAAE9A85BDFggdDl4e',
      dicaBoaAssassino: 'LEEDCu6TXhIRBBCshF0cUQsEFA5JXxFYFhMcGg1UXkAOCAFPQ19CEgUUHQtCQx0SDgAAT0xDEVAMFRIcDVRUXgZBEgJMXllXAAQBDkAQXF0PCRILTEMRVgZBHB1bUV1aDEGR77kQVBIAAAEdSFdQVgISUwtIEFxbDwkcT0lfEUYCDwIaSB4=',
      dicasFracas: ['A seca deste ano queimou o pasto mais cedo que o previsto.', 'O café da fazenda é servido antes do sol, com o fogo aceso desde a véspera.', 'Os cães do curral latem a cada carro que entra pela estrada de terra.', 'O milho da safra anterior ainda guarda cheiro de sol.'],
      epilogo: 'IhMCGkRGXhIGDxAKX0JQVgxBFgINAAIdUlFdT2IQQVegwhxPX1VS8coMXgxFVVZTBw5TDEJeV1cQEhwaDV8RVQwNAwoNU15fQw5TCExCV11DBRZPS1VfXU9BEgANXFBWDEEXAA1DWF4MWlMOXhBTXRcAAE9AX11aAgUSHA1UVBIMEwUOQVheEgxBFgFZQlRVAhMSAgMQcBIFAAkKQ1RQEhMAABxCRRFTQwcWDEVRQxIMQRIDQlpQXwYPBwANVF5BQwcGAUlfQhKgwVMMRVFHV00='
    },
    {
      id: 'caso-013',
      data: '2026-10-04',
      titulo: 'A Luz que Falhou',
      relatorio: 'O farol de Pedra Branca viveu sua primeira noite escura em quarenta anos: o faroleiro Artur Sem-Ramalho foi encontrado sem vida no alto da torre, e a luz principal segue apagada. A polícia investiga a arma, o local exato e o responsável.',
      pistas: ['O golpe na cabeça veio de um metal claro e liso, sem ferrugem e sem borda cortante.', 'O feltro da caixa de ferragens da torre guarda o contorno de uma peça de cabo curto e cabeça cilíndrica que não repousa mais nele.', 'O mecanismo que fazia a luz girar amanheceu engraxado, mesmo com a luz falhada.', 'As pegadas na escada da torre contam duas subidas naquela noite; só a segunda descida carrega óleo pesado nos degraus.', 'O rádio registrou três chamadas à meia-noite, todas respondidas pela mesma voz de bordo.'],
      hashArma: '5576412605751417',
      hashLocal: '3115747241532373',
      hashAssassino: '3676730934219233',
      opcoesArma: ['Um Martelo de Latão', 'Um Cabo de Ferro', 'Um Espelho de Sinalização', 'Uma Chave de Válvula', 'Uma Lanterna de Bordo'],
      opcoesLocal: ['O Salão da Lente', 'A Sala das Baterias', 'O Mirante das Guarnições', 'A Cozinha da Guarnição', 'O Depósito de Óleo'],
      opcoesAssassino: ['O Ajudante de Farol', 'O Barqueiro de Suprimentos', 'A Esposa do Faroleiro', 'O Rádio-Operador', 'O Cozinheiro da Guarnição'],
      dicaBoaArma: 'LgQHDkEQUl8CExxPSBBdWhAOX09eVVwTAQ4BC0wQUlwRFRIBWVURXQYMUxlEVENcWUEQDk9fEVcGQRUKX0JeH0MEAB9IXFlcQwUWT15ZX1IPCAkO7pfykAxBFk9BUV9HBhMdDg1UVBMBDgELQhBXWgAAHk9LX0NSTUEhCl5EUF5DAABPSUVQQEMHFh1fUVxWDRUSHA1UVBMPAAesjl8RVwJBEA5ESFATBwBTG0JCQ1ZN',
      dicaBoaLocal: 'LEEFCkNEXhMHDlMCREJQXRcEUwoNXxFXBhGw3F5ZRVxDBRZP7oNdVgxBFQZOUVwTBQ4BDg1UXhMACAEMWFlFXEMIHRtIQl9cWEEAAE9CUF5DBRwGXhBDVgAIHRtCQxFdDEESA1lfEVcCQQcAX0JUE4Hh509CEFVSQxMcG0zzlvDADlMLTBBdRhlBFk9CEFVSEEERDllVQ1oCEl1PbBBWQQIZEk9DX0ITBwQUHUxFQhMHBBAGSVUf',
      dicaBoaAssassino: 'LEESBVhUUF0XBFMLSBBXUhEOH09IXlZBAhkcGg1fEV4GAhIBRENcXEMFEk9BRUsTDQACGkhcUBMNDhobSBBUEwYSBw5bURFADBsaAUVfEV0MQRIDWV8RVwJBBwBfQlQTEhQSAUlfEVJDDQYVDVZQXwsOBkE=',
      dicasFracas: ['A sirene da névoa soou sem parar da meia-noite ao amanhecer.', 'A escada da torre tem cento e oitenta degraus, todos gastos no centro.', 'O óleo da rotação é trocado a cada lua cheia, como manda o manual.', 'A barca de suprimentos só regressa na próxima maré cheia.'],
      epilogo: 'IhMCGkRGXhMGDxAKX0JQVwxBFgINAAUcUlFdT2IQUFkWBRIBWVURVwZBFQ5fX10TAA4dCUhDQlwWQRxPSl9dQwZBEABAEF4TDgABG0hcXhMHBFMDTETykAxBFk9MEFdSDwkST0tfQ/DEABcODV5QEw8UCVQNYFRXEQBTLV9RX1ACQQUAQUReRkMAUwhEQlBBQw8ST0BRVUEWBhILTBBCVgQUGgFZVR8TIkEHAF9CVBMEAB0HQkURQAYGBgFJXxFDDwAdG+6TXhMGQQMAX0RQQEMCHAINRENaDQIcQQ=='
    },
    {
      id: 'caso-014',
      data: '2026-10-05',
      titulo: 'A Tese Perdida',
      relatorio: 'No Instituto Vasconcelos de Pesquisas, o professor Donato Vaz foi encontrado sem vida na ala de criação, na madrugada que antecedia a defesa de sua tese final. O prédio estava trancado desde as 22h. A polícia investiga a arma, o local exato e o responsável.',
      pistas: ['A ferida é um único ponto profundo, de ponta fina e afilada — nada de lâmina larga, fio ou peso.', 'O estojo de desenho amanheceu com uma ponta de metal a menos; o feltro guarda o contorno da peça que saiu.', 'O prédio trancou às 22h, mas a catraca do bloco C registrou um cartão de estudante depois disso.', 'A tese final do professor tinha um único contestante — e a defesa estava marcada para a manhã seguinte.', 'O gesso nas solas de alguém marca o caminho do bloco C até a ala de criação, cujas portas internas amanheceram destrancadas.'],
      hashArma: '7432439222506006',
      hashLocal: '1966407984088171',
      hashAssassino: '1976703667526753',
      opcoesArma: ['Um Compasso de Aço', 'Um Prelo de Imprensa', 'Um Frasco de Reagente', 'Uma Régua de Ferro', 'Um Xilógrafo de Bancada'],
      opcoesLocal: ['O Ateliê de Esculturas', 'O Anfiteatro do Bloco C', 'A Sala dos Professores', 'O Laboratório de Estudos', 'A Biblioteca do Departamento'],
      opcoesAssassino: ['O Aluno-Opositor', 'A Secretária do Instituto', 'O Zelador do Bloco', 'O Colega de Cadeira', 'O Reitor'],
      dicaBoaArma: 'IkEDAENEUBQFCB0ODVURRBEOFRpDVFAUBwgAH0heQlVDBwEOXlNeGEMRAQpBXxFRQxOwxkpFUBQRDh4NTAoRRgYSBw5AEF5HQwUcBl4QWFoQFQEaQFVfQAwSUwtIEEFbDRUST0lREVYCDxAOSVERUAZBFwpeVV9cDE8=',
      dicaBoaLocal: 'IkEADkFREVAMElMfX19XURASHB1IQxFABgxTHUhXWEcXExxPSVURUgYCGw5AVV9ADE1TDg1SWFYPCBwbSFNQFA2i0AANQlRTChIHHUJFEVgGCAcaX1ERUUMOUw5DVlhABgAHHUIQUFkCDxsKTlVEFAAOHk9MQxFXAgUWBl9RQhQGDFMAX1RUWVhBAABPQlBZQwBTDkFREVAGQRAdRFHyk6DCHE/PsKUUDEEWHF1R8pMMQRcOXhBeVhEAAE9CRRFbQw0SDUJCUECg0gEGQhBHXRkIHQdCHg==',
      dicaBoaAssassino: 'LEESA1heXhkMERwcREReRkMVGgFFURFAFgUcT0wQQVERBRYdDV5QFAcEFQpeURFQAkEeDkNY8pdDEhYIWFlfQAZBke+5EFQUEAQGT05RQ0CgwhxPS19YFAxBsNVDWVJbQwBTDk9CWEZDAFMMTERDVQAAUwtIQF5dEEEXAA1EQ1UNAhICSF5FW00=',
      dicasFracas: ['O instituto fecha às 22h e reabre às 6h, como manda a portaria.', 'O cheiro de gesso e tinta toma o corredor da ala de criação.', 'Os avisos da defesa de teses cobrem os murais há uma semana.', 'O ar-condicionado do bloco C falha nas noites de calor.'],
      epilogo: 'IhMCGkRGXhQGDxAKX0JQUAxBFgINAAQbUlFdT2IQUFgWDxxCQkBeRwoVHB0NU15aBQQAHEJFEVtDBhwDXVURVwwMUwANU15ZEwAAHEIQVVFDALDIQhwRXAwTEhwNUV9ABhJTC0wQVVEFBAAODUFEUUMAUxtIQ1QUBw5TH19fV1EQEhwdDVlcRAYFGh1EUQoUDEESG0hcWPfJQRcKDVVCVxYNBxpfUUIUBAAdB0JFEUARCB0MQhBfWxUOXU9sEFNVDQIST19VUlsNEhoLSEJeQUMOUwxMXFRaB6LSHURfEVAGQRcKS1VCVRBP'
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
      hashArma: '7094629407894840',
      hashLocal: '5073408193568068',
      hashAssassino: '1238161784453240',
      opcoesArma: ['El Reloj de Bolsillo', 'Un Cuchillo de Cocina', 'Una Cuerda de Cortina', 'Un Candelero de Bronce', 'Un Tintero de Bronce'],
      opcoesLocal: ['La Biblioteca', 'El Jardín', 'La Cocina', 'El Pasillo', 'El Despacho del Coleccionista'],
      opcoesAssassino: ['El Mayordomo', 'La Gobernanta', 'La Hija', 'El Sobrino', 'El Médico de la Familia'],
      dicaBoaArma: 'LQAXDg1UVREADgEbSBwQWQoNHE9DWRBdDwAeDhcQVV1DAgYMRVlcXQxBAAZKRVURBg9THFgQQ14TDgEbSBwQXQJBEBpIQlRQQwQdT0hcEFYCDxAHQhBUVEMNEk9bVV5FAg8ST1QQVV1DAhIBSVVcVBEOUwpDEFxQQwwWHEweEHQPQRwNR1VEXkMUAA5JXxBUEEEQAEBAUVIXDl9PSVVeQgxBCk9bWV5eQwUWT0FREFIMDRYMTlnzgg1Bke+5EEFEBgUSAQ1UX0JDERoKV1FDEQcEUwJIRFFdQxAGCg1TUVMGD1MKQxBFXwJBAw5BXVEf',
      dicaBoaLocal: 'LwBTG0RVQkMCQRcKQRBaUBEFsMJDEF5eQxEaHO6DEF0CQRAOXlEQUBIUFgNBURBfDAIbCgEQXFBDAhwMRF5REQAEAR3ugxBQQw0SHA0CAllDGFMKQRBAUBAIHwNCEFZEBkEAAEFfEFAXExIZSENRVQxPUypBEFNDCgwWAQ1fU0QRExqsnhBVX0MUHQ4NVUNFAg8QBkwQU1QRExILTBDSsfdBCk9FUUkRBw4AT0heEFQPQQMGXl8QVQZBEh1fWVJQTQ==',
      dicaBoaAssassino: 'Jg1THEJSQlgNDlMHSEJVVQITsMJMEFxQQwIcA0hTU1ig0h1PXlkQXQJBGwZHURBXFgQBDg1UVUILBAEKSVFUUEOD8/sNSRBUD0EDAEFGXxEHBFMMQlJCVEMEHU9eRUMRExSw3kJDEEcKDxxPSVVcEQoPBwpfWV9DQwUWT0FREEcKFQEGQ1EcEQ8AUwJEQ11QQxAGCg1TRVMRot4ODVVcEQwDGQpZXxBVBhISH0xCVVIKBRxB',
      dicasFracas: ['La cena fue servida a las 20h y la vajilla recogida sin prisa, como en todas las noches de la mansión.', 'El retrato del fundador, en la pared de la sala, se empaña con la humedad de septiembre.', 'La gobernanta suele trancar las puertas de servicio a las 22h y guardar la llave en el gancho de la cocina.', 'El médico de la familia solo es llamado a la casa en urgencias; era la segunda visita del mes.'],
      epilogo: 'IhMQB0RGXxEABAEdTFRfEQYNU10fHwAITUE2Aw1DX1MRCB0ADVNfXwUEAKyeEFVdQwYcA11VEFIMD1MKQRBCVA8OGU9JVRBTDA0ABkFcXxEHBB9PWfOdXk9BEhtfUfOcBw5TH0JCEFQPQQMAQUZfEQcEUwxCUkJUQwUWT0FREEcKFQEGQ1EeES8AUwdEWlERCwQBCknzgxEPAFMMQlxVUgAIsNxDHBBIQw0ST09ZUl0KDgcKTlEQRwwNBQbugxBQQwQLB0RSWUNDFRwLQkMQXQwSUx1IXF9bBhJTja2kEFwGDxwcDUVeXk0='
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'La Carta sin Remitente',
      relatorio: 'Una carta anónima llegó a la redacción del periódico local denunciando el robo de una joya rara en la mansión de los Oliveira. El texto fue escrito en una máquina antigua. La caja fuerte fue forzada durante una cena y nadie escuchó nada. La policía investiga el arma usada, el lugar del asalto y quién envió la carta.',
      pistas: ['Dos surcos paralelos, separados como los brazos de una garra, marcan el marco de la caja fuerte.', 'La cinta de la máquina de la residencia fue cambiada esa semana, y nadie recuerda quién la compró.', 'Un empleado recorrió la casa toda la noche sin tarea definida; otro, que alegaba estar libre, fue reconocido en la calle de atrás a las 21h.', 'La alarma de la residencia quedó desarmada por el tiempo exacto en que el postre era servido.', 'La denuncia llegó al periódico con matasellos del día anterior al robo — escrita por quien sabía del crimen antes de que ocurriera.'],
      hashArma: '2383827277445157',
      hashLocal: '6659954572910603',
      hashAssassino: '6710632091174588',
      opcoesArma: ['Un Pie de Cabra', 'Una Máquina de Escribir', 'Una Daga', 'Un Candelabro', 'Una Llave Inglesa'],
      opcoesLocal: ['La Mansión de los Oliveira', 'La Redacción del Periódico', 'La Caja Fuerte del Banco', 'El Jardín Botánico', 'El Comedor'],
      opcoesAssassino: ['El Mayordomo', 'La Empleada', 'El Chofer', 'El Periodista', 'El Chef de Cocina'],
      dicaBoaArma: 'LwBTDExaURIFFBYdWVUQUQYFGqyeEFESFg8ST11RXFMNAhJDDV5fEgJBBgFMEFhdCQBTAUQQURIWD1MfSENfEgcEUwJIQ1EIQw0cHA1FRFcNEhoDRF9DEgcEUwpeU0JbFxQBDg1JEF4MElMAX15RXwYPBwBeEEFHBgUSAQ1WRVcRAF1PfEVVVgIPUwtCQxBaBhMBDkBZVVwXAABPSVUQUwAEAQANVFVeQxUSA0FVQhKB4edPVBBcU0MHHB1AURBWBkEfDg1XUUARAFMKQxBVXkMMEh1OXxBBBhESHUwQRVwCQRcKDVxREgwVAQ4D',
      dicaBoaLocal: 'LwBTDEReRFNDAhICT1lRVgJNUwNMEFFeAhMeDg1UVUECEx4OSVEQS0MNEk9OVV5TQxIWHVtZVFNDERYdWVVeVwAEHU9MEFxTQwwaHEBREFYKExYMTlnzgQ1aUwNMEEJXBwAQDETzg1xPQRYDDVJRXAAOUxYNVVwSCQABC+6dXhINDlMdSPOKXAYPUwNCQxBGEQQAQQ11XBIAExoCSF4QQxYEF6yeEFRXDRUBAA1UVRIPAFMdSENZVgYPEAZMHBBXDUEGAUwQVUEXAB0MRFEQRxAAFw4NVFUSDQ4QB0gQQFMRAFMdSFNZUAoTXQ==',
      dicaBoaAssassino: 'Jg1TDUJE84ENQRcAX1FUXUMJEgNBUVRdQwsGAVlfEFNDDRJPTlFaU0MHBgpfRFUSEwQBG0heVVGgzBJPTFwQRw0IFQBfXVUSBwRTA0wQVV8TDRYOSVEQ0OP1UxYNVkVXQw0ST11CX0IKAFMKQEBcVwIFEk9cRVlXDUEfAA3ym1cNAhwBWULzgaHaX09dWUNGAkEXCkBRQ1sCBRxPT0VVXAJBAw5fURBBBhNTDEJZXlEKBRYBTllRHA==',
      dicasFracas: ['La joya dormía en un estuche de terciopelo, dentro de un cajón con fondo falso.', 'El chef sirvió la cena en tres tiempos y salió antes del café, como manda la casa.', 'El chofer lava el coche toda mañana; aquella mañana, además, lo enceró.', 'La mansión recibe invitados ilustres desde los tiempos del abuelo de los Oliveira.'],
      epilogo: 'IhMQB0RGXxIABAEdTFRfEgYNU10eHwALTUE/Dg1VXUIPBBILTBBTUxqiwE9ORVFcBw5TCkEQUl0XosABDVRfQAIFHE9JVRBBFkEDHUJAWV1DFB0GS19CXwZBFRpIEEJXAA4dAE5ZVF1DERwdDVxREhMOHwZO851TQwIaCkNE858FCBAOFhBcU0MCEh1ZURBTDaLAAURdURIGExJPXkVJU09BFhxOQllGAkEDDl9REFYGEgUGTEIQQQwSAwpOWFFBTUE2Aw1AWVdDBRZPTlFSQAJBFRpIEEJXABQDCl9RVF1DBB1PSFwQWAITF6yAXhwSGkEfDg1aX0sCQQUAQUZZ8dBBEk9BURBRAgsST0tFVUAXBF0='
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'El Enigma del Laboratorio',
      relatorio: 'El científico Dr. Bastos desapareció de su propio laboratorio la noche del experimento. La puerta estaba trancada por dentro, pero la ventana entreabierta revela algo sospechoso. No hay señales de allanamiento y el cuerpo fue retirado sin dejar rastros claros. La policía investiga el arma, el lugar y el responsable del crimen.',
      pistas: ['El cuerpo no tiene cortes, contusiones, quemaduras ni señales de descarga — solo un rubor extraño en la piel y el aliento alterado.', 'Un recipiente de vidrio de la mesa de trabajo amaneció vacío, con el lacre roto y sin registro de descarte.', 'La tarjeta que abrió el torno después de la medianoche estaba olvidada, desde el fin del turno, en la mesa de un colega.', 'La taza del mostrador guarda lápiz labial en un solo lado — y la rutina del sector prohíbe bebidas junto a la mesa de trabajo.', 'La ventana se trancó por dentro, y las marcas de guantes quedaron en el batiente interno.'],
      hashArma: '7246506868109793',
      hashLocal: '2636291679626290',
      hashAssassino: '5996857768527186',
      opcoesArma: ['Un Frasco de Veneno', 'Una Probeta de Vidrio', 'Un Bisturí', 'Un Palo de Madera', 'Un Soplete de Mesa'],
      opcoesLocal: ['El Laboratorio', 'El Estacionamiento', 'La Sala de Seguridad', 'El Almacén', 'El Ala de Investigación'],
      opcoesAssassino: ['El Asistente', 'La Asistente de Laboratorio', 'El Guardia', 'El Científico Vecino', 'El Pasante'],
      dicaBoaArma: 'MAgdT05fQkcGEl9PQVxRXgISUwFEEFleEwAQG0IcEFYPQRIdXlVeUg9BFwoNXFETDgQADg1UVRMXExINTFpfExMIFh1JVRBRChIHGl/znR9DEhwfQVVEVkMYUx9MXF8TBwRTAkxUVUECT1M+WFVUUg1BHwBeEFRcEEEBCk5ZQFoGDwcKXhBUVkMXGgtfWV8TEhQWT0pFUUEHAB1PTl9eRwYPGgtCHg==',
      dicaBoaLocal: 'NwgWHV9RHBMPDQYZRFEQSkMCEgVMQxBdDEEQAEBSWV0CD1MMQl4QXwJBFhxOVV5SWEEDDllZXx9DBhIdRERRExpBEgNAUVPwyg9THlhVVFINQRUaSEJRHUMkH09MWUJWQxEWHEwQURMSFLDCQFlTUkMYUwpBEEZaBxMaAA1DVRMXExIBTvODExMOAU9JVV5HEQ5Tja2kEEIWBBcODVVcE6DAAQpMEFNaBg8HrIBWWVACTVMKQ0RCVkMEH09fVVNaDRUcT11CWV0ACAMOQRBJEwYNUw5BURBFBgIaAUwe',
      dicaBoaAssassino: 'LwBTG0xKURMHBFMb7pkQUAwPUwPukUBaGUEfDk9ZUV9DBB1PSFwQUQwTFwoNVkVWQxIWHVtZVFJDERwdDUFFWgYPUxtIXvOeAkEfBk9CVRMCAhAKXl8QUkMNEk9AVUNSQwUWT1lCUVECCxxPz7CkExpBAABBXxBfAkESHERDRFYNFRZPWENRUQJBFhxIEERcDQ5TC0gQXFIBCBIDAw==',
      dicasFracas: ['El laboratorio funciona con subvención de proyecto y recibe equipo importado cada trimestre.', 'El asistente de investigación es distraído; ya perdió tres cuadernos este semestre.', 'El olor a éter del pasillo permanece en el aire hasta tarde los días de destilación.', 'El guardia hacía las rondas dormitando, según su propia hoja de registro.'],
      epilogo: 'IhMQB0RGXxMABAEdTFRfEwYNU10ZHwAKTUE/Dg1RQ1oQFRYBWVUQUAwPFQpe84MTCwARCl8QU1IOAxoOSV8QVg9BB6yEEFRWD0EQBkheRPDOBxoMQhBAXBFBFgMNQlVSABUaGUIQVFYPQRUdTENTXEMAEQZIQkRcT0ESH19fRlYACRIBSV8QXwwSUwhYUV5HBhJTC0hcEF8CAxwdTERfQQoOXU9oXBBfoMADBlcQXFIBCBIDDVVeEw8AUxtMSlETDwBTC0hcUUeg0khPTkVdQw8EUwxCXlRWDQBTH0JCEFsMDBoMRFRZXEMCEgNEVllQAgUcQQ=='
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'El Violín Desafinado',
      relatorio: 'Durante el ensayo de gala en el Teatro Aurora, el maestro Érico Salgado fue encontrado sin vida en el foso de la orquesta. Las luces parpadearon, el telón cayó y, cuando volvieron, ya no respiraba. El teatro estaba lleno, pero nadie vio el golpe. La policía debe determinar el arma, el lugar exacto y el responsable.',
      pistas: ['La marca en el cuello es un surco fino y sin nudos, trazo de algo tirado entre dos puntos de tensión.', 'La cuerda más fina del instrumento principal fue cambiada horas antes; el lutier no vino al teatro.', 'Las suelas de quien circuló bajo el piso de la orquesta guardaban polvo oscuro y resinoso.', 'La solista del papel principal anunció que no cantaría el segundo acto y dejó el camarín antes del apagón.', 'El telón bajó cinco minutos antes de lo previsto — tiempo justo para bajar al nivel más bajo y volver.'],
      hashArma: '1196866246583004',
      hashLocal: '5127950791874285',
      hashAssassino: '5552126337321011',
      opcoesArma: ['Una Cuerda de Violín', 'Una Batuta de Maestro', 'Un Candelabro del Vestíbulo', 'Unas Tijeras de Vestuario', 'Un Arco de Violín'],
      opcoesLocal: ['El Foso de la Orquesta', 'El Camarín', 'El Escenario', 'El Vestíbulo', 'La Platea'],
      opcoesAssassino: ['El Utilero', 'La Soprano', 'El Violinista Principal', 'El Empresario', 'El Maestro Asistente'],
      dicaBoaArma: 'Jg1THFhCU1tDBxoBQhBVFAoPGgFZVUJGFgwDBklfEFoMQR0OTlUQUAZBAQBAUl8UDQhTC0gQRlURAElPT1FEQRcAX09OUV5QBg0SDV9fEE1DFRoFSEJRR0MQBgpJUV4UBRQWHUweEGUWBBcOQxBcWxBBFwBeEFhdDw4AT0lVXBQGEhAKQ1FCXQxBAhpIEENRQxUWAV5RXhQGDwcdSBBcVRBBHg5DX0Ma',
      dicaBoaLocal: 'JhIQCkNRQl0MTVMZSENE984DBgNCEEkUEw0SG0hREEIKFxoKX19eFA8NFgFCQxBQBkEcBUJDEFUSFBYDQVEQWgwCGwoWEEFBBgUSAQ1VXBQNCAUKQRBSVQkOUwpBEEBdEA5TFg1cX0dDAxIcWVlUWxEEAE9OVUJGAgUcHA3SsKBDGFMKQRBAWw8XHE9fVUNdDQ4AAA1UVVcKBRZPSF5ERgZBHwBeEFRbEE8=',
      dicaBoaAssassino: 'LwBTHEJAQlUNDlMfSEJUXaDSUwpBEEBVEwQfT11CWVoACAMOQRBcVUMXsMJeQFVGAkEKT0dFQvfQQQIaSBBVWEMMEgpeREJbQ6PYAUIQXFgGBhId7p1RFAINUxtIQlNREUESDFlf8o9YQR8ODUBRRhcIBxpfURBXDA9TA0wQVFEHCBAOWV9CXQJBAQ5eV1FQAk1TB0xcXFUHAFMNTFpfFA8AUx9fWV1REQBTCURcURhDBAEODUNFTQJP',
      dicasFracas: ['La taquilla agotó la víspera; los pasillos quedaron apretados en el intermedio.', 'El utilero revisa los telones tres veces por función, siempre temblando.', 'Los telones del escenario se cambian cada temporada, por costumbre de la casa.', 'El empresario exige resultados en cada ensayo; el maestro responde con silencio.'],
      epilogo: 'IhMQB0RGXxQABAEdTFRfFAYNU10YHwANTUE/Dg1DX0QRAB0ADVZFUUMCHAFJVV5VBwBTDkEQVFEQAgYNX1lCRwZBAhpIEFxVQwIGCl9UURQHBFMZRF9c984PUx1CRFEUDw0WGUxSURQPAFMcTF5XRgZBFwpBEF1VBhIHHUILEFEPDRJPQFlDWQJBEABfRPOHQw0ST05FVUYHAFMWDVJRXqDSUw5BEFZbEA5THERXRV0GDxcADVVcFBMOHxlCEFRRQxMWHEReURpDJB9PeVVRQBEOUy5YQl9GAkEBCkxSQl2g0lMcRF4QUQ8NEk9IXhBRD0EWA0heU1tN'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'La Última Transmisión',
      relatorio: 'En la madrugada del sábado, el locutor Válter Nobre interrumpió el programa en vivo con un grito y nunca más fue visto. La emisora de radio fue aislada, y la cinta de la transmisión desapareció. La policía investiga el arma del crimen, el lugar exacto y quién borró la grabación.',
      pistas: ['El surco en el cuello es continuo, sin hoja, dejado por un material flexible y áspero.', 'El último sonido antes del grito fue el chasquido de un conector encajado en la mesa de captación.', 'El contador de la cinta fue puesto a cero y rebobinado quince minutos; el carrete original nunca apareció en el archivo.', 'El torno del tercer piso registra salida a la 1h05 y regreso a la 1h10, en el pasillo de las cabinas.', 'La contraseña de grabación fue usada diez minutos después del grito, por un perfil de mantenimiento de audio.'],
      hashArma: '7171630315149373',
      hashLocal: '5867911410404209',
      hashAssassino: '7198312704428123',
      opcoesArma: ['Un Cable de Micrófono', 'Una Cinta Magnética', 'Una Lámpara de Metal', 'Una Grapadora', 'Unos Auriculares'],
      opcoesLocal: ['El Estudio 3', 'La Cabina de Control', 'El Estacionamiento', 'La Cafetería', 'El Archivo de Cintas'],
      opcoesAssassino: ['La Locutora Rival', 'El Técnico de Sonido', 'El Director de la Radio', 'El Vigilante Nocturno', 'La Recepcionista'],
      dicaBoaArma: 'LwBTAkxCU1RDERoLSBBRWQQOUwNMQldaT0EVA0hIWVcPBFMWDfORRhMEAQAXEFxUQwIaAVlREFMRotIIRFwcFQYNUx9IQ18VBwRTAkhDURUaQRYDDV1VQQINUwtIEFdUFQQHDg1BRVAHAB1PS0VVRwJPUz5YVVRUDUEfAF4QVFoQQRIMTlVDWhEIHBwNQUVQQw0cHA1fQFARABcAX1VDFQAUFgNKUV4VBwQfT0VfXVcRDl0=',
      dicaBoaLocal: 'LQhTDExWVUEGE7DCTBwQWwpBAw5ZWV8VGkEdBg1RQlYLCAUADURZUA0EHU9eVfOEAg1TDkEQUVwRBElPSFwQUhEIBwANVkVQQwISH1lRVFpDBB1PW1lGWk9BEABDEFVZQwIbDl5BRVwHDlMLSBBFW0MCHAFIU0RaEUEWAQ1cURUOBAAOAxBhQAYFEgENVF9GQxISA0xDEFEGQQAAQ1lUWk0=',
      dicaBoaAssassino: 'MhQaCkMQUloRE7DcDVxfRkOiyQNZWV1aEEEeBkNFRFoQQRcKDVxRFQAIHRtMEERQDaLeDg1RU1YGEhxPTBBcVEMMFhxMEFRQQxIcAURUXxWB4edPVBBVWUMVsMZOXllWDEEVGkgQVVlDoskBRFNfFQYPUxtCU1FHQwQfT0hBRVwTDlMOQ0RVRkMFFk9cRVUVDw0WCExCURUPAFMfQlxZVqDMEkE=',
      dicasFracas: ['La emisora pierde audiencia frente a la competencia desde el carnaval.', 'El locutor gustaba de entrevistas polémicas y nunca quiso seguridad al aire.', 'La cafetería sirve café fuerte a cualquier hora; la jarra casi nunca se enfría.', 'El vigilante hace ronda cada dos horas y nunca sube al tercer piso.'],
      epilogo: 'IhMQB0RGXxUABAEdTFRfFQYNU10bHwAMTUE2Aw1E85wADxoMQhBUUEMSHAFEVF8VAA4dCUhD84ZDCRINSEIQVwwTAQ5JXxBZAkEQBkNEURUTAAEODVVeVhYDAQZfEFVZQwIBBkBVXg5DBB9PTlFSWQZBFwoNXVlWEaLACUJeXxUXDhcOW/OdVEMJsNVAVVRaQwcGCg1VXBUCEx4OAxBzQA4RHwoNU19bBwQdDgEQSRUGDVMqXkRFUQoOU1wNXkVbAABTAu6RQxUXExIBXl1ZQQqiwE9IXhBDChccT0wQVUYCQRsAX1Ee'
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'El Jardín de las Estatuas',
      relatorio: 'En la inauguración de la exposición al aire libre del Museo Bandeirante, el curador Heitor Prado fue encontrado caído entre las esculturas. La noche no tenía luna y el jardín estaba iluminado solo por antorchas. Nadie admite haberse acercado a él. La policía busca el arma, el lugar y el responsable.',
      pistas: ['El golpe subió de abajo hacia arriba, desde una vara larga y base pesada — algo hecho para sostener o iluminar, no para cortar ni clavar.', 'La escultura caída sufrió el impacto en la base, no presión lateral.', 'Un único par de huellas va y vuelve por el mismo camino del jardín, sin titubear en las curvas.', 'La última página del libro de rondas fue arrancada; el guardia culpa al viento.', 'La propia víctima despidió a alguien al fin del turno; esa persona salió del depósito minutos después, con una llave de reserva.'],
      hashArma: '2975575657711517',
      hashLocal: '4289793879043542',
      hashAssassino: '6784108139584320',
      opcoesArma: ['Una Antorcha de Bronce', 'Un Cincel', 'Una Estatua de Mármol', 'Un Martillo de Piedra', 'Un Pedestal de Piedra'],
      opcoesLocal: ['El Jardín de las Estatuas', 'La Galería Principal', 'El Despacho del Curador', 'La Entrada del Museo', 'El Depósito de Obras'],
      opcoesAssassino: ['El Guardia Nocturno', 'La Restauradora', 'El Patrocinador', 'El Periodista de Arte', 'El Fotógrafo'],
      dicaBoaArma: 'NQABDg1cUUQEAFMWDVJRRQZBAwpeUVRXT0EWAl1F84cCBRJPSVUQVwEAGQANWFFVCgBTDl9CWVQCW1MMRF5TUw9NUwpeRFFCFgBTCkNEVUQCQQpPXVVUUxAVEgMNVllcDEECGkhUUVhDBwYKX1EeFjIUFgtMXhBSDBJTH0RVSlcQQRcKQRBRVQYTBQANQUVTQxIWT15fQ0IKBB0KQxBAWRFBHw4NUlFFBkGR77kQRVgCQRcKDVJCWQ0CFkMNX0REAkEXCg1AWVMHExJB',
      dicaBoaLocal: 'JAAfCl/znVdDFxoIRFxRUgJNUwtIQ0BXAAkcT05VQkQCBRxPVBBVWBcTEgtMEFNZDUEQAENDVUQJBAGsgFEQWAxBFhddXFlVAg9TB1hVXFoCElMKQxBVWkMLEh1J851YWEECGkhUURYGDVMOREJVFg8IER1IENK290EWAw1VQ0YCAhoADVRVFg8AAE9CUkJXEEEWF11FVUUXAABPQhBVWkMAHQpVXxBSBkEfDl4QQF8GGxIcDVdFVxEFEgtMQx4=',
      dicaBoaAssassino: 'LwBTHUhDRFcWExILQkJRFgcEAB9IVFlSAkEWHEwQRFcRBRZPTl9eWQCi3g4NU1FSAkEWHFlRREMCQRIDDURRVRcOUxYNQ1FUoMwST0hIUVUXAB4KQ0RVFhIUsMYNUlFFBkEQCknznVdDAxIFQhBVWkMRFhxCEFRTQxQdDg1TUfXOBRJB',
      dicasFracas: ['La apertura al aire libre atrajo más público del previsto; las luces del jardín se encendieron al anochecer.', 'El patrocinador dio un largo discurso antes de la cena, como hace en cada estreno.', 'La linterna del guardia nocturno tiene pilas débiles desde la última inspección.', 'Las obras del anexo esperan restauración desde hace dos veranos.'],
      epilogo: 'IhMQB0RGXxYABAEdTFRfFgYNU10aHwAPTUE/Dg1CVUUXAAYdTFRfRAJBFwpeQFVSCgUST05fXlAGErDcDVVcFgQOHx9IEFNZDUEfDg1RXkIMExAHTBBUU0MDAQBDU1UNQwIcAUJT85sCQRAOSVEQUxAVEhtYURBXQw4ADFhCUUVDGFMOX0JRWACiwE9BURBGoMAUBkNREFIGDVMDRFJCWUMFFk9fX15SAhJdT2hcEFwCExesgF4QRAYAER1E84MaQxhTA0wQVUUXAAcaTBBVRRIUGh1BUVRXQwcGCg1CVUUXAAYdTFRRFhMOAU9CREJXEEEeDkNfQxg='
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'El Puente Cubierto',
      relatorio: 'El mercante Estrela do Norte atracó con un pasajero menos. El capitán Raul Vasquez fue visto por última vez en el puente de mando, en una noche de niebla densa. El cuaderno de bitácora tiene páginas mojadas y una anotación ilegible. La policía portuaria investiga el arma, el lugar y el responsable.',
      pistas: ['El impacto en la cabeza es angular, de bordes duros, y sin óxido en el punto del golpe — metal pulido, no acero de marejada.', 'El instrumento que el capitán usaba al amanecer estaba mojado por fuera y seco por dentro, como quien lo limpia a las prisas.', 'La brújula del timón apuntaba al oeste mientras el cuaderno de bitácora registraba rumbo norte.', 'El oficial que asumiría a las tres asumió a las dos y mandó callar los telégrafos.', 'Una carta datada aquel día, firmada por la víctima, fue encontrada en el cajón del segundo al mando.'],
      hashArma: '2210695070329856',
      hashLocal: '897696531356540',
      hashAssassino: '5492021482405070',
      opcoesArma: ['Un Sextante de Latón', 'Un Cable de Acero', 'Un Ancla', 'Un Machete de Cubierta', 'Un Cronómetro de Bolsillo'],
      opcoesLocal: ['El Puente de Mando', 'La Bodega de Carga', 'La Cubierta Principal', 'La Sala de Máquinas', 'El Camarote del Capitán'],
      opcoesAssassino: ['El Cocinero', 'El Primer Oficial', 'El Maquinista', 'El Práctico del Puerto', 'El Timonel'],
      dicaBoaArma: 'IQ4BC0gQUVkEFB8OXxBJFxMUHwZJXxwXEAgdT+6DSF4HDklPTlFSWwZBFwoNUVNSEQ5fT0xeU1sCQQpPQFFTXwYVFk9cRVVTAg9TCVhVQlZNQSIaSFRRWUMFHBwNWV5EFxMGAkheRFgQQRcKDUBCUgAIAAbug14bQwUWT0BVRFYPQRADTEJfG0MQBgoNVVwXAAADBlnzkVlDDBIBWVVe9M4AUwVYXkRYQwAfT1lZXfTQD10=',
      dicaBoaLocal: 'Jg1THVhdUlhDBAEdTFRfFxAOHwANQ1UXAA4BHURXVRcHBAALSBBUWA0FFk9eVRBBBkEWAw1YX0UKGxwBWVUKFwEOFwpKURwXABQRBkhCRFZDGFMcTFxRFwcEUwLukUFCCg8SHA1BRVIHAB1PT1FaWEMNEk9B851ZBgBTC0gQXVYNBRxBDWFFUgcAHU9IXBBHFgQAG0IQVFIPQQcGQPODWUMYUwpBEFNWDgABAFlVEFMGDVMMTEBZQ6DAHU/PsKQXGkEfDg1SQvTZCwYDTBBUUgAIFwoNVV5DEQRTCkFcX0RN',
      dicaBoaAssassino: 'Jg1TH19ZXVIRQRwJRFNZVg9BEhxYXVn00EEWAw1dUVkHDlMOQ0RVREMFFk9ZWVVaEw5TFg1EVVmgzBJPSF4QUg9BEA5H84NZQw0ST11CX0cKAFMMTEJEVkMFFk9JWV1eEAiw3EMQVl4RDBILTBBAWBFBFgMNU1FHChWwzkMQ0rf3QR6snkZZW0MYUwBdX0JDFg8aC0xUEFINQRYDDV1ZRA4OUwxMXVFFDBUWQQ==',
      dicasFracas: ['La tripulación es pequeña y trabaja junta desde la ruta del Pacífico.', 'La niebla densa de aquella noche impuso velocidad reducida durante casi tres horas.', 'El cocinero se queja de la despensa apretada en cada travesía.', 'El práctico del puerto embarca solo en las últimas millas, como manda el reglamento.'],
      epilogo: 'IhMQB0RGXxcABAEdTFRfFwYNU10VHwAOTUE2Aw1AQl4OBAFPQlZZVAoAH09LRVUXExMWHEIQQFgRQRIcWF1ZRUMEH09AUV5TDEESAVlVQxcHBFMDTBBYWBEASE9BURBUAhMHDg1UVRcHCB4GXlnzhA1BFgENVVwXAAAZrJ5eEEQGDR+snhBVW0MMsNxbWVwbQxhTCkEQQ1IbFRIBWVUQUwZBHw5Z84NZQwQBDg1VXBcCEx4OAxB1W0MkABtfVVxWQwUcT2NfQkMGQR0OW1VXVkMDEgVCEEVZQw8GCltfEFQCERob7pFeG0MYUwNMEFJFoNsZGkFREEEMDQUG7oMQVg9BHQBfRFUZ'
    },
    {
      id: 'caso-008',
      data: '2026-09-29',
      titulo: 'El Coche de Medianoche',
      relatorio: 'El tren nocturno de la línea Central se detuvo en una estación de paso cuando el jefe de tren Octávio Braga fue encontrado sin vida entre las mesas servidas de uno de los vagones. La niebla cubría el tren y nadie pudo haber bajado sin registro. La policía investiga el arma, el lugar exacto y el responsable.',
      pistas: ['El golpe bajó de arriba, de un metal largo y de mango forrado — sin hoja, vidrio ni cuero.', 'La mesa del vagón de las comidas estaba servida para dos, pero solo una taza fue usada.', 'El cuaderno de a bordo registra la última revisión de pasajes a las 23h20 — y la firma que la sigue es de quien revisó después del jefe de tren.', 'Las gotas de niebla del piso encerado terminan justo donde la toalla de la mesa sigue servida.', 'El soporte de herramientas del tren guarda el contorno de polvo de una pieza larga que ya no descansa en él.'],
      hashArma: '4755419301640620',
      hashLocal: '496749860328119',
      hashAssassino: '4500251928862691',
      opcoesArma: ['Una Llave de Ruedas', 'Un Martillo de Emergencia', 'Un Cincel de Grabado', 'Una Botella de Champán', 'Un Cinturón de Cuero'],
      opcoesLocal: ['El Vagón Restaurante', 'El Coche-Dormitorio', 'El Pasillo de Servicio', 'El Freno del Último Vagón', 'El Vagón de Equipajes'],
      opcoesAssassino: ['El Maquinista', 'El Chef del Tren', 'El Revisor de Billetes', 'La Pasajera del Asiento 14', 'El Bombero de a Bordo'],
      dicaBoaArma: 'LQhTGURUQlEMTVMBRBBTTQYTHEMNXlkYAhIHDg1TX0oXAFMLSBBGUQcTGgpfXxBdGxEfBk5RXhgGDVMIQlxAXVlBEQBZVVxUAk1TDEReRE0RosABDUkQVQITBwZBXF8YBwRTCkBVQl8GDxAGTBBBTQYFEgENVkVdEQBdT3xFVVwCD1MDTEMQXAwSUwdIQkJZDggWAVlRQxgHBFMCSERRVEMNEh1KXxBcBg1TG19VXhiB4edPVBBVVEMCHAFZX0JWDEEXCg1AX1QVDlMKQxBVVEMSHB9CQkRdQwQfBkpVEF0NFQEKDVVcVAISXQ==',
      dicaBoaLocal: 'Jg1TC0JCXVEXDgEGQhwQXQ9BAw5eWVxUDEEXCg1DVUoVCBAGQhBJGA8AUwxMWlEYBwRTCV9VXldDDxxPWVlVVgYPUwJIQ1EYEAQBGURUUQNDEAYKSVFeGAYNUwNYV1FKQwUcAUlVEFQCElMCTFxVTAISUxxIEFdNAhMXDkMQSRgCEAYKQRBUVw0FFk9BURBIDwAHDg1SQlEPDRJPSF4QVAJBHgpeURDa4/VTFg1cUUtDBhwbTEMQXAZBHQZIUlxZQwUWAw1AWUsMQRYDRFdVVkMEHRtfVRBUDBJTC0JDHg==',
      dicaBoaAssassino: 'Jg1THUhGWUsME1MLSBBSUQ8NFhtIQxBKBhcaHO6DEF0PQRAaTFRVSg0OUwtIEFEYAQ4BC0IQURgPAABPHwNYClNBCk9OWUJbFg2w3A1DX1QMQRYBWUJVGA8OAE9bUVdXDQQAT1lfVFlDDRJPQ19TUAZBke+5EF5ZBwgWT0DzkUtDFRYB7p1RGBMAAAoNXFlaEQRd',
      dicasFracas: ['La niebla de la sierra acompañó al tren desde el último túnel.', 'La cocina de a bordo cierra a las 23h, como manda el reglamento de la línea.', 'La bocina de cruce suena tres veces antes de cada puente.', 'El olor a café se mezcla con el carbón en los pasillos entre vagones.'],
      epilogo: 'IhMQB0RGXxgABAEdTFRfGAYNU10UHwABTUE2Aw1CVU4KEhwdDVNfVgUEAKyeEFVUQwYcA11VEFsMD1MDTBBcVAIXFk9JVRBKFgQXDl4QVF0PQQcdSF4cGAYPUwNMEF1dEABTHlhVEPvKDVMCRENdV0MJEg3unVEYExMWH0xCUVwMWlMKQRBTTQIFFh1DXxBcBkEST09fQlwMQQEKSllDTBGiwE9BURBQDBMST0lVEFQCQRAAQ1ZVSwqiwAEDEHVUQxUBDkNDQFcRFRZPQ19TTBYTHQANQ1lfFgiw3A1GWVkJBFMNTFpfGAwVAQ4NU1hZEwBd'
    },
    {
      id: 'caso-009',
      data: '2026-09-30',
      titulo: 'El Trampolín Silencioso',
      relatorio: 'Después de la última función del Circo Astreia, el dueño Horácio Pepê fue encontrado sin vida bajo la lona de la arena. Las luces se apagaron temprano y el público ya se había ido. La policía investiga el arma, el lugar exacto y el responsable.',
      pistas: ['El golpe bajó de una esfera lisa y pesada — sin hoja, hilo ni mango.', 'La pesa esférica del número de fuerza amaneció fuera del pedestal, con un rasguño oscuro en el metal.', 'El serrín se pegó a las suelas de uno de los presentes; los zapatos de cuero fino de otro seguían limpios.', 'Quien ensayaba a escondidas no fue visto en el escenario oficial en aquel intervalo de quince minutos.', 'La cortina del fondo se abrió a las 22h15, quince minutos antes de que el cuerpo fuera encontrado.'],
      hashArma: '967783828933632',
      hashLocal: '5785660171827596',
      hashAssassino: '265259329383717',
      opcoesArma: ['Una Bola de Hierro', 'Un Látigo de Montura', 'Un Puñal de Escena', 'Una Campana de Latón', 'Una Cuerda de Trapecio'],
      opcoesLocal: ['La Pista del Circo', 'El Camarín Principal', 'El Vagón del Tesorero', 'La Pista de Entrenamiento', 'La Carpa de Comidas'],
      opcoesAssassino: ['El Payaso', 'La Equilibrista', 'El Domador', 'El Mago', 'El Gerente de la Temporada'],
      dicaBoaArma: 'Jg1TCEJcQFxDAxIFTBBUXEMUHQ4NVUNfBhMST0FZQ1hDGFMfSENRXQJNUxxEXhBRDAsSQw1YWVUMQR0GDV1RVwQOSU9B85FNCgYcQw1ARfrSAB9PVBBTTAYTFw4NQUVcBwAdT0tFVUsCT1M+WFVUWA1BHwBeEFRWEEEcDUdVRFYQQQEKSV9eXQwSUwtIEFxYQwABCkNRENvj9VMWDVVcGREAAAhY84FWQw4ADFhCXxkGD1MKQRBdXBcAH09IXFleBkEWAVlCVRkGDR8AXh4=',
      dicaBoaLocal: 'IAAeDl/znVdPQQUOSvODV0MYUwxMQkBYQxUaCkNVXhkXBAAbRFdfSkMOUxxYVVxWQwUWT0BRVFwRAEhPSFwQSgYTAayAXhBcDUEfDl4QQ0wGDRIcDVFATA0VEk9MEFxYQwABCkNRENvj9VMKQ0RCXEMEH09O851LABQfAA1UVRkGGRsGT1lTUKDSHU9UEFxYQxUSHURdURkHBFMKQ0RCXA0AHgZIXkRWTQ==',
      dicaBoaAssassino: 'Jg1TAkxXXxkHBAAOXVFCXAAIsNwNVEVLAg8HCg1BRVANAhZPQFleTBcOAE9IXhBUBgUaAA1UVRkQFFMB7opdXBEOU42tpBBcD0EHBkhdQFZDBAsOTkRfGQYPBx1IEFxYQwADCl9ERUsCQRcKDVxRGQAOARtEXlEZBwQfT0tfXl0MQQpPSFwQUQINHw5XV18ZBwQfT05FVUsTDl0=',
      dicasFracas: ['El público salió temprano; la lona todavía guarda el eco de la última función.', 'El serrín de la arena se cambia cada dos días, por costumbre de la troupe.', 'El generador del circo tiembla cada media hora, y las luces parpadean con él.', 'El viento de septiembre levanta las lonas en las esquinas que no están amarradas.'],
      epilogo: 'IhMQB0RGXxkABAEdTFRfGQYNU1wdHwAATUE2Aw1dUV4MQRAAQ1ZVSqDSUwpBEFdWDxEWT05fXhkPAFMNQlxRGQcEUwdEVUJLDEEXCkEQXvrZDBYdQhBUXEMHBgpfSlEVQwQADEJeVFAHDlMKQxBDTEMRAQBdWV8ZDaLJAkhCXxkHBFMOXVFCUAAIHAFIQwsZBg1TDERCU1ZDEhoIWFnzikMFFk9ZVV1JDBMSC0wQQ1ANQRYDDURCTAAOUwtIEFxYQwAGHEheU1ACTw=='
    },
    {
      id: 'caso-010',
      data: '2026-10-01',
      titulo: 'La Mesa Veintiuno',
      relatorio: 'En el casino Palacio de Cristal, el gerente Basílio Quadros fue encontrado sin vida tras el cierre, junto a las mesas cubiertas con paños. Las fichas estaban en aparente orden y tres personas circulaban por el edificio. La policía investiga el arma, el lugar y el responsable.',
      pistas: ['El golpe en la sien vino de un objeto corto, liso y macizo, sin borde cortante ni mango largo.', 'La caja de herramientas de la casa amaneció con una pieza menos; el fieltro de la tapa guarda el dibujo de la que salió.', 'Las fichas de la última mesa cerrada fueron contadas dos veces; la segunda cuenta registró trescientas menos.', 'La alarma de la caja fuerte saltó a las 2h10, pero la puerta siguió trancada por dentro.', 'Quien circuló después de la última ronda llevaba la chapa verde de caja — color que solo dos sectores del casino cargan.'],
      hashArma: '6448092308642977',
      hashLocal: '5229251613114075',
      hashAssassino: '2879083009120520',
      opcoesArma: ['Un Puño Americano de Níquel', 'Un Cincel de Caja Fuerte', 'Un Cetro de Latón', 'Una Cuerda de Terciopelo', 'Una Lima de Acero'],
      opcoesLocal: ['La Mesa Veintiuno', 'La Caja Fuerte de Fichas', 'El Camarín de Artistas', 'La Portería del Casino', 'La Sala de Espera'],
      opcoesAssassino: ['El Crupier Nocturno', 'La Cantante del Bar', 'El Vigilante del Patio', 'El Barman', 'La Supervisora de Fichas'],
      dicaBoaArma: 'Jg1TCEJcQVVDBABPTl9DRAxNUwtIEEFFoNAcT05VQ0ICBRxPVBBCWQ1BEABfRFQKQwIaAU5VXRAHBFMMTFpQEAUUFh1ZVR0QABQWHUlREVQGQQcKX1NYXxMEHwANSRFcCgwST0lVEVEABAEADUFEVQcAHU9LRVRCAk9TPlhVVVENQR8ADUFEVUMSFk9bWUJEBkEWAQ1cUBAOAB0ADUkRXAxBAhpIEEJVQwQeH1jzgFFDBB1PTENFUUMCHB1ZUR8=',
      dicaBoaLocal: 'LwBTDExaUBAFFBYdWVURQwoGBgbugxFEEQAdDExUUBAaQR8ODUBeQhcEAayAURFeDEEBCkpZQkQRosBPXVFCX1hBFgMNU1BdAhOwwkMQVEMXABEODUZQU6DMHE9IEFhcFgwaAUxUXh5DMAYKSVFfEAcOAE9eUV1REEEXCg1aRFUEDlONraQRSUMNEk9JX1NcBkEQGkheRVFDBRZPQVFCEAUIEAdMQxFUBgIaC0gQVF4XExZPSFxdURBP',
      dicaBoaAssassino: 'LwBTHFhAVEIVCAAAX1ERVAZBFQZOWFBDQwkaFUIQXVFDEhYIWF5VUUMCBgpDRFAQGkEfA0hGUBAPAFMMRVFBUUMXFh1JVRHS4/VTCVhVEVwCQbDVQURYXQJBFgENQ1RCQxcaHFlREVoWDwcADVERXAJBHgpeURFTFgMaCl9EUB4=',
      dicasFracas: ['El casino cierra a las 2h, como manda la licencia de la ciudad.', 'Las fichas azules valen lo que la casa decide esa noche.', 'La alfombra del salón ahoga cualquier paso apresurado.', 'El aire acondicionado del salón falla en las madrugadas de calor.'],
      epilogo: 'IhMQB0RGXhAABAEdTFReEAYNU18cHwAATUE/Dg1DREAGEwUGXl9DUUMCHAFLVULz0EEWAw1XXlwTBFMMQl4RVQ9BAxrugV4QAgwWHURTUF4MQRcKQRBSVRETEgVIQl4QGkEWAw1UVEMVot4ADVRUEBcTFhxOWVReFwAAT0tZUlgCEkhPQVERUwILEk9LRVRCFwRTAVheUlFDBwYKDVFTWQYTBw4DEH1RQwwWHEwQR1UKDwcGWF5eEBIUFgvugxFTBhMBDklREUUNQR4KXhwRSUMEH099UV1RAAgcT0lVEXMRCAAbTFwRUwIMEQbugxFcAkEAGl1VQ0YKEhqsnl4f'
    },
    {
      id: 'caso-011',
      data: '2026-10-02',
      titulo: 'El Códice Rasgado',
      relatorio: 'En la Biblioteca Pública Central, la archivista Lívia Cantos fue encontrada sin vida detrás de la reja de hierro que protege el ala más valiosa del acervo. El edificio estaba trancado desde las 19h. La policía investiga el arma, el lugar exacto y la responsable.',
      pistas: ['La marca en el cuello es un surco doble e interrumpido, con pequeñas marcas cuadradas a intervalos regulares.', 'El cuaderno de visitas registra dos entradas en la sala trancada después de las 19h — y solo una salida.', 'La reja de hierro del ala rara solo se abre con dos llaves: la del conserje y la de la dirección.', 'El fieltro de la mesa de restauración guarda el dibujo de polvo de una pieza que ya no descansa en él.', 'El olor a cola y cuero llenaba el pasillo del fondo aquella noche — donde el acervo espera restauración.'],
      hashArma: '3551555107225190',
      hashLocal: '2930600291038960',
      hashAssassino: '4159109835560332',
      opcoesArma: ['Una Cadena de Archivo', 'Un Candelero de Lectura', 'Un Cincel de Encuadernación', 'Un Pispapel de Bronce', 'Una Tijera de Archivo'],
      opcoesLocal: ['La Sala de Obras Raras', 'El Pasillo de Periódicos', 'El Mostrador de Préstamos', 'El Depósito del Acervo', 'El Jardín de Lectura'],
      opcoesAssassino: ['El Bibliotecario Nocturno', 'La Investigadora Visitante', 'El Conserje', 'La Encuernadora', 'El Pasante de Archivo'],
      dicaBoaArma: 'Jg1THFhCUl5DBABPSV9TXQZBFk9EXkVUERMGAl1ZVV5PQRAAQxBcUBECEhwNU0RQBxMSC0xDEVBDCB0bSEJHUA8OAFUNWF5bAk1TH1heRVBDAhwdWVERSEMRFhxCEFxQAAgJAA1eXhEHCBEaR1FfEQYSHEENYURUBwAdT0tFVEMCQRAGQ1NUXU9BAwZeQFBBBg1TFg1EWFsGExJPz7ClERIUFgtMXhFdDBJTC0JDEVwGFRIDSEMRQBYEUwxYVV1WAg9TFg1AVEICD10=',
      dicaBoaLocal: 'MwQBBu6DVVgADgBPTEBYXQIFHBwBEFJQCQAAT0lVEVUGEbDcXllFXkMYUw5EQlQRDwgRHUgQX15DBAsfQVlSUA1BHw4NQlRbAkEHHUxeUlAHAEhPXEVUVQIPUwpBEFBdAkEeCkdfQxEEFBIdSVFVUEMYUwpBEFxeEBUBDklfQxEHBFMcTFxYVQISU42tpBFIQwQfT05FUFUGEx0ADVRUERUIAAZZUUIRBwQQBklVHw==',
      dicaBoaAssassino: 'LwBTCkNTRFQRDxILQkJQEQYTEk9BURHy2Q8aDEwQUl4NQRkAX15QVQJBFhdZVV9VCgUST0xBRFQPDRJPQ19SWQZBke+5EEgREBRTAUJdU0MGTVMbTFNZUAcOUw4NXPKQEwgJQw1TXl8QFRJPSF4RVA9BEBpMVFRDDQ5TC0gQR1gQCAcOXhBVVEMNEk9eUV1QQxUBDkNTUFUCTw==',
      dicasFracas: ['Las lámparas del ala rara tienen luz ámbar, para proteger los papeles.', 'El olor a cola y cuero toma el pasillo del fondo los días de restauración.', 'El reloj del vestíbulo atrasa dos minutos por semana, y nadie lo arregla.', 'En verano, el jardín de lectura se llena de estudiantes hasta el crepúsculo.'],
      epilogo: 'IhMQB0RGXhEABAEdTFReEQYNU18fHwABTUE/Dg1VX1IWBAEBTFReQwJBEABDVlRCoNJTCkEQVl4PERZPTl9fEQ8AUwxMVFRfAkEXCkEQUFIGEwUAARBcXhUIFw4NQF5DQwQfT07zglUKAhZPXEVUEQ0UHQxMEF1dBgaw3A1REUIWElMCTF5eQlhBFgMNQlRWChIHHUIQVVRDFxocRERQQkMPHE9AWVRfFwRdT2FREUICDRJPSVURXgETEhwNQlBDAhJTHUhRU0MKosBPTl9fEQCi0gJMQlBCQw8GCltRQh8='
    },
    {
      id: 'caso-012',
      data: '2026-10-03',
      titulo: 'El Silencio del Silo',
      relatorio: 'En la finca Boa Vista, el capataz Firmino Dutra fue encontrado sin vida al amanecer, en el fondo de la propiedad. El ganado bramaba desde las 4h y nadie de la casa grande oyó nada. La policía investiga el arma, el lugar exacto y el responsable.',
      pistas: ['La piel guarda tres perforaciones paralelas, igualmente espaciadas — como las puntas de una misma herramienta.', 'El gancho del galpón, donde la herramienta de campo suele descansar, amaneció vacío; el polvo dibujó su contorno.', 'Las suelas de quien estuvo en el fondo de la propiedad guardaban maíz del silo; la sala de ordeño fue lavada y el corral, revuelto.', 'El ganado bramaba desde las 4h; dos de los presentes solo aparecieron después del sol naciente.', 'La puerta del cuarto más nuevo del alojamiento no salió del picaporte aquella noche — a pesar de que las botas de su ocupante amanecieron mojadas de rocío.'],
      hashArma: '8614621565186512',
      hashLocal: '3433205096466785',
      hashAssassino: '3944029863795811',
      opcoesArma: ['Un Horquilla de Heno', 'Un Hacha de Leña', 'Un Mango de Arado', 'Un Látigo de Cuero', 'Un Martillo de Herrador'],
      opcoesLocal: ['El Silo de Granos', 'La Sala de Ordeño', 'El Corral del Ganado', 'La Casa del Capataz', 'El Galpón de Máquinas'],
      opcoesAssassino: ['El Peón Recién Llegado', 'La Hija del Hacendado', 'El Veterinario', 'La Cocinera de la Finca', 'El Comprador de Ganado'],
      dicaBoaArma: 'NxMWHA1ARFwXAABPXVFDUw8EHw5eEF9dQw8SDEheEVYGQRsAR1EdEg+i0htEV14SDQhTAkxCRVsPDRxVDVhQUQsAUwtIEF1XoNASQw1c8pMXCBQADVRUEgAUFh1CEEgSDgABG0RcXV1DBRZPRVVDQAIFHB0NQURXBwAdT0tFVEACT1M+WFVVUw1BHw5eEFVdEEEbCl9CUF8KBB0bTEMRVgZBEA5AQF4SBwQfT0pRXUKg0h1Pz7ClEhpBFgMNV1BcAAkcT1tRUvHODlMKQVlWV00=',
      dicaBoaLocal: 'LBMXCu6BXhIPAAUOSV8dEgAOAR1MXBFABhcGCkFEXhIaQRAOXlERVgYNUwxMQFBGAhtTBkNEUFEXAFMBQhBUShMNGgxMXhFXD0EeDu6dSxIGD1MDTEMRQRYEHw5eCxFDFgQXDg1VXRIFDh0LQhBVV0MNEk9dQl5CCgQXDkkQ07L3QRYBWUJUEgYNUxtMXkBHBkEXCg1XQ1MNDgBPVBBUXkMTFglYV1hdQwUWT0FRQhIOotIeWFlfUxBP',
      dicaBoaAssassino: 'Jg1TH0jzglxDExYMRPOYXEMNHwpKUVVdQwsGHe6DEVYMEx4GXxBUXEMEH09LX19WDE1TH0hCXhIQFABPT19FUxBBEgJMXlRRCgQBAEMQXF0JABcOXhBVV0MTHAzunV4SgeHnT1QQUlMRBhILTEMRVgZBHg7unUsSBwQfT15ZXV1N',
      dicasFracas: ['La sequía de este año quemó el pasto antes de lo previsto.', 'El café de la finca se sirve antes del sol, con el fuego encendido desde la víspera.', 'Los perros del corral ladran a cada carro que entra por el camino de tierra.', 'El maíz de la cosecha anterior todavía guarda olor a sol.'],
      epilogo: 'IhMQB0RGXhIABAEdTFReEgYNU18eHwACTUE2Aw1AVPHQD1MdSFNY8coPUwNBVVZTBw5TDEJeV1cQosBPSFwRVQwNAwoNU15cQw0ST0VfQ0MWCB8DTBBVV0MJFgFCHBFYFg8HAA1RXRIQCB8AFhBdUxBBEQBZUUISDg4ZDklRQhIHBFMdQlPynwxBHwANVFReAhUSHUJeHxIvAFMJRF5SU0MREhzugxFTQwIWHV9RQxIGDVMOQV9bUw4IFgFZXxFWBg1TCUJeVV1DAhwBDVxdUxUEXQ=='
    },
    {
      id: 'caso-013',
      data: '2026-10-04',
      titulo: 'La Luz que Falló',
      relatorio: 'El faro de Pedra Branca vivió su primera noche oscura en cuarenta años: el farero Artur Sem-Ramalho fue encontrado sin vida en lo alto de la torre, y la luz principal sigue apagada. La policía investiga el arma, el lugar exacto y el responsable.',
      pistas: ['El golpe en la cabeza vino de un metal claro y liso, sin óxido y sin borde cortante.', 'El fieltro de la caja de herramientas de la torre guarda el contorno de una pieza de mango corto y cabeza cilíndrica que ya no descansa en él.', 'El mecanismo que hacía girar la luz amaneció engrasado, aun con la luz fallada.', 'Las huellas en la escalera de la torre cuentan dos subidas aquella noche; solo la segunda bajada carga aceite pesado en los escalones.', 'La radio registró tres llamadas a la medianoche, todas respondidas por la misma voz de a bordo.'],
      hashArma: '7679532098266063',
      hashLocal: '6472290810190461',
      hashAssassino: '976043435973224',
      opcoesArma: ['Un Martillo de Latón', 'Un Mango de Hierro', 'Un Espejo de Señalización', 'Una Llave de Válvula', 'Una Linterna de a Bordo'],
      opcoesLocal: ['La Sala de la Lente', 'La Sala de las Baterías', 'El Mirador de las Guarniciones', 'La Cocina de la Guarnición', 'El Depósito de Aceite'],
      opcoesAssassino: ['El Ayudante del Faro', 'El Barquero de Provisiones', 'La Esposa del Farero', 'El Radio-Operador', 'El Cocinero de la Guarnición'],
      dicaBoaArma: 'LgQHDkEQUl8CExxPVBBdWhAOX09eWV8TAQ4BC0gQUlwRFRIBWVURXQpBBQZJQlhcWUEeDkNXXhMHBFMHRFVDQQxNUwpeQFRZDEEXCg1DVPDSAB8GV1FSWqDSHU9UEF1aDRUWHUNREUIWBBcOQxBXRgYTEkENYURWBwAdT0FRQhMHDgBPRVVDQQIMGgpDRFBAQwUWT0FRRfDQD1MLSBBdUkMCEgVMEFVWQw0ST1lfQ0EGTw==',
      dicaBoaLocal: 'Jg1TGURVX0cMQRcKQRBcWhEAFwBfEEgTBg1TC0hA8oAQCAcADVRUEwICFgZZVRFCFgQXDkMQV0YGExJPSVVdEwAIAQxYWUVcQwgdG0hCX1xYQQIaSFRQXUMFHBwNQlRQCg8HAF4QVF1DDRxPTFxFXEMFFk9BURFHDBMBCg3SsadDBB9PSVURXwJBAQBZUVJaoNIdT0lVEV8CQR8aVxBIEwYNUwtIEF1SEEERDllVQ/DOAABBDXxQEwQTEhxMEFRdQw0cHA1VQlACDRwBSEMRVwYCGgtIHg==',
      dicaBoaAssassino: 'Jg1TDlRFVVINFRZPSVVdEwUAAQANVV9UEQAArJ4QVF9DDBYMTF5YQA4OUwtIEF1SQw0GFQ1RQEYGDR8ODV5eUAsEUxYNVUJHAgMST15fXVxDBB1PQV8RUg8VHE9JVRFfAkEHAF9CVBMAFBIBSV8RXwJBHxpXEFdSDw2w3AM=',
      dicasFracas: ['La sirena de niebla sonó sin parar de la medianoche al amanecer.', 'La escalera de la torre tiene ciento ochenta escalones, todos gastados en el centro.', 'El aceite de la rotación se cambia cada luna llena, como manda el manual.', 'El barco de provisiones solo regresa en la próxima marea alta.'],
      epilogo: 'IhMQB0RGXhMABAEdTFReEwYNU18ZHwADTUE2Aw1RSEYHAB0bSBBVVg9BFQ5fXxFQDA8VCl7zghMGDVMIQlxBVkMCHAENVV0TDgABG0RcXVxDBRZPQVFF8NAPUxYNXFATBQAfA0wQV1wRGxILTBBUXUMNEk9BRUsIQzEWC19REXERAB0MTBBHXA8XGqyeEFATBAgBDl8QVF1DDRJPQFFVQRYGEgtMEEJaBBQaCkNEVB1DLRJPWV9DQQZBFA5D84ITEAQUGkNUXhMXFAEBQhBIExMUFh1ZUUITAA4dT11ZUlITDgEbSB4='
    },
    {
      id: 'caso-014',
      data: '2026-10-05',
      titulo: 'La Tesis Perdida',
      relatorio: 'En el Instituto Vasconcelos de Investigaciones, el profesor Donato Vaz fue encontrado sin vida en el ala de creación, en la madrugada previa a la defensa de su tesis final. El edificio estaba trancado desde las 22h. La policía investiga el arma, el lugar exacto y el responsable.',
      pistas: ['La herida es un único punto profundo, de punta fina y afilada — nada de hoja ancha, filo ni peso.', 'El estuche de dibujo amaneció con una punta de metal menos; el fieltro guarda el contorno de la pieza que salió.', 'El edificio se trancó a las 22h, pero el torno del bloque C registró un carné de estudiante después de eso.', 'La tesis final del profesor tenía un único oponente — y la defensa estaba marcada para la mañana siguiente.', 'El yeso en las suelas de alguien marca el camino del bloque C hasta el ala de creación, cuyas puertas internas amanecieron destrancadas.'],
      hashArma: '7360878216946860',
      hashLocal: '2827521286692306',
      hashAssassino: '7579496565708070',
      opcoesArma: ['Un Compás de Acero', 'Una Prensa de Imprenta', 'Un Frasco de Reactivo', 'Una Regla de Hierro', 'Un Buril de Mesa'],
      opcoesLocal: ['El Taller de Esculturas', 'El Anfiteatro del Bloque C', 'La Sala de Profesores', 'El Laboratorio de Estudios', 'La Biblioteca del Departamento'],
      opcoesAssassino: ['El Alumno-Opositor', 'La Secretaría del Instituto', 'El Conserje del Bloque', 'El Compañero de Cátedra', 'El Rector'],
      dicaBoaArma: 'LwBTH1heRVVDBxoBTBBIFBMTHAlYXlVVQwUaHF1VX0cCQRUdTENSW09BAx1IXkJVQxhTHUhXXVVDExwCT18LFBIUFgtMXhFYDBJTC0JDEV0NEgcdWF1UWhcOAE9JVRFEFg8HDg1UVBQPAFMCSENQFAcEUwtEUkReDE8=',
      dicaBoaLocal: 'LwBTHExcUBQHBFMfX19XURAOAQpeEEVdBg8WT19VVl0QFQEADVRUFAAIFh1fVR0UDwBTDURSXV0MFRYMTBBfW0MTFghEQ0VGoNJTA0hTRUERAFMWDVVdFAIPFQZZVVBAEQ5TDkBRX1EACLDcDVNeWkMNEhwNQ1hYDwAAT0heEVsRBRYBFhBAQQYFEgENVV0UAg0ST0lVEVcRBBIMRPOCWkOD8/sNVV0UBhIDDk5ZXhQHBFMDTEMRWwETEhwNXxFRD0EfDk9fQ1UXDgEGQhBHUQAIHQAD',
      dicaBoaAssassino: 'Jg1TDkFFXFoMTBwfQkNYQAwTUwNCEEVRDaLeDg1EXlAMQQMAXxBBUREFFh0NVV8UDwBTC0hWVFoQAFMLSBBdVUMMEqycUV9VQxIaCFhZVFoXBFONraQRTUMSBk9OUUNaoMhTCVhVEVEPQbDVQ1lSW0MEHU9MUkNdEUEWAw1EXkYNDlMLSENBQaDIAE9JVV0UAAgWHV9VHw==',
      dicasFracas: ['El instituto cierra a las 22h y reabre a las 6h, como manda la ordenanza.', 'El olor a yeso y tinta toma el pasillo del ala de creación.', 'Los avisos de las defensas de tesis cubren los murales desde hace una semana.', 'El aire acondicionado del bloque C falla en las noches de calor.'],
      epilogo: 'IhMQB0RGXhQABAEdTFReFAYNU18YHwAETUE2Aw1RXUEODxxCQkBeRwoVHB0NU15aBQQArJ4QVFhDBhwDXVURVwwPUwpBEFJbDhGwzl4QVVFDABAKX18dFAsOAQ5eEFBaFwQAT0lVEVgCQRcKS1VfRwJBAhpIEF1VQxUWHERDEVAGDVMfX19XURAOAU9EXUFRBwgBrIBRChQGDVMbTFxdURFBFwoNVUJXFg0HGl9RQhQEAB2snhBBXQAAAwBfRFQUDRQWGUIeEXEPQQcdRFJEWgINUx1IU15aEAgXCl/zghQGDVMMTFxUWgcAAQZCEFVRQwUWCUheQlUQTw=='
    }
  ];

  var FALLBACK_CASOS_EN = [
    {
      id: 'caso-001',
      data: '2026-09-22',
      titulo: 'The Clock That Stopped at 23:47',
      relatorio: 'The collector Álvaro Mendes was found lifeless in his library. Every clock in the house stopped at exactly 11:47 p.m., except one. The crime scene has been preserved and four people were in the mansion that night. The police must find the weapon, the exact location, and the person responsible.',
      pistas: ['The wound was deep with rounded edges, and no blade, no cord, no handle appeared at the scene.', 'The display case holds its dust evenly, except for one clean rectangle the size of a fist.', 'The night maid saw someone leave the room of books at 11:45 p.m. and return seven minutes later, hurrying.', 'Two residents have no alibi for 11:47 p.m.; one of them had hands stained with something that only exists in one room of the house.', 'The room where the victim fell has no windows and muffles any sound; the glass of the door fogged up from the inside that night.'],
      hashArma: '8461793769675991',
      hashLocal: '6098558121864924',
      hashAssassino: '1734326269364387',
      opcoesArma: ['The Pocket Watch', 'A Kitchen Knife', 'A Curtain Cord', 'A Bronze Candlestick', 'A Bronze Inkwell'],
      opcoesLocal: ['The Library', 'The Garden', 'The Kitchen', 'The Hallway', 'The Collector\'s Study'],
      opcoesAssassino: ['The Butler', 'The Housekeeper', 'The Daughter', 'The Nephew', 'The Family Doctor'],
      dicaBoaArma: 'LQ4HB0ReVxEXCRIbDVNFRRBNUxtEVUMRDBNTDVhCXkJZQQcHSBBbXwoHFk9EQxBCFwgfAw1fXhEKFQBPXkRRXwdNUxtFVRBSDBMXT0JeEEULBFMYRF5UXhRBGwBCWxBQDQVTG0VVEFICDxcDSENEWAAKUwBDEERZBkEHDk9cVR9DNRsKDV9SWwYCB09YQ1VVQwgAT05fXUECAgdDDVRVXxAEUw5DVBBSAgwWT0tCX1xDFRsKDVNfXQ8EEBtEX14RgeHnT1lHXxEOBAcOQRBAWAYCFhwNRFhQF0EVBlkQWV9DAFMfTFxdEREEHg5EXh4=',
      dicaBoaLocal: 'NwkWT0pRQlUGD1QcDUNfWA9BHQpbVUIRABMcHF5VVBEKDwcADURYVEMJHBpeVRBFCwAHT0NZV1kXTVMbRVUQWgoVEAdIXhBSDw4ACkkQUUVDUENPXR5dH0MAHQsNRFhUQwkSA0FHUUhDFhIcDV1VQwYNCk9OQl9CEAQXQQ1kWFRDAgEGQFUQWQIRAwpDVVQRCg9TDg1TXF4QBBdPX19fXEOD8/sNUV5VQxUbCl9VEFARBFMbWl8QXg1BBwdIEEVBEwQBT0tcX14RTw==',
      dicaBoaAssassino: 'NwkWT0NVQFkGFlMYQkVcVUMIHQdIQllFQxUbCg1TX10PBBAbRF9eEQoHUxtFVRBVAhQUB1lVQhEUBAEKDVRZQgoPGwpfWURUB0GR77kQUV8HQQcHSBBTXhMRFh0NVEVCF0EcAQ1YWUJDAgYJS0MQUgIMFk9LQl9cQwgdHERUVREXCRZPSVlDQQ8ACk9OUUNUT0EHB0gQQ1AOBFMAQ1UQRQsAB09OX0ZUEQQXT1lYVREOCAAcRF5XEQwDGQpORB4=',
      dicasFracas: ['Dinner was served at 8 p.m. and the dishes cleared without hurry, as on every night at the mansion.', 'The founder\'s portrait, on the living room wall, fogs up with September\'s humidity.', 'The housekeeper usually locks the service doors at 10 p.m. and keeps the key on the kitchen hook.', 'The family doctor is only called to the house in emergencies; it was his second visit that month.'],
      epilogo: 'JQgfCg1TXF4QBBdPQl4QAVpOQV0DEGRZBkEdCl1YVUZDAhwBS1VDQgYFUxtCEERZBkERA0JHEEYKFRtPRVlDERYPEANIF0MREw4QBEhEEEYCFRAHARBcRBEEF09PSRBFCwRTDEJAQFQRQRcaXkQQXgVBBwdIEFRYEBEfDlQQU1AQBF1PeVhVEQcABghFRFVDQwgdB0hCWUUGBVMbRVUQUgwNHwpORFleDU1TDkNUEEULBFMDRFJCUBEYUwBDU1URAgYSBkMQVFgQER8OVEMQVBUEARYNU1xeAApTja2kEFQbAhYfWRBfXwZP'
    },
    {
      id: 'caso-002',
      data: '2026-09-23',
      titulo: 'The Letter with No Sender',
      relatorio: 'An anonymous letter arrived at the local newspaper\'s newsroom reporting the theft of a rare jewel at the Oliveira mansion. The text was typed on an old typewriter. The safe was broken into during a dinner party and no one heard a thing. The police are investigating the weapon used, the location of the break-in, and who sent the letter.',
      pistas: ['Two parallel grooves, spaced like the arms of a claw, mark the safe\'s frame.', 'The residence\'s typewriter ribbon was replaced that week, and no one remembers who bought it.', 'One employee roamed the house all night with no set task; another, who claimed to be off duty, was recognized in the back alley at 9 p.m.', 'The residence\'s alarm stayed disarmed for exactly as long as it took to serve dessert.', 'The tip-off reached the newspaper with a postmark from the day before the theft — written by someone who knew of the crime beforehand.'],
      hashArma: '4367798776762882',
      hashLocal: '8287862504056878',
      hashAssassino: '256277973791072',
      opcoesArma: ['A Crowbar', 'A Typewriter', 'A Dagger', 'A Candelabrum', 'A Wrench'],
      opcoesLocal: ['The Oliveira Mansion', 'The Newspaper Newsroom', 'The Bank Vault', 'The Botanical Garden', 'The Dining Room'],
      opcoesAssassino: ['The Butler', 'The Maid', 'The Chauffeur', 'The Journalist', 'The Chef'],
      dicaBoaArma: 'NwkWT15RVldDBhIZSBBHUxpBBwANURBeBhcWHQEQXl0XQQcADVEQUA8AFwoNXl9AQwBTG0xSXFcXDgNPWlVZVQsVSU9aQllGCg8UT1lfX14QQRIBSRBfQA0AHgpDREMSAhMWT0JFRBxDNQQADUNEVwYNUxtCX1xBQwcBAEAQRFoGQQQAX1tDWgwRUx1IXVFbDUGR77kQUVwHQQcHSBBTXgIWVBwNQ1hTEwRTAEMQRFoGQRUdTF1VEhAEAw5fUURXEEEcAUgQVkAMDFMbRVUQXRcJFh0D',
      dicaBoaLocal: 'NwkWT05YUVwEBBdPX1lSUAwPX09ZWFUSBwgADl9dVVZDAB8OX10QUw0FUxtFVRBBBhMFCkkQVFsNDxYdDVJVXgwPFE9ZXxBGCwRTHExdVRICBRcdSENDCUMPFhheQl9dDk1TDUxeWxICDxdPSlFCVgYPUwtCEF5dF0EUDllYVUBDAB8DDURYQAYEXU95WFUSABMaAkgQQ0YCGBYLDVleQQoFFk9ZWFUSEQQABklVXlEGTVMGQxBREhEOHAINRUNXB0ESGw1eWVULFVMJQkIQVw0VFh1ZUVlcCg8UQQ==',
      dicaBoaAssassino: 'NwkWT0pfXFZDAwYbWV9eEgUOBgFJEFJLQxUbCg1DUVQGQREKQV9eVQYFUxtCEERaBkEeDkRUF0FDFB0GS19CX0OD8/sNUV5WQwgHT1pRQxIXCRZPQFFZVkMJFh1eVVxUQxYbAA0SVl0WDxdNDVlEHkMAUwxBRVUSFw4cT0pfX1ZDFRxPT1UQU0MCHAZDU1lWBg8QCgM=',
      dicasFracas: ['The jewel slept in a velvet case, inside a drawer with a false bottom.', 'The chef served dinner in three courses and left before the coffee, as the house requires.', 'The chauffeur washes the car every morning; that morning, he also waxed it.', 'The mansion has received illustrious guests since the days of the Oliverras\' grandfather.'],
      epilogo: 'JQgfCg1TXF0QBBdPQl4QAlpOQVwDEGRaBkEeDkRUEFQGDR9PWlhVXEMVGwoNV19eB0ERGllEX1xDBwEAQBBYVxFBHBhDEEVcCgccHUAQR1MQQRoLSF5EWwUIFgsNUkkSBQ4BCkNDWVEQWlMbRVUQUw0OHRZAX0VBQw0WG1lVQhIUAABPRVVCQU9BBB1ERERXDUEHAA1UWUQGEwdPXkVDQgoCGgBDHhBmCwRTDF9fR1ACE1MYTEMQQAYCHBlIQlVWQwgdT1lYVRIEAAELSF4cEgIPF09ZWFUSCQQECkEQQlcXFAEBSFQQRgxBBwdIEENTBQRd'
    },
    {
      id: 'caso-003',
      data: '2026-09-24',
      titulo: 'The Laboratory Enigma',
      relatorio: 'The scientist Dr. Bastos vanished from his own laboratory on the night of the experiment. The door was locked from the inside, but the half-open window reveals something suspicious. There is no sign of forced entry, and the body was removed without leaving clear traces. The police are investigating the weapon, the location, and the person responsible for the crime.',
      pistas: ['The body has no cuts, bruises, burns or shock marks — only a strange flush on the skin and altered breath.', 'One glass container on the workbench was found empty at dawn, its seal broken and no disposal record.', 'The badge that opened the turnstile after midnight had been left behind since the end of the shift, on a colleague\'s desk.', 'The counter cup holds lipstick on one side only — and the lab\'s routine forbids drinks at the workbench.', 'The window locked itself from the inside, and the glove marks stayed on the inner frame.'],
      hashArma: '7421477428536868',
      hashLocal: '3372657700637302',
      hashAssassino: '6171044675221855',
      opcoesArma: ['A Flask of Poison', 'A Glass Beaker', 'A Scalpel', 'A Wooden Club', 'A Bench Burner'],
      opcoesLocal: ['The Laboratory', 'The Parking Lot', 'The Security Room', 'The Storage Room', 'The Research Wing'],
      opcoesAssassino: ['The Assistant', 'The Lab Assistant', 'The Guard', 'The Neighboring Scientist', 'The Intern'],
      dicaBoaArma: 'NAgHBw1eXxMAFAccARBWXwIMFhwNX0ITCgwDDk5EHBMXCRZPWl9CWAEEHQxFEFFBEAQdDkEQXFwQBABPWVhVExACEgNdVVwfQxUbCg1SRUENBAFPTF5UExcJFk9aX19XBg9TDEFFUh1DNRsKDURHXEMGHw5eQxBQDA8HDkReVUEQQQcHTEQQWwwNF09OX15HBg8HHA1CVV4CCB1B',
      dicaBoaLocal: 'MA4aAwEQQlIKD1MOQ1QQUBEABwpeEFRcQw8cGw1dUUcACVMbRVUQQAAEHQoWEElSEQVfT0pFUUEHQQMAXkQQUg0FUxxZX0JSBARTDl9VEFwWFV1PeVhVEwIIAU9EQxBbBgAFFg1HWUcLQRAHSF1ZQBcTCk9MXlQTFwkWT0pcUUAQQR8ATltVV0MHAQBAEERbBkEaAV5ZVFZDg/P7DURYVkMSEAZIXkRaBQgQT0xCVVJDExYCTFleQE9BEQpZR1VWDUEHB0gQXVIKD1MdQl9dEwIPF09ZWFUTDQQaCEVSX0EKDxRPWlleVE0=',
      dicaBoaAssassino: 'NwkWT05FQBMMB1MbSFEQRAoVG09BWUBAFwgQBA1fXhMXCRZPX1ldExQAAE9eVUJFBgVTDVQQQ1wOBBwBSBBHWhcJUwlfVVUTAgIQCl5DEEcMQQcHSBBHXBEKEQpDU1gTgeHnT0xeVBMMDx8WDURYVkMAABxEQ0RSDRVTGEJCVRMXCRIbDUNYUgcEUwBLEFxaExIHBk5bHg==',
      dicasFracas: ['The lab runs on project funding and receives imported equipment every quarter.', 'The research assistant is absent-minded; he has lost three notebooks this semester.', 'The ether smell in the corridor lingers until late on distillation days.', 'The guard did his rounds dozing off, according to his own time sheet.'],
      epilogo: 'JQgfCg1TXFwQBBdPQl4QA1pOQVsDEGRbBkESHF5ZQ0cCDwdPTl9eVQYSAApJEERcQxIEDl1AWV0EQQcHSBBDUAoEHRtEQ0QUEEEHCkwQVlwRQQcHSBBCVgIGFgFZEFZBDAxTG0VVEFwTBB1PS1xRQAhNUxtMW1ldBEESC1tRXkcCBhZPQlYQRwsEUwNMUl9BAhUcHVQQV18MFxYcAxBkWwZBHwZdQ0RaAApTAEMQRFsGQRAaXRBXUhUEUwdIQhBSFAAKVA1DWFZDCABPXlVCRQoPFE9MEENWDRUWAU5VEFUME1MfX1VdVgcIBw5ZVVQTCw4eBk5ZVFZN'
    },
    {
      id: 'caso-004',
      data: '2026-09-25',
      titulo: 'The Out-of-Tune Violin',
      relatorio: 'During the gala rehearsal at the Aurora Theater, the conductor Érico Salgado was found lifeless in the orchestra pit. The lights flickered, the curtain fell and, when they came back up, he was no longer breathing. The theater was full, but no one saw the blow. The police must determine the weapon, the exact location, and the person responsible.',
      pistas: ['The mark on the neck is a thin, knotless groove, the line of something pulled between two points of tension.', 'The lead instrument\'s thinner string set was replaced hours before; the luthier never came to the theater.', 'The soles of whoever moved below the orchestra floor carried dark, resinous dust.', 'The lead soloist announced she would not sing the second act and left her dressing room before the blackout.', 'The curtain came down five minutes early — just enough time to reach the lowest level and return.'],
      hashArma: '396081097523264',
      hashLocal: '5349222566568616',
      hashAssassino: '2680712667409034',
      opcoesArma: ['A Violin String', 'A Conductor\'s Baton', 'A Lobby Candelabrum', 'A Pair of Costume Shears', 'A Violin Bow'],
      opcoesLocal: ['The Orchestra Pit', 'The Dressing Room', 'The Stage', 'The Lobby', 'The Auditorium'],
      opcoesAssassino: ['The Stagehand', 'The Soprano', 'The Lead Violinist', 'The Agent', 'The Assistant Conductor'],
      dicaBoaArma: 'NwkWT1lYWVpPQQYBT0JfXwYPUwhfX19CBkEaHA1eX0BDAxwdQxBfUkMAUw1BRV5AQwMfAFoQX0ZDAFMcRVFWQFlBEQ5ZX14YQwISAUlVXFUBEwYCDVFeUEMSGwpMQkMUAhMWT0JFRBpDNRsKDURHW0MSBw5KVRBDChMWHA1EWFUXQRIdSBBEUQ0SGgBDVVQUAQQHGEhVXhQXCRZPRVFeUBBBAQpAUVlaTQ==',
      dicaBoaLocal: 'MBUSCEgcEFgMAxEWDVFeUEMABgtERF9GChQeT1pVQlFDBwYDQRBfUkMECgpeEERcAhVTAURXWEBYQQQHTEQQRgYMEgZDQxBdEEEHB0gQXFEVBB9PT1VcWxRBBwdIEFZYDA4BT0xeVBQXCRZPTlxfRwYFUw1MU1tHFwAUCg3SsKBDAB0LDURYUUMTFhxEXl9BEEEXGl5EEFAGAhoLSEMQVgYVBApIXhBACwRTG1pfHg==',
      dicaBoaAssassino: 'NwkWT15fQEYCDxxPQV9DQEMVGwoNXFVVB0EBAEFVEEALBFMBRFdYQEMDFglCQlUUAg8XT15HX0YGQQcHSBBTWw0FBgxZX0IUQRYcGkFUEFoMFVMdSFFTXEMVGwoNRFhdEQVTDk5EEg9DFRsKDUNTWxEEUxhERFgUFwkWT1lfQlpDBRYLRFNRQAoOHUMNVl9BDQVTGkNUVUZDFRsKDVZCWw0VUx1CRxwUFAAAT0VVQkdN',
      dicasFracas: ['The box office sold out the night before; the corridors got crowded at intermission.', 'The stagehand checks the curtains three times per performance, always trembling.', 'The stage curtains are replaced every season, by custom of the house.', 'The agent demands results at every rehearsal; the conductor answers with silence.'],
      epilogo: 'JQgfCg1TXFsQBBdPQl4QBFpOQVoDEGRcBkEAAF1CUVoMQQQOXhBTWw0XGgxZVVQUFAkWAQ1EWFFDEh0OXUBVUEMXGgBBWV4UEBUBBkNXEEMCElMJQkVeUEMVHE9OUUJGGkEHB0gQU1sNBQYMWV9CExBBEQNCX1QPQxIbCg1YVUYQBB8JDVNFQEMVGwoNQ0RGCg8UT0xeVBQUBB0bDVRfQw1BBwANRFhRQxEaGwEQVlsPDRwYRF5XFBcJFk9fX0NdDUEXGl5EHhQ3CRZPbEVCWxEAUztFVVFABhNTHUhfQFENBBdPWllEXAwUB09FVUIUCg9TG0VVEFcCEgdB'
    },
    {
      id: 'caso-005',
      data: '2026-09-26',
      titulo: 'The Last Transmission',
      relatorio: 'In the early hours of Saturday, the announcer Válter Nobre interrupted the live program with a scream and was never seen again. The radio station was sealed off, and the transmission tape disappeared. The police are investigating the murder weapon, the exact location, and who erased the recording.',
      pistas: ['The groove on the neck is continuous, blade-less, left by a flexible and rough material.', 'The last sound before the scream was the click of a connector seating into the capture console.', 'The tape counter was zeroed and rewound fifteen minutes; the original reel never turned up in the archive.', 'The third-floor turnstile logs an exit at 1:05 a.m. and a return at 1:10 a.m., in the booth corridor.', 'The recording password was used ten minutes after the scream, by an audio-maintenance profile.'],
      hashArma: '3777761732563958',
      hashLocal: '6615111761553646',
      hashAssassino: '3645800150423781',
      opcoesArma: ['A Microphone Cable', 'A Magnetic Tape', 'A Metal Lamp', 'A Stapler', 'A Pair of Headphones'],
      opcoesLocal: ['Studio 3', 'The Control Booth', 'The Parking Lot', 'The Break Room', 'The Tape Archive'],
      opcoesAssassino: ['The Rival Announcer', 'The Sound Technician', 'The Station Director', 'The Night Watchman', 'The Receptionist'],
      dicaBoaArma: 'NwkWT0BRQl5DAhIDQUMQUwwTUxxCXVVBCwgdCA1cX1sETVMJQVVIXAENFk9MXlQVEQ4GCEUKEFMRABQGQVUQQQIRFkMNRFFXDwQHAF0QR1AKBhsbDVFeUUMFAQ5aVUIVDgQHDkEQUUcGQRwaWR4QYQsEUxtaXxBUAAIWHF5fQlwGElMAXVVCVBcOARwNQ1xcDQZTAFtVQhUXCRYGXxBDXQwUHwtIQhBHBgwSBkMe',
      dicaBoaLocal: 'LQQaG0VVQhUBExYORhBCWgwMX09DX0IVGgABCw1RXlFDDxwdDVFCVgsIBQoNWFFDBkEST0FZRlBDEhoIQ1FcD0MVGwoNQ1NHBgAeT1pRQxUTCBAESFQQQBNBHwZbVRwVFAgHBw1EWFBDAh8GTlsQWgVBEk9OX15bBgIHAF8QX1tDFRsKDVNfWxAOHwoDEGRCDEEAAFheVBURDhwCXhBCUA4AGgED',
      dicaBoaAssassino: 'NAkcCltVQhUGExIcSFQQQQsEUwNMQ0QVDggdGllVQxUMB1MbRVUQQQIRFk9FUVQVAgIQCl5DEEEMQQcHSBBdXBsIHQgNU19bEA4fCg3SsKFDAB0LDURYUEMVFgxFXllWCgAdT1pRQxUXCRZPQl5cTEMOHQoNRF8VFw4GDEUQRF0GQRYeWFlAWAYPB09PVVZaEQRTG0VVEEUMDRoMSBBRRxEIBQpJHg==',
      dicasFracas: ['The station has been losing audience to its rival since Carnival.', 'The announcer liked controversial interviews and never wanted security on air.', 'The break room serves strong coffee at any hour; the pot rarely goes cold.', 'The watchman makes his round every two hours and never goes up to the third floor.'],
      epilogo: 'JQgfCg1TXFoQBBdPQl4QBVpOQVkDEGRdBkEAAFheVBUXBBAHQ1lTXAIPUwxCXlZQEBIWCw1EXxUGExIcRF5XFRcJFk9ZUUBQQxUcT05fRlARQQYfDURYUEMCAQZAVQsVFwkWT15EWVkPTBcOQEAQWAoCAQBdWF9bBkEQDk9cVRUUAABPWVhVFRQEEh9CXh4VKwRTBl4QQ1ARFxoBShBYXBBBAApDRFVbAARfT0xeVBUwFQYLRF8QBkMPFhlIQhBUBAAaAQ1HVVsXQR8GW1UQVBdBBwdMRBBdDBQBQQ=='
    },
    {
      id: 'caso-006',
      data: '2026-09-27',
      titulo: 'The Garden of Statues',
      relatorio: 'At the opening of the Bandeirante Museum\'s open-air exhibition, the curator Heitor Prado was found collapsed among the sculptures. The night was moonless and the garden was lit only by torches. No one admits having approached him. The police are searching for the weapon, the location, and the person responsible.',
      pistas: ['The blow rose from below, from a long shaft with a heavy base — something made to hold or to light, not to cut or to nail.', 'The fallen sculpture took the impact on its base, not lateral pressure.', 'A single pair of footprints goes out and back along the same path through the flowerbed, without hesitating at the curves.', 'The last page of the logbook was torn out; the guard blames the wind.', 'The victim herself dismissed someone at the end of the day; that person left the works storage minutes later, with a spare key.'],
      hashArma: '6208217342240034',
      hashLocal: '159260580060764',
      hashAssassino: '5596240701860645',
      opcoesArma: ['A Bronze Torch', 'A Chisel', 'A Marble Statue', 'A Stone Hammer', 'A Stone Pedestal'],
      opcoesLocal: ['The Garden of Statues', 'The Main Gallery', 'The Curator\'s Office', 'The Museum Entrance', 'The Works Storage'],
      opcoesAssassino: ['The Night Guard', 'The Restorer', 'The Sponsor', 'The Art Journalist', 'The Photographer'],
      dicaBoaArma: 'Lw4dCA1DWFcFFVMOQ1QQXgYABRYNUlFFBk1TCF9ZQEYGBVMJX19dFgEEHwBaChBVCwgACkEcEEELDh8KDUNEVxcUFk9MXlQWBQgLCkkQQFMHBAAbTFwQVxEEUwBYRB4WNxYcT05fXFoGAgcGQl4QRgoEEApeEEReAhVTDl9VEF4GDRdPT0kQQgsEGh0NUlFFBkEBCkBRWVhDg/P7DV9eU0MDAQBDSlUaQw4dCg1DRFkNBF0=',
      dicaBoaLocal: 'NAAHDEVVVBYEAB8DSEJJGkMNHAxGVVQWDAcVBk5VEFcNBVMcWVFWUAYFUwpDREJXDQIWT0lfEFgMFVMKVUBcVwoPUwlCX0RGEQgdG14QWVhDAFMJQV9HUxEDFgsWEEReBkEcGllUX1kRElMdSF1RXw0SU42tpBBCCwRTHF1RU1NDDhVPWVhVFgcIAB9BUUlTB0EEAF9bQxYME1MbRVUQVw0PFhcNX1YWFwkWT15EX0QGBVMfRFVTUxBP',
      dicaBoaAssassino: 'NwkWT19VQ0IMExYdDVZZRAYFUxtFUUQWAgcHCl9eX1kNQRgBSEcQUxUEARYNQ0RXFxQWT09JEEIMFBAHDVFeUkMKHQpaEFVOAgIHA1QQR14KAhtPT1FDU0MWHBpBVBBRChcWT1pRSRYWDxcKXxBEXgZBBApEV1hCQw4VT0wQVlcPDV0=',
      dicasFracas: ['The open-air opening drew more visitors than expected; the garden lights were switched on at dusk.', 'The sponsor gave a long speech before dinner, as he does at every premiere.', 'The night guard\'s flashlight has had weak batteries since the last inspection.', 'The annex works have been waiting for restoration for two summers.'],
      epilogo: 'JQgfCg1TXFkQBBdPQl4QBlpOQVgDEGReBkEVBl9VVBYRBAAbQkJVREMCHAFLVUNFBgVTG0IQRF4GQREDQkcQQQoVG09ZWFUWARMcAVdVEEIMExAHFhBDXgZBGAFIRxBTFQQBFg1DRFcXFBZPRF4QQgsEUwtMQlsWAg8XT1lfQlNDDgYbDURYU0MNHAhPX19dQxESCEgeEGILBFMITEJUUw1BAQpCQFVYBgVfT0xeVBYXCRZPTlhZRhMEF09eRFFCFgRTGExDEEQGEgcAX1VUFgEYUw5DX0ReBhNTB0xeVBg='
    },
    {
      id: 'caso-007',
      data: '2026-09-28',
      titulo: 'The Shrouded Bridge',
      relatorio: 'The merchant ship Estrela do Norte docked with one passenger fewer. Captain Raul Vasquez was last seen on the command bridge, on a night of dense fog. The logbook has wet pages and an illegible note. The port police are investigating the weapon, the location, and the person responsible.',
      pistas: ['The head wound is angular with hard edges, and rust-free at the point of impact — polished metal, not sea-spray steel.', 'The instrument the captain used at dawn was wet outside and dry inside, as if hastily cleaned.', 'The helm compass pointed west while the logbook recorded a northern heading.', 'The officer due to take command at three took it at two and ordered the telegraphs silenced.', 'A letter dated that day, signed by the victim, was found in the drawer of the second in command.'],
      hashArma: '4378531877814538',
      hashLocal: '8278839471416058',
      hashAssassino: '8876763739289844',
      opcoesArma: ['A Brass Sextant', 'A Steel Cable', 'An Anchor', 'A Deck Machete', 'A Pocket Chronometer'],
      opcoesLocal: ['The Command Bridge', 'The Cargo Hold', 'The Main Deck', 'The Engine Room', 'The Captain\'s Cabin'],
      opcoesAssassino: ['The Cook', 'The First Mate', 'The Engineer', 'The Harbor Pilot', 'The Helmsman'],
      dicaBoaArma: 'Ig8UGkFRQhtDERwDRENYUgdBFgtKVRwXDQ5THVhDRA1DEgcKSFwQVAIDHwoBEFFZAAkcHQ1RXlNDDBIMRVVEUkMAAQoNX0VDTUEnGEIQQEUGAhocRF9eFwoPABtfRV1SDRUAT0JWEFURCBQHWRBdUhcAH09fVV1WCg9fT1pYWVQLQQcHSBBTVhMVEgZDEFtSExVTDVQQRF8GQRsKQV0e',
      dicaBoaLocal: 'NwkWT1pCX1kEQRsKTFRZWQRBEA5DEF9ZDxhTDUgQU1gRExYMWVVUFwUTHAINR1hSEQRTG0VVEF8MExoVQl4QXhBBBQZeWVJbBltTB0JcVBtDBRYMRhBRWQdBFgFKWV5SQxMcAEAQXF4GQREKQV9HFxcJFk9OX11aAg8XT0FZXlJNQScHSBBYUg8MUx9CQ0QXAg8XT1lYVRcAAAMbTFleEBBBEA5PWV4XEQQeDkReENXj9VMOQ1QQQwsEUwxCXUBWEBJTC0hTWVMGElMNSERHUgYPUxtFVV0Z',
      dicaBoaAssassino: 'NwkWT0tZQkQXQR4OWVUQQwwOGE9OX11aAg8XT0xYVVYHQRwJDUNTXwYFBgNIEFFZB0EbDkkQRF8GQRAOXURRXg1GAE9CR14XEAgUAUhUEEUGEhoIQ1FEXgwPUwNIRERSEUEaAQ1YWURDBQEOWlVCF4Hh509AX0ReFQRTDkNUEFgTERwdWUVeXhcYUwZDEERfBkEADkBVEFQCAxoBAw==',
      dicasFracas: ['The crew is small and has worked together since the Pacific route.', 'The dense fog that night forced reduced speed for almost three hours.', 'The cook complains about the cramped pantry on every crossing.', 'The harbor pilot boards only in the last miles, as regulations require.'],
      epilogo: 'JQgfCg1TXFgQBBdPQl4QB1pOQVcDEGRfBkEVBl9DRBcOAAcKDUdRREMAAR1IQ0RSB0EVAF8QRFYICB0IDVNfWg4AHQsNUVhSAgVTAEsQQ1QLBBcaQVULFxcJFk9fVUNeBA8SG0RfXhcPBAcbSEIQXg1BBwdIEFRFAhYWHQ1DVVYPBBdPWVhVFw4OBwZbVRwXAg8XT1lYVRcBExIcXhBDUhsVEgFZEEdWEEEHB0gQR1ICERwBAxBkXwZBNhxZQlVbAkEXAA1+X0UXBFMcTFlcREMUHQtIQhBWQw8WGA1TUUcXABoBARBRWQdBBwdIEFNYDhESHF4QQFgKDwccDV5fRRcJUw5KUVlZTQ=='
    },
    {
      id: 'caso-008',
      data: '2026-09-29',
      titulo: 'The Midnight Carriage',
      relatorio: 'The night train of the Central line stopped at a small through-station when the train chief Octávio Braga was found lifeless among the laid tables of one of the carriages. Fog covered the train and no one could have disembarked without a record. The police investigate the weapon, the exact location, and the person responsible.',
      pistas: ['The blow came down from above, from a long metal with a wrapped handle — no blade, glass or leather.', 'The meals carriage\'s table was set for two, but only one cup was used.', 'The on-board log records the last ticket check at 11:20 p.m. — and the signature that follows belongs to whoever checked after the train chief.', 'The drops of fog on the waxed floor stop exactly where the tablecloth remains laid.', 'The train\'s tool rack holds the powder outline of a long piece that no longer rests in it.'],
      hashArma: '1667863792758048',
      hashLocal: '8785146968658434',
      hashAssassino: '5264171783354072',
      opcoesArma: ['A Wheel Wrench', 'An Emergency Hammer', 'An Engraving Chisel', 'A Champagne Bottle', 'A Leather Belt'],
      opcoesLocal: ['The Dining Car', 'The Sleeping Car', 'The Service Corridor', 'The Brake of the Last Carriage', 'The Baggage Car'],
      opcoesAssassino: ['The Driver', 'The Train Chef', 'The Ticket Inspector', 'The Passenger in Seat 14', 'The On-Board Fireman'],
      dicaBoaArma: 'LQQaG0VVQhgEDRIcXhwQVgwTUwNIUURQBhNfT0NfQhgCQQAHQkJEGAQNEhVEVUIfEEEAB0xWRBgGGQMDTFleS0MVGwoNUlxXFFtTDUJERFQGTVMNSFxEGAIPF09IXVVKBAQdDFQQWFkODBYdDVFCXUMOBhsDEGRQBkEHHUxZXh8QQQcYQhBcVw0GUwJIRFFUQxUcAEFDEEoGDBIGQxDSuPdBEgFJEERQBkEDAFpUVUpDDgYbQVleXUMOHU9ZWFUYEQAQBA1TWFcMEhYcDVJVTBQEFgENRFhdDk8=',
      dicaBoaLocal: 'NwkWT15cVV0TCB0IDVNRSk9BBwdIEENdERcaDEgQU1cRExoLQkIQWQ0FUxtFVRBaEQAYCg1SX0BDCRIZSBBeV0MNEgZJEERZAQ0WVA1EWF1DER8OTlUQTwsEAQoNXEVfBAAUCg1ZQxgIBAMbDVFeXEMVGwoNX15dQxYbCl9VEEsKDQUKXxBDUAoPFhwNUUQYFwkWT1lRUlQGQQEKQFFZVkOD8/sNUV5cQxUbCg1UQlcTElMASxBWVwRBHAENRFhdQwcfAEJCEFsLDhwcSBBSXRcWFgpDEERQBkEHGEIe',
      dicaBoaAssassino: 'NwkWT1lZU1MGFVMGQ0NAXQAVHB0NU1hdAAoWCw1EWF1DDh1CT19RSgdBHwBKEFFMQ1BCVR8AEEhNDF1PTF5UGA4OBQpJEFFUDA8WT09VRE8GBB1PWVhVGAAAAR1EUVddEEESA0EQXlEECQdPz7CkGA0OUwBDVRBdDxIWT0VRVBgCQRUdSFUQSAISAEE=',
      dicasFracas: ['The mountain fog followed the train since the last tunnel.', 'The on-board kitchen closes at 11 p.m., as the line\'s rulebook requires.', 'The crossing horn sounds three times before every bridge.', 'The smell of coffee blends with coal in the corridors between carriages.'],
      epilogo: 'JQgfCg1TXFcQBBdPQl4QCFpOQVYDEGRQBkEaAV5AVVsXDgFPTl9eXgYSAApJEERXQxUbCg1SXFcUQQQGWVgQTAsEUxtfUVlWRBJTGEVVVVRDFgEKQ1NYFEMAB09ZWFUYFQQBFg1EUVoPBFMHSBBYWQdBAApZEFhRDhIWA0sLEEwLBFMAQx1SVwITF09BX1cYEQQQAF9UVVxDFRsKDVhfTRFBHAkNWFlLQwIcAUtVQ0sKDh1BDWRYXUMPGghFRBBLBhMFBk5VEE8GDwdPQl4QTQ0FFh0NUV5XFwkWHQ1SUVwEBF0='
    },
    {
      id: 'caso-009',
      data: '2026-09-30',
      titulo: 'The Silent Springboard',
      relatorio: 'After the last show of the Astreia Circus, the owner Horácio Pepê was found lifeless under the canvas of the arena. The lights went out early and the audience had already left. The police investigate the weapon, the exact location, and the person responsible.',
      pistas: ['The blow came down from a smooth, heavy sphere — no blade, wire or handle.', 'The spherical weight of the strongman act was found off its pedestal at dawn, with a dark scrape on the metal.', 'Sawdust clung to the soles of one of those present; the fine leather shoes of another remained clean.', 'Whoever was rehearsing in secret was not seen on the official stage during that fifteen-minute interval.', 'The back curtain opened at 10:15 p.m., fifteen minutes before the body was found.'],
      hashArma: '943991894437853',
      hashLocal: '963747663838488',
      hashAssassino: '1111331314053780',
      opcoesArma: ['An Iron Ball', 'A Saddle Whip', 'A Stage Dagger', 'A Brass Bell', 'A Trapeze Rope'],
      opcoesLocal: ['The Circus Ring', 'The Lead Dressing Room', 'The Treasurer\'s Wagon', 'The Training Track', 'The Mess Tent'],
      opcoesAssassino: ['The Clown', 'The Tightrope Walker', 'The Animal Tamer', 'The Magician', 'The Season Manager'],
      dicaBoaArma: 'NwkWT09cX05DBRYcTlVeXRBBFR1CXRBYQxIeAEJEWBVDCRYOW0kQShMJFh1IHBBOChUbT0NfEFsPABcKARBHUBEEUwBfEFhYDQUfChcQR1EKEV9PSVFXXgYTUw5DVBBLDBEWT0xCVRkMFAdBDWRYXEMVBAANQl9MDQVTAE9aVVoXElMASxBEUQZBEh1IXlEZEQQeDkReENvj9VMOQ1QQTQsEUwtMQlsZEAIBDl1VEFYNQQcHSBBdXBcAH09OWF9WEAQAT09VRE4GBB1PWVhVVE0=',
      dicaBoaLocal: 'JxMWHF5ZXl5DExwAQBwQTgIGHAENUV5dQxUWAVkQWFgVBFMYREReXBASFhwNX0IZFA4cC0heEF8PDhwdXgsQTQsEUxxMR1RMEBVTAEMQRFEGQQAAQVVDGRMOGgFZQxBNDEEHB0gQUUsGDxJPz7CkGQEEBxhIVV4ZFwkWT0hIWFABCAcGQl4QWgoTEANIEFFXB0EHB0gQREsCCB0GQ1cQSQ8ABwlCQl0X',
      dicaBoaAssassino: 'NwkWT0BRV1AACBIBDUZRVwoSGwpJEFZWEUEVBktEVVwNQR4GQ0VEXBBBGgENRFhcQwwaC0lcVRkMB1MHREMQVhQPUw5ORBDb4/VTG0VVEFwbABAbDUNAWA1BEQpZR1VcDUEHB0gQUlgAClMMWEJEWAoPUwBdVV5QDQZTDkNUEE0LBFMNQlRJGQEEGgFKEFZWFg8XQQ==',
      dicasFracas: ['The audience left early; the canvas still holds the echo of the last performance.', 'The arena\'s sawdust is changed every two days, by custom of the troupe.', 'The circus generator shudders every half hour, and the lights flicker with it.', 'The September wind lifts the canvas at the corners that are not tied down.'],
      epilogo: 'JQgfCg1TXFYQBBdPQl4QCVpOQF8DEGRRBkEeDkpZU1ACD1MMQl5WXBASFgsNRF8ZFwkWT09cX05DFhobRRBEUQZBGh1CXhBbAg0fT0tCX1RDFRsKDUNESwwPFAJMXhBYABVfT0VZVF0GD1MGQ0NZXQZBGwZeEF9ODUESH11RQlAXCBwBDURCUAAKSE9ZWFUZAAgBDFhDEFoCEwEGSFQQVg1BGhteEENcAhIcAQ1HWU0LDgYbDURYXEMXEgFEQ1hQDQZTG19ZU1JN'
    },
    {
      id: 'caso-010',
      data: '2026-10-01',
      titulo: 'Table Twenty-One',
      relatorio: 'At the Palácio de Cristal casino, the manager Basílio Quadros was found lifeless after closing, beside the tables shrouded in cloth. The chips appeared to be in order and three people were circulating in the building. The police investigate the weapon, the location, and the person responsible.',
      pistas: ['The blow to the temple came from a short, smooth, massive object, with no cutting edge and no long handle.', 'The house\'s toolbox was found one piece short at dawn; the felt lining holds the imprint of what left.', 'The chips of the last closed table were counted twice; the second count came up three hundred short.', 'The vault alarm tripped at 2:10 a.m., but the door stayed locked from the inside.', 'Whoever moved after the last round wore the green cashier\'s badge — a color carried by only two sectors of the casino.'],
      hashArma: '5294281985212506',
      hashLocal: '8020835739510877',
      hashAssassino: '1865723843613571',
      opcoesArma: ['A Nickel Knuckle Duster', 'A Vault Chisel', 'A Brass Scepter', 'A Velvet Cord', 'A Steel File'],
      opcoesLocal: ['Table Twenty-One', 'The Chip Vault', 'The Performers\' Dressing Room', 'The Casino Gatehouse', 'The Waiting Room'],
      opcoesAssassino: ['The Night Dealer', 'The Bar Singer', 'The Yard Watchman', 'The Barman', 'The Chip Supervisor'],
      dicaBoaArma: 'NwkWT09cXkdDCABPXlheQhdNUwlfX1wQAkEQA0JDVFRDBxocWRBQXgdBBAZZWF5FF0EST05FRQpDFxIaQUQRUwsIAApBHBFGBg0FClkQUl8RBVMOQ1QRQxcEFgMNVlhcBkESHUgQXkUXT1M4RVFFEAoSUxhCQl8QDA9TG0VVEVgCDxdPTF5VEBQJEhsNWUIQBBMaH11VVRAMD1MODUNZXxEVUxxFUVdEQxMWAkxZXx4=',
      dicaBoaLocal: 'NwkWT1tRRFwXQQAbTElUVEMNHAxGVVUQAg8XT1lYVBAEAAcKRV9EQwZBHwBKV1RUQw8cT11RQkMCBhZUDURZVUMFAQpeQ1heBEEBAEJdEUcCElMKQEBFSUMAHQsNXFhETUEnGEIQVlEOCB0IDUJeXw4SUx1IXVBZDUGR77kQUF4HQQcHSBBVXxYDHwoNU15FDRVTAEsQRVgGQRAHREBCEAcEEAZJVUIQAQQHGEhVXxAXCRYCAw==',
      dicaBoaAssassino: 'NwkWT05YWEBDEgYfSEJHWRAOAU9fUV8QFwkWT15VUl8NBVMMQkVfREMAHQsNR1RRERJTG0VVEVcRBBYBDVJQVAQEU42tpBFDCwRTGExDEUQLBFMDTENFEBcOUw1IEEJVBg9TDVQQRVgGQQAHX19EVAYFUxtMUl1VTQ==',
      dicasFracas: ['The casino closes at 2 a.m., as the city\'s license requires.', 'The blue chips are worth whatever the house decides that night.', 'The salon carpet muffles any hurried step.', 'The salon\'s air conditioning fails on hot nights.'],
      epilogo: 'JQgfCg1TXV8QBBdPQl4RAVNOQ14DEGVYBkEAGl1VQ0YKEhwdDVNeXgUEABxIVBFEDEEHB0gQU1wMFlMYRERZEBcJFk9BX1JbEAwaG0UXQhAIDwYMRlxUEAcUABtIQhFRDQVTG0VVEUMICB5PQlYRRAsTFgoNWEReBxMWCw1TWVkTEkhPWVhUEBUABgNZEEZREEEdCltVQxAMERYBSFQfEDcAEQNIEEVHBg8HFgBfX1VDEgcOVFVVEAANHBxIVBFWDBNTDg1dXl4XCV9PTF5VEBcJFk99UV3zwgIaAA1UVBAgExocWVFdEBEEAwNMU1RUQwgHHA1DREAGEwUGXlleXk0='
    },
    {
      id: 'caso-011',
      data: '2026-10-02',
      titulo: 'The Torn Codex',
      relatorio: 'At the Central Public Library, the archivist Lívia Cantos was found lifeless behind the iron grille that protects the most valuable wing of the collection. The building had been locked since 7 p.m. The police investigate the weapon, the exact location, and the person responsible.',
      pistas: ['The mark on the neck is a double, interrupted groove, with small square marks at regular intervals.', 'The visitors\' log records two entries into the locked room after 7 p.m. — and only one exit.', 'The iron grille of the rare wing opens with two keys alone: the janitor\'s and the director\'s.', 'The felt of the restoration bench holds a powder imprint of a piece that no longer rests upon it.', 'The smell of glue and leather filled the back corridor that night — where the collection awaits restoration.'],
      hashArma: '5608502896064974',
      hashLocal: '6316036225516031',
      hashAssassino: '7621561104444065',
      opcoesArma: ['An Archive Chain', 'A Reading Candlestick', 'A Bookbinding Chisel', 'A Bronze Paperweight', 'An Archive Shears'],
      opcoesLocal: ['The Rare Works Room', 'The Periodicals Corridor', 'The Loans Desk', 'The Collection Depot', 'The Reading Garden'],
      opcoesAssassino: ['The Night Librarian', 'The Visiting Researcher', 'The Janitor', 'The Bookbinder', 'The Archive Intern'],
      dicaBoaArma: 'NwkWT0pCXl4VBFMGXhBVXhYDHwoNUV9VQwgdG0hCQ0QTFRYLARBGWBcJUxxcRVBDBkEeDl9bQhECFVMGQ0RUQxUAHxwXEFARAQ0SC0gcEVBDEhsAX0QRQQwIHRsNUV9VQwBTAkxDQlgVBFMYSFlWWRdBFwANXl5FQwUBDloQRVkCFV1PblhYQgYNX09dUUFUERYWBkpYRRECDxdPXlhUUBESUw5fVRFeFhVTja2kEUULBFMbWl8RXAYVEgNeEEVZAhVTB0xeVhECDxdPWlVYVgtBAQpAUVhfTQ==',
      dicaBoaLocal: 'MBUSDEZVVRETBAEGQlRYUgINAEMNVFRBDBVTDUJIVEJDAB0LDV9BVA1BEgZfEFVeQw8cGw1VSUEPABoBDURZVEMNHAxGVVURBBMaA0FVChEXCRZPT1VCRU4GBg5fVFRVQxYaAUoQUF8HQQcHSBBUSQoVUwtIQ1oREQQeDkReEdPj9VMOQ1QRRQsEUxlEQ1hFDBMASA1cXlZDBRYMRFRUQk0=',
      dicaBoaAssassino: 'NwkWT09fXloBCB0LSEIRRgISUxtFVRFeDQ0KT0JeVBEMD1MOQxBUSRcEHQtIVBFCCwgVGw1EWVAXQR0GSlhFEYHh509MXlURCwQBT0NRXFRPQQAbX0VSWkMVGx1CRVZZQwgdT11VX1IKDV9PTEBBVAITAE9EXhFFCwRTGURDWEUMEwBIDVxeVkMOFU9ZWFQRDw4QBEhUEUMMDh5B',
      dicasFracas: ['The rare wing\'s lamps cast amber light, to protect the paper.', 'The smell of glue and leather takes over the back corridor on restoration days.', 'The hall clock loses two minutes a week, and no one fixes it.', 'In summer, the reading garden fills with students until dusk.'],
      epilogo: 'JQgfCg1TXV4QBBdPQl4RAFNOQ10DEGVZBkERAEJbU1gNBRYdDVNeXwUEABxIVBFFDEEHB0gQU10MFlMYRERZERcJFk9OX11dBgIHBkJeEVILABoBARBVQwoXFgENUkgRFwkWT05fVVQbQQcHTEQRXwYXFh0NQlRQAAkWCw1YVENDCRIBSUMKERcJFk9bWUJYFw4BHAoQXV4EQRcASEMRXwwVUwNEVR8RNwkWT19RQ1RDFhwdRkMRQwwOHk9fVV5BBg8WCw1HWEULQR0KWhBSUA4EAQ5eHg=='
    },
    {
      id: 'caso-012',
      data: '2026-10-03',
      titulo: 'The Silence of the Silo',
      relatorio: 'At the Boa Vista farm, the foreman Firmino Dutra was found lifeless at dawn, in the far end of the property. The cattle had been bellowing since 4 a.m. and no one from the big house heard anything. The police investigate the weapon, the exact location, and the person responsible.',
      pistas: ['The skin bears three parallel punctures, evenly spaced — like the tines of a single tool.', 'The barn hook, where the field tool usually rests, was found empty at dawn; dust drew its outline.', 'The soles of whoever was at the far end of the property carried corn from the silo; the milking parlor was washed and the corral turned over.', 'The cattle bellowed from 4 a.m.; two of those present only appeared after sunrise.', 'The door of the newest room in the bunkhouse never left the latch that night — even though its occupant\'s boots came out dew-soaked.'],
      hashArma: '352568488566641',
      hashLocal: '2365755996029493',
      hashAssassino: '2170018399533294',
      opcoesArma: ['A Hay Fork', 'A Wood Axe', 'A Plow Handle', 'A Leather Whip', 'A Farrier\'s Hammer'],
      opcoesLocal: ['The Grain Silo', 'The Milking Parlor', 'The Cattle Corral', 'The Foreman\'s House', 'The Machine Shed'],
      opcoesAssassino: ['The Newly Arrived Ranch Hand', 'The Farmer\'s Daughter', 'The Veterinarian', 'The Farm Cook', 'The Cattle Buyer'],
      dicaBoaArma: 'NwkBCkgQQVMRAB8DSFwRRgoPFhwNUUNXQw8cGw1SXkANQRwJDVJdUwcEX09aWFhCQw4BT0VRXF8GE0lPWl9eVkMACwoBEF1XAhUbCl8QRloKEVMOQ1QRVAITAQZIQhZBQwkSAkBVQxICExZPQkVFHEM1GwoNUlBADUYAT1lHXhIFCBYDSRBFXQwNAE9fVVxTCg9Tja2kEVMNBVMbRVURVw4RBxYNWF5dCEEQB0JfQlcQTw==',
      dicaBoaLocal: 'NAAAB0hUEUICEx8AXxwRRhYTHQpJHV5EBhNTDEJCQ1MPQRIBSRBQXEMIHRtMU0USBQ4BCkBRXxUQQRsAWENUEgcOUwFCRBFXGxEfDkReEUYLBFMMQkJfEgwPUxtFVRFBDA0WHBYQRVoGQRUOXxBUXAdBHAkNRFlXQxEBAF1VQ0YaQQEKQFFYXBBBke+5EFNXFxYWCkMQRVoGQRQdTFlfEhcAHQQNUV9WQxUbCg1dUFELCB0KXhcRQQsEHxtIQh8=',
      dicaBoaAssassino: 'NwkWT0NVRl4aQRIdX1lHVwdBAQ5DU1kSCwAdCw1DRl0RBFMHSBBCXgYRB09MRBFGCwRTCUxCEVcNBV9PT0VFEgsIAE9PX15GEEEQDkBVEV0WFVMLSEccQQwAGApJENOy90ESAUkQXV0CBRYLDUdYRgtBEABfXhFUEQ4eT1lYVBIQCB8AAw==',
      dicasFracas: ['This year\'s drought burned the pasture earlier than expected.', 'The farm\'s coffee is served before sunrise, with the fire lit since the night before.', 'The corral dogs bark at every car that comes down the dirt road.', 'Last season\'s corn still smells of sun.'],
      epilogo: 'JQgfCg1TXV0QBBdPQl4RA1NOQ1wDEGVaBkEdClpcSBICEwEGW1VVEhEAHQxFEFlTDQVTDEJeV1cQEhYLDUReEhcJFk9PXF5FQxYaG0UQRVoGQRsOVBBXXREKX09PVUJbBwRTG0VVEUEKDRxUDURZV0MFFhgAQ15TCAQXT09fXkYQQRQOW1URWgoMUw5aUUgcQzUbCg1WUEAOQREKSlFfEg8OEAREXlYSFwkWT09RUllDAwYBRlheRxAEXQ=='
    },
    {
      id: 'caso-013',
      data: '2026-10-04',
      titulo: 'The Light That Failed',
      relatorio: 'The Pedra Branca lighthouse lived its first dark night in forty years: the lighthouse keeper Artur Sem-Ramalho was found lifeless at the top of the tower, and the main light remains off. The police investigate the weapon, the exact location, and the person responsible.',
      pistas: ['The blow to the head came from a bright, smooth metal, without rust and without a cutting edge.', 'The felt of the tower\'s toolbox holds the outline of a piece with a short handle and cylindrical head that no longer rests in it.', 'The mechanism that turned the light was found freshly greased, even with the light failed.', 'The footprints on the tower stairs tell of two climbs that night; only the second descent carries heavy oil on the steps.', 'The radio logged three calls at midnight, all answered by the same on-board voice.'],
      hashArma: '1377935481650799',
      hashLocal: '7456382187295362',
      hashAssassino: '4910074084247916',
      opcoesArma: ['A Brass Hammer', 'An Iron Handle', 'A Signaling Mirror', 'A Valve Wrench', 'An On-Board Lantern'],
      opcoesLocal: ['The Lens Room', 'The Battery Room', 'The Crew\'s Lookout', 'The Crew\'s Kitchen', 'The Oil Depot'],
      opcoesAssassino: ['The Lighthouse Assistant', 'The Supply Boatman', 'The Keeper\'s Wife', 'The Radio Operator', 'The Crew\'s Cook'],
      dicaBoaArma: 'IRMaCEVEHRMQDBwAWVgRXgYVEgMBEEZaFwlTAUIQUkYXFRoBShBUVwQEUw5DVBFdDEEUA0xDQglDCAEAQxBZUg0FHwoBEEJaBA8SA0ReVhMOCAEdQkIRUg0FUwNMXkVWEQ9TDl9VEVwWFV1PeVhUExcOHANPX0kUEEEHGEIQU0ECEgBPWV9eXxBBAQpAUVhdTQ==',
      dicaBoaLocal: 'NwkWT0FfXlgMFAdIXhBGWg0FUw5DVBFHCwRTAERcEVcGERwbDVZQXw9BHBpZQ1hXBkEHB0gQWF0XBAEBTFwRUAoTEBpERAoTFxYcT19fXl4QQRIbDURZVkMVHB8NX1cTFwkWT1lfRlYRQQEKQFFYXUOD8/sNRFlWQw4dCg1fVxMXCRZPQVlWWxdGAE9fX0VSFwgcAQ1RX1dDFRsKDV9fVkMOFU9ZWFQTAQAHG0hCWFYQT1M7RVURVBEEEhxIEF5dQxUbCg1DRVYTElMLSFNYVwYSXQ==',
      dicaBoaAssassino: 'NwkWT0FZVlsXCRwaXlURUhASGhxZUV9HQwYBCkxDVFdDFRsKDVxYVAsVVBwNXVRQCwAdBl5dEUcLAAdPQ1lWWxdBEgFJEEZSEEESA0JeVBMCFVMbRVURRwwRUwBLEEVbBkEHAFpVQxMUCRYBDURZVkMNGghFRBFVAggfCkke',
      dicasFracas: ['The foghorn sounded nonstop from midnight to dawn.', 'The tower stairs have one hundred and eighty steps, all worn at the center.', 'The rotation oil is changed every full moon, as the manual requires.', 'The supply boat only returns on the next high tide.'],
      epilogo: 'JQgfCg1TXVwQBBdPQl4RAlNOQ1sDEGVbBkEfBkpYRVsMFAAKDVFCQAoSBw5DRBFQDA8VCl5DVFdDFRxPWVhUEwENHBgNR1hHC0EHB0gQU0ECEgBPRVFcXgYTUw5DVBFHCwRTCUJCUlYHQRUORFxEQQZBHAkNRFlWQw0aCEVEChMzBBcdTBBzQQIPEA4NRERBDQQXT0xXUFoNQQcHSBBXXA8NHBhEXlYTBwAEAQMQZVsGQQcAWlVDEwQAGgFIVBFSQxIWDEJeVRMUAAcMRRBQXQdBFwBCQkITFAgHBw1cUEcACRYcAw=='
    },
    {
      id: 'caso-014',
      data: '2026-10-05',
      titulo: 'The Lost Thesis',
      relatorio: 'At the Vasconcelos Research Institute, professor Donato Vaz was found lifeless in the creation wing, in the small hours before the defense of his final thesis. The building had been locked since 10 p.m. The police investigate the weapon, the exact location, and the person responsible.',
      pistas: ['The wound is a single deep point, of a fine, tapered tip — nothing of a wide blade, an edge or a weight.', 'The drawing case was found one metal tip short at dawn; the felt holds the outline of the piece that left.', 'The building locked at 10 p.m., but the Block C turnstile logged a student card after that.', 'The professor\'s final thesis had a single challenger — and the defense was scheduled for the next morning.', 'Plaster on someone\'s soles marks the path from Block C to the creation wing, whose inner doors were found unlocked.'],
      hashArma: '7638347048766672',
      hashLocal: '711314166000530',
      hashAssassino: '6698596566916403',
      opcoesArma: ['A Steel Compass', 'A Printing Press', 'A Reagent Flask', 'An Iron Ruler', 'A Bench Woodcut Tool'],
      opcoesLocal: ['The Sculpture Studio', 'The Block C Amphitheater', 'The Professors\' Room', 'The Study Laboratory', 'The Department Library'],
      opcoesAssassino: ['The Thesis Opponent', 'The Institute Secretary', 'The Block Janitor', 'The Classmate', 'The Dean'],
      dicaBoaArma: 'IkEVBkNVHRQHBBYfDURYREMTBgNIQxFbFhVTCUFRQl9PQQMdSENCFAIPF09PXERaF0EBGkFVQw5DFRsKDURGW0MRHAZDRFRQQwgdHFlCRFkGDwccDV9XFBcJFk9JQlBDCg8UT09VX1cLQQEKQFFYWk0=',
      dicaBoaLocal: 'NwkWT11CXlIGEgAAX0MWFBEOHAINWFBHQwBTDEFfQl0NBlMdSFNeRgdNUxtFVRFYCgMBDl9JEVgMBhQKSRBfW0MTFg5JWV9TQwAdCw1EWVFDAB4fRVlFXAYABwpfEEZVEEEVAFheVRQUCAcHDVNZVQoTAE9EXhFbEQUWHRYQRVwGQRAdSFFFXQwPUxhEXlYUEQQeDkReQhSB4edPWVhUFBAREgxIEF5SQxUbCg1RQ0AUDgEEXhBeRkMVGwoNXlRdBAkRAF9ZX1NDDRINQkJQQAwTCkE=',
      dicaBoaAssassino: 'NwkWT1lYVEcKElMAXUBeWgYPB09FUVUUBhcWHVREWV0NBlMbQhBdWxAEUw5ZEEVcBkEdClVEEVkMEx0GQ1cWR0MFFglIXkJRQ4Pz+w1RX1BDCRocDVNQRgdBBA5eEEVcBkEcAUFJEVsNBFMbQhBeRAYPUxtFVRFAFhMdHFlZXVFDABUbSEIRWAwCGAtCR18a',
      dicasFracas: ['The institute closes at 10 p.m. and reopens at 6 a.m., as the bylaws require.', 'The smell of plaster and ink takes over the creation wing\'s corridor.', 'The thesis-defense notices have covered the notice boards for a week.', 'Block C\'s air conditioning fails on hot nights.'],
      epilogo: 'JQgfCg1TXVsQBBdPQl4RBVNOQ1oDEGVcBkEHB0hDWEdDDgMfQl5UWhdBEABDVlRHEAQXT1lfEUALBFMNQV9GFBQIBwcNRFlRQxIHCkhcEVcMDAMOXkMdFAsOBh1eEFNRBQ4BCg1EWVFDBRYJSF5CUUMVGwoNQENbBQQAHEJCFkdDFRsKXllCFBQOBgNJEFNYDAIYVA1EWVFDEhAaQUBFQREEUxxZRVVdDEEUDkReVFBDAFMBSEcRWAIVEAcDEGVcBkERAExCVRQRBBAAQ0NYUAYTFgsNRFlRQwUWCUheQlFDAhIDSF5VVRFP'
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

    var revSrc = obj.revelados && typeof obj.revelados === 'object' ? obj.revelados : {};
    var revelados = {
      arma: typeof revSrc.arma === 'string' ? revSrc.arma : '',
      local: typeof revSrc.local === 'string' ? revSrc.local : '',
      assassino: typeof revSrc.assassino === 'string' ? revSrc.assassino : ''
    };

    return {
      date: date,
      lives: lives,
      history: history,
      status: status,
      armaOk: toBool(obj.armaOk),
      localOk: toBool(obj.localOk),
      weakIdx: weakIdx,
      revelados: revelados
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
          weakIdx: p.weakIdx,
          revelados: p.revelados || { arma: '', local: '', assassino: '' }
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
    var rev = progress.revelados || {};
    // Textos do Painel de Evidências vêm do option selecionado/derivado por
    // hash no locale atual — nunca de plaintext oculto.
    var arma = textForHash(caso.opcoesArma, caso.hashArma) || String(rev.arma || '');
    var local = textForHash(caso.opcoesLocal, caso.hashLocal) || String(rev.local || '');
    var assassino = won
      ? (textForHash(caso.opcoesAssassino, caso.hashAssassino) || String(rev.assassino || ''))
      : '';
    setEvidence('evidence-weapon', arma, won || progress.armaOk);
    setEvidence('evidence-location', local, won || progress.localOk);
    setEvidence('evidence-killer', assassino, won);
  }

  function textForHash(lista, hash) {
    if (!Array.isArray(lista)) return '';
    var target = String(hash === null || hash === undefined ? '' : hash);
    if (target === '') return '';
    for (var i = 0; i < lista.length; i++) {
      if (answerHash(lista[i]) === target) return String(lista[i]);
    }
    return '';
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
    var ep = caso && typeof caso.epilogo === 'string' ? decodeSecret(caso.epilogo, caso.id).trim() : '';
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

  function win(caso, progress, chosen) {
    var now = new Date();
    var todayKey = getDateKey(now);
    var yesterdayKey = getYesterdayKey(now);
    var ch = chosen || {};

    progress.status = STATUS_WON;
    progress.revelados = {
      arma: String(ch.arma || (progress.revelados && progress.revelados.arma) || ''),
      local: String(ch.local || (progress.revelados && progress.revelados.local) || ''),
      assassino: String(ch.assassino || (progress.revelados && progress.revelados.assassino) || '')
    };
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
        killer: String(ch.assassino || ''),
        weapon: String(ch.arma || ''),
        location: String(ch.local || ''),
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

    // Palpite já validado contra o array de opções (isValidOption acima).
    // A resposta correta é comparada por hash do texto selecionado.
    var chosenWeapon = String(caso.opcoesArma[Number(weapon)]);
    var chosenLocation = String(caso.opcoesLocal[Number(location)]);
    var chosenKiller = String(caso.opcoesAssassino[Number(killer)]);

    var weaponOk = answerHash(chosenWeapon) === String(caso.hashArma);
    var locationOk = answerHash(chosenLocation) === String(caso.hashLocal);
    var killerOk = answerHash(chosenKiller) === String(caso.hashAssassino);

    // Descobertas persistem entre tentativas (texto do próprio option).
    if (weaponOk) {
      progress.armaOk = true;
      progress.revelados.arma = chosenWeapon;
    }
    if (locationOk) {
      progress.localOk = true;
      progress.revelados.local = chosenLocation;
    }

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
      win(caso, progress, { arma: chosenWeapon, local: chosenLocation, assassino: chosenKiller });
      return;
    }

    var hints = [];

    if (weaponOk && locationOk) {
      // Sem perder vida; dica boa do assassino (decodificada só aqui).
      hints.push({ type: 'good', text: decodeSecret(caso.dicaBoaAssassino, caso.id) });
    } else if (weaponOk) {
      progress.lives -= 1;
      hints.push({ type: 'good', text: decodeSecret(caso.dicaBoaLocal, caso.id) });
      hints.push({ type: 'weak', text: consumeWeakHint(caso, progress) });
    } else if (locationOk) {
      progress.lives -= 1;
      hints.push({ type: 'good', text: decodeSecret(caso.dicaBoaArma, caso.id) });
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
        weakIdx: 0,
        revelados: { arma: '', local: '', assassino: '' }
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
