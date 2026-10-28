const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
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
const licensesPath = path.join(__dirname, 'licenses.json');

function getLicenses() {
  try {
    if (!fs.existsSync(licensesPath)) return [];
    const data = fs.readFileSync(licensesPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Ошибка чтения licenses.json:', err);
    return [];
  }
}

function saveLicenses(licenses) {
  try {
    fs.writeFileSync(licensesPath, JSON.stringify(licenses, null, 2), 'utf8');
  } catch (err) {
    console.error('Ошибка записи licenses.json:', err);
  }
}

function validateLicenseKey(key) {
  if (!key) return { valid: false, message: 'Ключ ліцензії відсутній!' };
  
  const licenses = getLicenses();
  const lic = licenses.find(l => l && l.key === key.trim());

  if (!lic) {
    return { valid: false, message: 'Недійсний ключ ліцензії!' };
  }

  const now = new Date();

  if (!lic.activatedAt) {
    lic.activatedAt = now.toISOString();
    const exp = new Date();
    exp.setDate(exp.getDate() + 365);
    lic.expiresAt = exp.toISOString();
    lic.status = 'active';
    saveLicenses(licenses);
    return { valid: true, expiresAt: lic.expiresAt };
  }

  if (new Date(lic.expiresAt) < now) {
    lic.status = 'expired';
    saveLicenses(licenses);
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