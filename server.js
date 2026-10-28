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
const questionsPath = path.join(__dirname, 'questions.json');

function getQuestions() {
  try {
    if (!fs.existsSync(questionsPath)) {
      fs.writeFileSync(questionsPath, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

function saveQuestions(questions) {
  fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2), 'utf8');
}

app.get('/api/questions', (req, res) => res.json(getQuestions()));

app.get('/api/questions/export', (req, res) => {
  const questions = getQuestions();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz.json"');
  res.send(JSON.stringify(questions, null, 2));
});

app.post('/api/questions/import', (req, res) => {
  const { questions } = req.body;
  if (Array.isArray(questions)) {
    saveQuestions(questions);
    res.json({ success: true, questions });
  } else {
    res.status(400).json({ success: false, message: 'Неверный формат файлов!' });
  }
});

app.delete('/api/questions/clear', (req, res) => {
  saveQuestions([]);
  res.json({ success: true });
});

app.post('/api/questions', upload.single('image'), async (req, res) => {
  const questions = getQuestions();
  let imageUrl = null;

  if (req.file) {
    try {
      const uploadResult = await cloudinary.uploader.upload(req.file.path);
      imageUrl = uploadResult.secure_url;
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('Ошибка загрузки картинки в Cloudinary:', e);
    }
  }

  const qType = req.body.type || 'quiz';
  let options = [];

  if (qType === 'true_false') {
    options = ['Правда', 'Неправда'];
  } else {
    options = [req.body.opt0, req.body.opt1, req.body.opt2, req.body.opt3];
  }

  const newQuestion = {
    id: Date.now(),
    type: qType,
    question: req.body.question,
    options: options,
    correctIndex: parseInt(req.body.correctIndex, 10),
    timeLimit: parseInt(req.body.timeLimit, 10) || 20,
    image: imageUrl
  };

  questions.push(newQuestion);
  saveQuestions(questions);
  res.json({ success: true, questions });
});

app.post('/api/questions/reorder', (req, res) => {
  const { questions } = req.body;
  if (Array.isArray(questions)) {
    saveQuestions(questions);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  let questions = getQuestions();
  questions = questions.filter(q => q.id !== parseInt(req.params.id, 10));
  saveQuestions(questions);
  res.json({ success: true, questions });
});

let gameState = {
  pin: '1234',
  players: {},
  currentQuestionIndex: -1,
  questionActive: false,
  answersCount: 0,
  answerCounts: [0, 0, 0, 0],
  timer: null,
  timeLeft: 0,
  isPaused: false
};

io.on('connection', (socket) => {
  socket.on('host-join', async () => {
    socket.join('host');
    const hostHeader = socket.handshake.headers.host;
    const protocol = socket.handshake.headers['x-forwarded-proto'] || 'http';
    const playerUrl = `${protocol}://${hostHeader}/player.html`;
    const qrDataUrl = await QRCode.toDataURL(playerUrl);
    
    socket.emit('init-host', {
      players: Object.values(gameState.players),
      qrCode: qrDataUrl,
      playerUrl: playerUrl,
      questionsCount: getQuestions().length
    });
  });

  socket.on('player-join', ({ pin, name }, callback) => {
    if (pin !== gameState.pin) {
      return callback({ success: false, message: 'Неверный PIN код!' });
    }
    
    const existing = Object.values(gameState.players).find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return callback({ success: false, message: 'Имя уже занято!' });
    }

    gameState.players[socket.id] = { id: socket.id, name, score: 0, hasAnswered: false };
    socket.join('players');
    io.to('host').emit('update-players', Object.values(gameState.players));
    callback({ success: true });
  });

  socket.on('kick-player', (playerId) => {
    if (gameState.players[playerId]) {
      delete gameState.players[playerId];
      io.to(playerId).emit('kicked');
      io.to('host').emit('update-players', Object.values(gameState.players));
    }
  });

  socket.on('next-question', () => {
    const questions = getQuestions();
    if (questions.length === 0) return;

    gameState.currentQuestionIndex++;
    
    if (gameState.currentQuestionIndex >= questions.length) {
      const leaderboard = Object.values(gameState.players).sort((a, b) => b.score - a.score);
      io.emit('game-over', leaderboard);
      return;
    }

    const q = questions[gameState.currentQuestionIndex];
    gameState.questionActive = true;
    gameState.answersCount = 0;
    gameState.answerCounts = [0, 0, 0, 0];
    gameState.timeLeft = q.timeLimit || 20;
    gameState.isPaused = false;

    Object.values(gameState.players).forEach(p => p.hasAnswered = false);

    io.to('host').emit('show-question', {
      type: q.type || 'quiz',
      question: q.question,
      image: q.image,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: gameState.timeLeft,
      questionIndex: gameState.currentQuestionIndex + 1,
      totalQuestions: questions.length
    });

    io.to('players').emit('show-question-player', {
      type: q.type || 'quiz',
      questionIndex: gameState.currentQuestionIndex + 1,
      optionsCount: q.options.length,
      timeLimit: gameState.timeLeft
    });

    startTimer();
  });

  function startTimer() {
    if (gameState.timer) clearInterval(gameState.timer);
    gameState.timer = setInterval(() => {
      if (!gameState.isPaused) {
        gameState.timeLeft--;
        io.emit('timer-tick', gameState.timeLeft);

        if (gameState.timeLeft <= 0) {
          clearInterval(gameState.timer);
          endQuestion();
        }
      }
    }, 1000);
  }

  socket.on('toggle-pause', () => {
    gameState.isPaused = !gameState.isPaused;
    io.to('host').emit('pause-state-changed', gameState.isPaused);
  });

  socket.on('add-time', (seconds) => {
    if (gameState.questionActive) {
      gameState.timeLeft += seconds;
      io.emit('timer-tick', gameState.timeLeft);
    }
  });

  socket.on('force-end-question', () => {
    if (gameState.questionActive) {
      if (gameState.timer) clearInterval(gameState.timer);
      endQuestion();
    }
  });

  socket.on('submit-answer', ({ optionIndex }) => {
    if (!gameState.questionActive) return;
    const player = gameState.players[socket.id];
    if (!player || player.hasAnswered) return;

    player.hasAnswered = true;
    gameState.answersCount++;
    if (optionIndex >= 0 && optionIndex <= 3) {
      gameState.answerCounts[optionIndex]++;
    }

    const questions = getQuestions();
    const currentQ = questions[gameState.currentQuestionIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    if (isCorrect) {
      const bonus = gameState.timeLeft * 10;
      player.score += 500 + bonus;
    }

    const sorted = Object.values(gameState.players).sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex(p => p.id === socket.id) + 1;

    socket.emit('answer-result', { isCorrect, score: player.score, rank, total: sorted.length });
    io.to('host').emit('answer-count-update', {
      answersCount: gameState.answersCount,
      totalPlayers: Object.keys(gameState.players).length
    });

    const totalPlayers = Object.keys(gameState.players).length;
    if (gameState.answersCount >= totalPlayers && totalPlayers > 0) {
      clearInterval(gameState.timer);
      endQuestion();
    }
  });

  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) {
      delete gameState.players[socket.id];
      io.to('host').emit('update-players', Object.values(gameState.players));
    }
  });

  function endQuestion() {
    gameState.questionActive = false;
    const questions = getQuestions();
    const leaderboard = Object.values(gameState.players).sort((a, b) => b.score - a.score);

    const currentQNum = gameState.currentQuestionIndex + 1;
    const isFinalQuestion = currentQNum === questions.length;
    const showLeaderboard = (currentQNum % 3 === 0) || isFinalQuestion;

    io.to('host').emit('question-ended', {
      correctIndex: questions[gameState.currentQuestionIndex].correctIndex,
      leaderboard,
      showLeaderboard,
      stats: gameState.answerCounts
    });
    
    io.to('players').emit('round-ended');
  }
});

server.listen(PORT, () => {
  console.log(`Kahoot сервер запущен на порту ${PORT}`);
});