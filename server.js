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

// ВШИТАЯ БАЗА ИЗ 100 ЛИЦЕНЗИОННЫХ КЛЮЧЕЙ
const HARDCODED_KEYS = [
  'MLK26-JK6F-F0XV-WFQ6',
  'MLK26-JBZF-7NM4-UZL8',
  'MLK26-KS15-10ZC-L806',
  'MLK26-458F-3N94-FXDY',
  'MLK26-LTOQ-V389-VK1D',
  'MLK26-Z4Q3-67JZ-LSU1',
  'MLK26-0S6D-T6W5-TMBG',
  'MLK26-3KBJ-YQDL-ZVBJ',
  'MLK26-9IEQ-2K31-WFK4',
  'MLK26-RY0S-A01Y-QAOR',
  'MLK26-ZJDX-GETL-QM0T',
  'MLK26-N9UO-QKF0-U12G',
  'MLK26-PBT6-GAU6-AHYL',
  'MLK26-T4DX-PKB4-7HBT',
  'MLK26-WLA2-R532-DVK0',
  'MLK26-6P1I-OV3K-5FLJ',
  'MLK26-5TPN-5MNY-DBSF',
  'MLK26-6841-30GF-HTMR',
  'MLK26-FJ6W-RMKE-HPZ8',
  'MLK26-54WC-21BM-2SLF',
  'MLK26-BXJ1-IOYQ-GYBA',
  'MLK26-1TQA-AN67-S5A1',
  'MLK26-9I0O-NDB9-XM0F',
  'MLK26-LK8B-HP4Q-0PYN',
  'MLK26-1RV4-FDSZ-BWP9',
  'MLK26-GSZL-879R-IC8N',
  'MLK26-P9FG-RM1G-FCE9',
  'MLK26-9UHV-640M-DBES',
  'MLK26-D0KT-6TSW-TGAV',
  'MLK26-D4ZE-U3XF-Z65Q',
  'MLK26-BMXR-WHKS-3ELW',
  'MLK26-Z4BE-TSBQ-MKYV',
  'MLK26-R9Y8-TI1X-RM4S',
  'MLK26-7HFE-P85E-QWIX',
  'MLK26-P8ZS-NLIK-PW8U',
  'MLK26-86DK-2URC-F8V2',
  'MLK26-NREZ-2MDJ-L524',
  'MLK26-8O9T-1I9B-UO7B',
  'MLK26-JREI-W4VI-18IA',
  'MLK26-92HI-N2Q7-P0VF',
  'MLK26-9A2Z-UW48-ZATS',
  'MLK26-QKCY-AGUF-58LA',
  'MLK26-0HKY-QHIK-E9LT',
  'MLK26-53NT-FH20-OK3U',
  'MLK26-VG45-CLHX-AEIB',
  'MLK26-XGMY-3COY-O9JN',
  'MLK26-UBPX-IR7Q-27L9',
  'MLK26-H5CI-XGSQ-Q3ON',
  'MLK26-82EV-TNQC-DTAO',
  'MLK26-5FBT-IK2G-AQ1R',
  'MLK26-7WL9-1ZQ2-BM9A',
  'MLK26-0O6W-LMZG-OMLY',
  'MLK26-YJ04-VFLJ-T50C',
  'MLK26-OJI3-DNYO-BJQ2',
  'MLK26-CFQX-YVT3-8NVC',
  'MLK26-6VY2-3C7O-7YMW',
  'MLK26-KE6U-EDF1-2JP3',
  'MLK26-WPIR-8INS-CUN1',
  'MLK26-192B-ZEWR-IOS3',
  'MLK26-8LGC-W40N-OPRG',
  'MLK26-TJBU-7C9D-51G3',
  'MLK26-VLHP-BULK-IHDK',
  'MLK26-N70Y-DF8O-VNYZ',
  'MLK26-IEM9-QIO1-IP8M',
  'MLK26-BDJP-D789-N68I',
  'MLK26-HLNJ-SL04-96YH',
  'MLK26-LFJZ-LW15-IFS6',
  'MLK26-WM34-BY7N-KN95',
  'MLK26-80XD-D4BJ-NKPG',
  'MLK26-CGWA-45DE-P6MB',
  'MLK26-W7GF-Z8DK-SKWG',
  'MLK26-DVF3-18GI-H579',
  'MLK26-9S2M-I80X-NXDO',
  'MLK26-O4YH-OM69-9IX7',
  'MLK26-F8RV-W0C1-E1YS',
  'MLK26-EKR2-JXU9-C5WB',
  'MLK26-67F5-G7JW-NQC7',
  'MLK26-5QR8-IWM1-QH63',
  'MLK26-1D39-W236-UADP',
  'MLK26-H1EQ-GSD8-CR5L',
  'MLK26-KW2P-3E6A-UEXQ',
  'MLK26-GOC3-I9YE-T7LV',
  'MLK26-WGLP-ID7M-QASM',
  'MLK26-F2YS-BCU4-4EBC',
  'MLK26-DL4M-Y5F2-GPM5',
  'MLK26-CJWX-X4FC-HQ8D',
  'MLK26-J2PV-BR0Z-QJOA',
  'MLK26-I1EP-HZ2V-BVLS',
  'MLK26-J2ZC-IDGY-8BNX',
  'MLK26-N1UT-S7H3-XULS',
  'MLK26-VCS8-RYLO-ZMHA',
  'MLK26-LZ08-NHTA-FPOL',
  'MLK26-P0DA-XS1D-MWI9',
  'MLK26-KYPF-YUEI-U3IZ',
  'MLK26-HD48-NI9V-Z9TW',
  'MLK26-MUSL-Q7LW-WMQR',
  'MLK26-FNYO-OPSF-CT1Y',
  'MLK26-1SQN-C9X4-813G',
  'MLK26-TU7Y-5R18-WXML',
  'MLK26-R7MB-XVQS-ZHM0'
];

