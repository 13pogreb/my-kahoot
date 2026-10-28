const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

const upload = multer({ dest: 'uploads/' });

// ВШИТАЯ БАЗА 100 КЛЮЧЕЙ + МАСТЕР-КЛЮЧ
const HARDCODED_KEYS = [
  'MLK26-POGR-EBNY-AK01',
  'MLK26-L5M7-HYZJ-TOFM',
  'MLK26-YO4N-INYR-JCU1',
  'MLK26-53LB-2MSG-CK19',
  'MLK26-1QS3-6BHP-OACQ',
  'MLK26-IVLT-UH0P-3XNL',
  'MLK26-AIBL-VB3L-52E0',
  'MLK26-XD29-RBI3-WG64',
  'MLK26-X0VY-RIKU-UZQN',
  'MLK26-GLA9-HM6V-RHUV',
  'MLK26-3MEF-EPZN-4BRN',
  'MLK26-LEKT-UDMP-EJC6',
  'MLK26-FDQ3-6HQF-JU1K',
  'MLK26-BAJC-HPGQ-G80H',
  'MLK26-BY3J-5Y2U-KFRH',
  'MLK26-3XWO-7F5W-K1EU',
  'MLK26-H5KA-QSRM-GOV6',
  'MLK26-A76D-GQXN-VXPY',
  'MLK26-0P5J-JPA6-6RF1',
  'MLK26-YTH8-2UO6-AGKU',
  'MLK26-17TD-1G7C-M7NI',
  'MLK26-IVAM-65T8-LW2O',
  'MLK26-CXE4-EUSJ-SK1G',
  'MLK26-96M2-2V4R-9A6N',
  'MLK26-H76O-YPJ3-401U',
  'MLK26-90RM-HAOE-LMDI',
  'MLK26-46GY-UXDH-OUDC',
  'MLK26-J24M-0WJI-N7E8',
  'MLK26-0DEP-YGKO-4MR3',
  'MLK26-T9CJ-F3YA-JNUZ',
  'MLK26-SL3N-V3BD-L1RQ',
  'MLK26-KV48-H829-OH8P',
  'MLK26-3IN0-GOM1-B4M5',
  'MLK26-8PH2-NT9Q-2MV9',
  'MLK26-J3VU-C57O-T57F',
  'MLK26-0H2L-USYA-4SVJ',
  'MLK26-2C0B-WTDY-R9SE',
  'MLK26-RD3E-3R0U-HQ0I',
  'MLK26-SE54-ZFHV-V15H',
  'MLK26-BT5L-R3B0-QP6M',
  'MLK26-AFVH-ZY74-F0Q4',
  'MLK26-0U7E-730I-3HYD',
  'MLK26-8D5V-7TXY-O0IL',
  'MLK26-XV3M-IA6R-BEIY',
  'MLK26-6GKS-QX48-IN7T',
  'MLK26-QOMW-CILR-GR0T',
  'MLK26-9VGH-IHPM-S674',
  'MLK26-RI0X-84BM-VIG0',
  'MLK26-O06W-YIHU-DPG5',
  'MLK26-SAJ4-7XB8-J6P8',
  'MLK26-XOVM-4LPW-NHI0',
  'MLK26-FPEI-4WFR-MTOX',
  'MLK26-XY0H-RN83-D9R5',
  'MLK26-KYIP-OICL-YGHO',
  'MLK26-4TB3-5CTO-BT7E',
  'MLK26-X25I-D05V-DY3W',
  'MLK26-KHP5-8LGM-63FV',
  'MLK26-H0Z7-6VZS-67ZS',
  'MLK26-EWFS-5GRJ-20N7',
  'MLK26-Z1UJ-B24S-1KD5',
  'MLK26-0VF2-FIM2-BH4A',
  'MLK26-ANK1-E7KB-86D0',
  'MLK26-6FLU-JIS1-HBA4',
  'MLK26-0WX6-DN2K-Z73X',
  'MLK26-Z1YV-FBPG-LKSJ',
  'MLK26-HT5O-R9UQ-8BYJ',
  'MLK26-AWH9-P3SU-6H8P',
  'MLK26-PDK8-NYUP-ZS5A',
  'MLK26-O1PJ-SU6F-PGQB',
  'MLK26-F9DQ-F6KG-BHKV',
  'MLK26-VU4L-LUJX-EJGL',
  'MLK26-4N7B-V2A8-CK78',
  'MLK26-3UO5-B367-VPN6',
  'MLK26-YUE0-LRO2-VYAB',
  'MLK26-3I7J-GE6I-0RAJ',
  'MLK26-XAZL-BVCT-SQXC',
  'MLK26-MC78-ZG72-XI0U',
  'MLK26-XM40-TS5F-KWSP',
  'MLK26-VJPG-UKNP-N079',
  'MLK26-B6YK-KLOC-4N79',
  'MLK26-VNL2-4OKV-UFH7',
  'MLK26-SP0Y-2HAG-GQ4U',
  'MLK26-NYZW-PNLO-46GD',
  'MLK26-5FR8-ROTV-X4Y7',
  'MLK26-ZLVQ-W0HA-GZY5',
  'MLK26-DUXP-4BG0-48YH',
  'MLK26-7JEU-WDKR-18AK',
  'MLK26-IYVP-58WM-NS79',
  'MLK26-PN7H-WGP3-CQA3',
  'MLK26-VOHI-HN5P-BURF',
  'MLK26-QTC1-TAXO-UDWT',
  'MLK26-ELM0-BWOT-TC6R',
  'MLK26-DX0N-AQZP-R7TE',
  'MLK26-1T5H-OAFH-5NOE',
  'MLK26-R5EX-9MNK-78A6',
  'MLK26-SRE0-C3LQ-0VD8',
  'MLK26-XVGS-X9NV-D0NJ',
  'MLK26-UAP7-A847-8U32',
  'MLK26-4WQJ-B9GO-LU2W',
  'MLK26-QXLD-7KSM-GTSC',
  'MLK26-UHI7-WVRE-6VB3'
];

