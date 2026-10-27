const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const os = require('os');
const QRCode = require('qrcode');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// АВТОМАИЧЕСКАЯ НАСТРОЙКА СЕТИ И БРАНДМАУЭРА WINDOWS ПРИ ЗАПУСКЕ
function autoConfigureNetwork() {
  // 1. Автоматический перевод всех Wi-Fi сетей в режим "Private" (Частная)
  // 2. Добавление входящего правила в Брандмауэр для порта 3000
  const psCommand = `
    $profiles = Get-NetConnectionProfile;
    foreach ($p in $profiles) {
      if ($p.NetworkCategory -eq 'Public') {
        Set-NetConnectionProfile -InterfaceIndex $p.InterfaceIndex -NetworkCategory Private
      }
    }
    netsh advfirewall firewall add rule name="Kahoot Server Full" dir=in action=allow protocol=TCP localport=${PORT}
  `;

  const encodedCmd = Buffer.from(psCommand, 'utf16le').toString('base64');
  const runAsAdmin = `powershell -Command "Start-Process powershell -ArgumentList '-EncodedCommand ${encodedCmd}' -Verb RunAs"`;

  exec(runAsAdmin, (err) => {
    if (err) {
      console.log('Запрос прав администратора завершен.');
    }
  });
}

autoConfigureNetwork();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();
const playerUrl = `http://${localIP}:${PORT}`;

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const questionsPath = path.join(__dirname, 'questions.json');

const defaultQuestions = [
  {
    id: 1,
    question: "Какой язык используется для бэкенда нашего приложения?",
    options: ["Python", "Node.js", "C++", "PHP"],
    correctIndex: 1,
    timeLimit: 20
  }
];

function getQuestions() {
  try {
    if (!fs.existsSync(questionsPath)) {
      fs.writeFileSync(questionsPath, JSON.stringify(defaultQuestions, null, 2), 'utf8');
      return defaultQuestions;
    }
    const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    return data.length > 0 ? data : defaultQuestions;
  } catch (err) {
    return defaultQuestions;
  }
}

function saveQuestions(questions) {
  fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2), 'utf8');
}

app.get('/api/questions', (req, res) => res.json(getQuestions()));

app.post('/api/questions', upload.single('image'), (req, res) => {
  const questions = getQuestions();
  const newQuestion = {
    id: Date.now(),
    question: req.body.question,
    options: [req.body.opt0, req.body.opt1, req.body.opt2, req.body.opt3],
    correctIndex: parseInt(req.body.correctIndex, 10),
    timeLimit: parseInt(req.body.timeLimit, 10) || 20,
    image: req.file ? `/uploads/${req.file.filename}` : null
  };
  questions.push(newQuestion);
  saveQuestions(questions);
  res.json({ success: true, questions });
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
  timer: null,
  timeLeft: 0
};

io.on('connection', async (socket) => {
  socket.on('host-join', async () => {
    socket.join('host');
    const qrDataUrl = await QRCode.toDataURL(`${playerUrl}/player.html`);
    socket.emit('init-host', {
      players: Object.values(gameState.players),
      qrCode: qrDataUrl,
      playerUrl: `${playerUrl}/player.html`,
      questionsCount: getQuestions().length
    });
  });

  socket.on('player-join', ({ pin, name }, callback) => {
    if (pin !== gameState.pin) {
      return callback({ success: false, message: 'Неверный PIN код!' });
    }
    gameState.players[socket.id] = { name, score: 0, hasAnswered: false };
    socket.join('players');
    io.to('host').emit('update-players', Object.values(gameState.players));
    callback({ success: true });
  });

  socket.on('next-question', () => {
    const questions = getQuestions();
    gameState.currentQuestionIndex++;
    if (gameState.currentQuestionIndex >= questions.length) {
      const leaderboard = Object.values(gameState.players).sort((a, b) => b.score - a.score);
      io.emit('game-over', leaderboard);
      return;
    }

    const q = questions[gameState.currentQuestionIndex];
    gameState.questionActive = true;
    gameState.answersCount = 0;
    gameState.timeLeft = q.timeLimit || 20;

    Object.values(gameState.players).forEach(p => p.hasAnswered = false);

    io.to('host').emit('show-question', {
      question: q.question,
      image: q.image,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimit: gameState.timeLeft,
      questionIndex: gameState.currentQuestionIndex + 1,
      totalQuestions: questions.length
    });

    io.to('players').emit('show-question-player', {
      questionIndex: gameState.currentQuestionIndex + 1,
      optionsCount: q.options.length,
      timeLimit: gameState.timeLeft
    });

    if (gameState.timer) clearInterval(gameState.timer);
    gameState.timer = setInterval(() => {
      gameState.timeLeft--;
      io.emit('timer-tick', gameState.timeLeft);

      if (gameState.timeLeft <= 0) {
        clearInterval(gameState.timer);
        endQuestion();
      }
    }, 1000);
  });

  socket.on('submit-answer', ({ optionIndex }) => {
    if (!gameState.questionActive) return;
    const player = gameState.players[socket.id];
    if (!player || player.hasAnswered) return;

    player.hasAnswered = true;
    gameState.answersCount++;

    const questions = getQuestions();
    const currentQ = questions[gameState.currentQuestionIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    if (isCorrect) {
      const bonus = gameState.timeLeft * 10;
      player.score += 500 + bonus;
    }

    socket.emit('answer-result', { isCorrect, score: player.score });
    io.to('host').emit('answer-count-update', gameState.answersCount);

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

    io.to('host').emit('question-ended', {
      correctIndex: questions[gameState.currentQuestionIndex].correctIndex,
      leaderboard
    });
  }
});

server.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(` Kahoot Сервер запущен!`);
  console.log(` Адрес подключения: ${playerUrl}`);
  console.log(`=================================\n`);

  exec(`start http://localhost:${PORT}`);
});