// Память активных сессий
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
    console.error('Ошибка Cloudinary:', e);
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

    socket.join(oom_);
    socket.roomPin = pin;

    const hostHeader = socket.handshake.headers.host;
    const protocol = socket.handshake.headers['x-forwarded-proto'] || 'http';
    const playerUrl = ${protocol}:///player.html?pin=;
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
    socket.join(oom_);
    socket.roomPin = pin;

    io.to(oom_).emit('update-players', Object.values(room.players));
    callback({ success: true });
  });

  socket.on('kick-player', (playerId) => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (room && room.players[playerId]) {
      delete room.players[playerId];
      io.to(playerId).emit('kicked');
      io.to(oom_).emit('update-players', Object.values(room.players));
    }
  });

  socket.on('next-question', () => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (!room || room.questions.length === 0) return;

    if (room.currentQuestionIndex === -1) {
      let countdown = 5;
      io.to(oom_).emit('start-countdown', { count: countdown });

      if (room.countdownTimer) clearInterval(room.countdownTimer);
      room.countdownTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          io.to(oom_).emit('countdown-tick', { count: countdown });
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
        io.to(oom_).emit('game-over', leaderboard);
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

    io.to(oom_).emit('show-question', {
      type: q.type || 'quiz',
      question: q.question,
      image: q.image,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: room.timeLeft,
      questionIndex: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length
    });

    io.to(oom_).emit('show-question-player', {
      type: q.type || 'quiz',
      questionIndex: room.currentQuestionIndex + 1,
      optionsCount: q.options.length,
      timeLimit: room.timeLeft
    });

    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
      if (!room.isPaused) {
        room.timeLeft--;
        io.to(oom_).emit('timer-tick', room.timeLeft);

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
      io.to(oom_).emit('pause-state-changed', room.isPaused);
    }
  });

  socket.on('add-time', (seconds) => {
    const room = rooms[socket.roomPin];
    if (room && room.questionActive) {
      room.timeLeft += seconds;
      io.to(oom_).emit('timer-tick', room.timeLeft);
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
    io.to(oom_).emit('answer-count-update', {
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
      io.to(oom_).emit('update-players', Object.values(room.players));
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

    io.to(oom_).emit('question-ended', {
      correctIndex: room.questions[room.currentQuestionIndex].correctIndex,
      leaderboard,
      showLeaderboard,
      stats: room.answerCounts
    });
  }
});

server.listen(PORT, () => {
  console.log(Kahoot сервер запущен на порту );
});