const activeLicenses = {};

function validateLicenseKey(key) {
  if (!key) return { valid: false, message: 'Ключ ліцензії відсутній!' };
  
  const cleanKey = key.trim().toUpperCase();
  const exists = HARDCODED_KEYS.some(k => k.toUpperCase() === cleanKey);

  if (!exists) {
    return { valid: false, message: 'Недійсний ключ ліцензії!' };
  }

  const now = new Date();

  if (!activeLicenses[cleanKey]) {
    const exp = new Date();
    exp.setDate(exp.getDate() + 365);
    activeLicenses[cleanKey] = {
      activatedAt: now.toISOString(),
      expiresAt: exp.toISOString()
    };
    return { valid: true, expiresAt: exp.toISOString() };
  }

  const lic = activeLicenses[cleanKey];
  if (new Date(lic.expiresAt) < now) {
    return { valid: false, message: 'Термін дії вашої ліцензії закінчився!' };
  }

  return { valid: true, expiresAt: lic.expiresAt };
}

app.post('/api/license/verify', (req, res) => {
  const { licenseKey } = req.body;
  const result = validateLicenseKey(licenseKey);
  res.json(result);
});

const rooms = {};

function generatePin() {
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[pin]);
  return pin;
}

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.json({ success: true, imageUrl: null });
  try {
    const uploadResult = await cloudinary.uploader.upload(req.file.path);
    res.json({ success: true, imageUrl: uploadResult.secure_url });
  } catch (e) {
    console.error('Cloudinary error:', e);
    res.status(500).json({ success: false, message: 'Ошибка загрузки изображения' });
  }
});

app.post('/api/rooms/create', (req, res) => {
  const { questions, licenseKey } = req.body;
  
  const licCheck = validateLicenseKey(licenseKey);
  if (!licCheck.valid) {
    return res.status(403).json({ success: false, message: licCheck.message });
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Викторина должна содержать хотя бы один вопрос!' });
  }

  const pin = generatePin();
  rooms[pin] = {
    pin,
    questions,
    players: {},
    currentQuestionIndex: -1,
    questionActive: false,
    answersCount: 0,
    answerCounts: [0, 0, 0, 0],
    timer: null,
    countdownTimer: null,
    timeLeft: 0,
    isPaused: false
  };

  res.json({ success: true, pin });
});

