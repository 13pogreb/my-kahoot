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

// ВШИТЫЕ 100 КЛЮЧЕЙ + МАСТЕР-КЛЮЧ (РАБОТАЮТ ВСЕГДА)
const HARDCODED_KEYS = [
  'MLK26-POGR-EBNY-AK01',
  'MLK26-8F3A-9K2P-X7W4', 'MLK26-4B19-L8M0-Q3V6', 'MLK26-7T5E-2R9Y-H1N8', 'MLK26-3C6D-9P1X-K5W2',
  'MLK26-9M2N-4B8V-C7X1', 'MLK26-1L5K-8J3H-2G4F', 'MLK26-6D9S-8A7F-5G4H', 'MLK26-2J3K-4L5M-6N7P',
  'MLK26-8Q9W-7E6R-5T4Y', 'MLK26-3U2I-1O4P-5A6S', 'MLK26-7D8F-9G1H-2J3K', 'MLK26-4L5Z-6X7C-8V9B',
  'MLK26-1N2M-3K4J-5H6G', 'MLK26-9F8D-7S6A-5P4O', 'MLK26-3I2U-1Y4T-5R6E', 'MLK26-7W8Q-9A1S-2D3F',
  'MLK26-4G5H-6J7K-8L9M', 'MLK26-1N2B-3V4C-5X6Z', 'MLK26-9M8N-7B6V-5C4X', 'MLK26-3Z2X-1C4V-5B6N',
  'MLK26-7M8K-9J1H-2G3F', 'MLK26-4D5S-6A7P-8O9I', 'MLK26-1U2Y-3T4R-5E6W', 'MLK26-9Q8A-7S6D-5F4G',
  'MLK26-3H2J-1K4L-5Z6X', 'MLK26-7C8V-9B1N-2M3K', 'MLK26-4J5H-6G7F-8D9S', 'MLK26-1A2P-3O4I-5U6Y',
  'MLK26-9T8R-7E6W-5Q4A', 'MLK26-3S2D-1F4G-5H6J', 'MLK26-7K8L-9Z1X-2C3V', 'MLK26-4B5N-6M7K-8J9H',
  'MLK26-1G2F-3D4S-5A6P', 'MLK26-9O8I-7U6Y-5T4R', 'MLK26-3E2W-1Q4A-5S6D', 'MLK26-7F8G-9H1J-2K3L',
  'MLK26-4Z5X-6C7V-8B9N', 'MLK26-1M2K-3J4H-5G6F', 'MLK26-9D8S-7A6P-5O4I', 'MLK26-3U2Y-1T4R-5E6W',
  'MLK26-7Q8A-9S1D-2F3G', 'MLK26-4H5J-6K7L-8Z9X', 'MLK26-1C2V-3B4N-5M6K', 'MLK26-9J8H-7G6F-5D4S',
  'MLK26-3A2P-1O4I-5U6Y', 'MLK26-7T8R-9E1W-2Q3A', 'MLK26-4S5D-6F7G-8H9J', 'MLK26-1K2L-3Z4X-5C6V',
  'MLK26-9B8N-7M6K-5J4H', 'MLK26-3G2F-1D4S-5A6P', 'MLK26-7O8I-9U1Y-2T3R', 'MLK26-4E5W-6Q7A-8S9D',
  'MLK26-1F2G-3H4J-5K6L', 'MLK26-9Z8X-7C6V-5B4N', 'MLK26-3M2K-1J4H-5G6F', 'MLK26-7D8S-9A1P-2O3I',
  'MLK26-4U5Y-6T7R-8E9W', 'MLK26-1Q2A-3S4D-5F6G', 'MLK26-9H8J-7K6L-5Z4X', 'MLK26-3C2V-1B4N-5M6K',
  'MLK26-7J8H-9G1F-2D3S', 'MLK26-4A5P-6O7I-8U9Y', 'MLK26-1T2R-3E4W-5Q6A', 'MLK26-9S8D-7F6G-5H4J',
  'MLK26-3K2L-1Z4X-5C6V', 'MLK26-7B8N-9M1K-2J3H', 'MLK26-4G5F-6D7S-8A9P', 'MLK26-1O2I-3U4Y-5T6R',
  'MLK26-9E8W-7Q6A-5S4D', 'MLK26-3F2G-1H4J-5K6L', 'MLK26-7Z8X-9C1V-2B3N', 'MLK26-4M5K-6J7H-8G9F',
  'MLK26-1D2S-3A4P-5O6I', 'MLK26-9U8Y-7T6R-5E4W', 'MLK26-3Q2A-1S4D-5F6G', 'MLK26-7H8J-9K1L-2Z3X',
  'MLK26-4C5V-6B7N-8M9K', 'MLK26-1J2H-3G4F-5D6S', 'MLK26-9A2P-7O6I-5U4Y', 'MLK26-3T2R-1E4W-5Q6A',
  'MLK26-7S8D-9F1G-2H3J', 'MLK26-4K5L-6Z7X-8C9V', 'MLK26-1B2N-3M4K-5J6H', 'MLK26-9G8F-7D6S-5A4P',
  'MLK26-3O2I-1U4Y-5T6R', 'MLK26-7E8W-9Q1A-2S3D', 'MLK26-4F5G-6H7J-8K9L', 'MLK26-1Z2X-3C4V-5B6N',
  'MLK26-9M8K-7J6H-5G4F', 'MLK26-3D2S-1A4P-5O6I', 'MLK26-7U8Y-9T1R-2E3W', 'MLK26-4Q5A-6S7D-8F9G',
  'MLK26-1H2J-3K4L-5Z6X', 'MLK26-9C8V-7B6N-5M4K', 'MLK26-3J2H-1G4F-5D6S', 'MLK26-7A8P-9O1I-2U3Y'
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

    socket.join(`room_${pin}`);
    socket.roomPin = pin;

    const hostHeader = socket.handshake.headers.host;
    const protocol = socket.handshake.headers['x-forwarded-proto'] || 'http';
    const playerUrl = `${protocol}://${hostHeader}/player.html?pin=${pin}`;
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
    socket.join(`room_${pin}`);
    socket.roomPin = pin;

    io.to(`room_${pin}`).emit('update-players', Object.values(room.players));
    callback({ success: true });
  });

  socket.on('kick-player', (playerId) => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (room && room.players[playerId]) {
      delete room.players[playerId];
      io.to(playerId).emit('kicked');
      io.to(`room_${pin}`).emit('update-players', Object.values(room.players));
    }
  });

  socket.on('next-question', () => {
    const pin = socket.roomPin;
    const room = rooms[pin];
    if (!room || room.questions.length === 0) return;

    if (room.currentQuestionIndex === -1) {
      let countdown = 5;
      io.to(`room_${pin}`).emit('start-countdown', { count: countdown });

      if (room.countdownTimer) clearInterval(room.countdownTimer);
      room.countdownTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          io.to(`room_${pin}`).emit('countdown-tick', { count: countdown });
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
        io.to(`room_${pin}`).emit('game-over', leaderboard);
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

    io.to(`room_${pin}`).emit('show-question', {
      type: q.type || 'quiz',
      question: q.question,
      image: q.image,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: room.timeLeft,
      questionIndex: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length
    });

    io.to(`room_${pin}`).emit('show-question-player', {
      type: q.type || 'quiz',
      questionIndex: room.currentQuestionIndex + 1,
      optionsCount: q.options.length,
      timeLimit: room.timeLeft
    });

    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
      if (!room.isPaused) {
        room.timeLeft--;
        io.to(`room_${pin}`).emit('timer-tick', room.timeLeft);

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
      io.to(`room_${socket.roomPin}`).emit('pause-state-changed', room.isPaused);
    }
  });

  socket.on('add-time', (seconds) => {
    const room = rooms[socket.roomPin];
    if (room && room.questionActive) {
      room.timeLeft += seconds;
      io.to(`room_${socket.roomPin}`).emit('timer-tick', room.timeLeft);
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
    io.to(`room_${pin}`).emit('answer-count-update', {
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
      io.to(`room_${pin}`).emit('update-players', Object.values(room.players));
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

    io.to(`room_${pin}`).emit('question-ended', {
      correctIndex: room.questions[room.currentQuestionIndex].correctIndex,
      leaderboard,
      showLeaderboard,
      stats: room.answerCounts
    });
  }
});

server.listen(PORT, () => {
  console.log(`Kahoot сервер запущен на порту ${PORT}`);
});