io.on('connection', (socket) => {
  socket.on('host-join', async ({ pin }) => {
    const room = rooms[pin];
    if (!room) {
      return socket.emit('error-msg', 'Комната не найдена или была закрыта!');
    }

    socket.join(oom_ + pin);
    socket.roomPin = pin;

    const hostHeader = socket.handshake.headers.host;
    const protocol = socket.handshake.headers['x-forwarded-proto'] || 'http';
    const playerUrl = protocol + '://' + hostHeader + '/player.html?pin=' + pin;
    const qrDataUrl = await QRCode.toDataURL(playerUrl);

    socket.emit('init-host', {
      pin,
      players: Object.values(room.players),
      qrCode: qrDataUrl,
      playerUrl: playerUrl,
      questionsCount: room.questions.length
    });
  });

  socket.on('player-join', ({ pin, name }, callback) => {
    const room = rooms[pin];
    if (!room) {
      return callback({ success: false, message: 'Неверный PIN или игра не существует!' });
    }

    const existing = Object.values(room.players).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return callback({ success: false, message: 'Это имя уже занято в игре!' });
    }

    const player = { id: socket.id, name, score: 0, hasAnswered: false };
    room.players[socket.id] = player;
    socket.join(oom_ + pin);
    socket.roomPin = pin;

    io.to(oom_ + pin).emit('update-players', Object.values(room.players));
    callback({ success: true });
  });

  socket.on('kick-player', (playerId) => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (room && room.players[playerId]) {
      delete room.players[playerId];
      io.to(playerId).emit('kicked');
      io.to(oom_ + pin).emit('update-players', Object.values(room.players));
    }
  });

  socket.on('next-question', () => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (!room || room.questions.length === 0) return;

    if (room.currentQuestionIndex === -1) {
      let countdown = 5;
      io.to(oom_ + pin).emit('start-countdown', { count: countdown });

      if (room.countdownTimer) clearInterval(room.countdownTimer);
      room.countdownTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          io.to(oom_ + pin).emit('countdown-tick', { count: countdown });
        } else {
          clearInterval(room.countdownTimer);
          room.currentQuestionIndex++;
          startQuestion(pin);
        }
      }, 1000);
    } else {
      room.currentQuestionIndex++;
      if (room.currentQuestionIndex >= room.questions.length) {
        const leaderboard = Object.values(room.players).sort((a, b) => b.score - a.score);
        io.to(oom_ + pin).emit('game-over', leaderboard);
        return;
      }
      startQuestion(pin);
    }
  });

  function startQuestion(pin) {
    const room = rooms[pin];
    if (!room) return;

    const q = room.questions[room.currentQuestionIndex];
    room.questionActive = true;
    room.answersCount = 0;
    room.answerCounts = [0, 0, 0, 0];
    room.timeLeft = q.timeLimit || 20;
    room.isPaused = false;

    Object.values(room.players).forEach(p => p.hasAnswered = false);

    io.to(oom_ + pin).emit('show-question', {
      type: q.type || 'quiz',
      question: q.question,
      image: q.image,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: room.timeLeft,
      questionIndex: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length
    });

    io.to(oom_ + pin).emit('show-question-player', {
      type: q.type || 'quiz',
      questionIndex: room.currentQuestionIndex + 1,
      optionsCount: q.options.length,
      timeLimit: room.timeLeft
    });

    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
      if (!room.isPaused) {
        room.timeLeft--;
        io.to(oom_ + pin).emit('timer-tick', room.timeLeft);

        if (room.timeLeft <= 0) {
          clearInterval(room.timer);
          endQuestion(pin);
        }
      }
    }, 1000);
  }

  socket.on('toggle-pause', () => {
    const room = rooms[socket.roomPin];
    if (room) {
      room.isPaused = !room.isPaused;
      io.to(oom_ + socket.roomPin).emit('pause-state-changed', room.isPaused);
    }
  });

  socket.on('add-time', (seconds) => {
    const room = rooms[socket.roomPin];
    if (room && room.questionActive) {
      room.timeLeft += seconds;
      io.to(oom_ + socket.roomPin).emit('timer-tick', room.timeLeft);
    }
  });

  socket.on('force-end-question', () => {
    const room = rooms[socket.roomPin];
    if (room && room.questionActive) {
      if (room.timer) clearInterval(room.timer);
      endQuestion(socket.roomPin);
    }
  });

  socket.on('submit-answer', ({ optionIndex }) => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (!room || !room.questionActive) return;

    const player = room.players[socket.id];
    if (!player || player.hasAnswered) return;

    player.hasAnswered = true;
    room.answersCount++;
    if (optionIndex >= 0 && optionIndex <= 3) {
      room.answerCounts[optionIndex]++;
    }

    const currentQ = room.questions[room.currentQuestionIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    if (isCorrect) {
      const bonus = room.timeLeft * 10;
      player.score += 500 + bonus;
    }

    const sorted = Object.values(room.players).sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex(p => p.id === socket.id) + 1;

    socket.emit('answer-result', { isCorrect, score: player.score, rank, total: sorted.length });
    io.to(oom_ + pin).emit('answer-count-update', {
      answersCount: room.answersCount,
      totalPlayers: Object.keys(room.players).length
    });

    const totalPlayers = Object.keys(room.players).length;
    if (room.answersCount >= totalPlayers && totalPlayers > 0) {
      clearInterval(room.timer);
      endQuestion(pin);
    }
  });

  socket.on('disconnect', () => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (room && room.players[socket.id]) {
      delete room.players[socket.id];
      io.to(oom_ + pin).emit('update-players', Object.values(room.players));
    }
  });

  function endQuestion(pin) {
    const room = rooms[pin];
    if (!room) return;

    room.questionActive = false;
    const leaderboard = Object.values(room.players).sort((a, b) => b.score - a.score);

    const currentQNum = room.currentQuestionIndex + 1;
    const isFinalQuestion = currentQNum === room.questions.length;
    const showLeaderboard = (currentQNum % 3 === 0) || isFinalQuestion;

    io.to(oom_ + pin).emit('question-ended', {
      correctIndex: room.questions[room.currentQuestionIndex].correctIndex,
      leaderboard,
      showLeaderboard,
      stats: room.answerCounts
    });
  }
});

server.listen(PORT, () => {
  console.log(Kahoot сервер запущен на порту  + PORT);
});