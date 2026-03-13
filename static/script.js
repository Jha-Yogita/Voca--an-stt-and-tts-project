// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  darkMode: false,
  recording: false,
  speaking: false,
  voices: [],
  selectedVoice: null,
  recognition: null,
  messageHistory: [],   // {role, text, audio?}
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const chatWindow   = document.getElementById('chat-window');
const messageList  = document.getElementById('message-list');
const msgInput     = document.getElementById('message-input');
const sendBtn      = document.getElementById('send-btn');
const micBtn       = document.getElementById('mic-btn');
const botTyping    = document.getElementById('bot-typing');
const darkToggle   = document.getElementById('dark-toggle');
const voiceSelect  = document.getElementById('voice-select');
const resetBtn     = document.getElementById('reset-btn');
const sttStatus    = document.getElementById('stt-status');

// ─── Utilities ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function scrollBottom() {
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function removeWelcome() {
  const w = messageList.querySelector('.welcome-msg');
  if (w) w.remove();
}

// ─── Voices (Web Speech Synthesis) ───────────────────────────────────────────
function loadVoices() {
  state.voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  voiceSelect.innerHTML = '<option value="">Auto Voice</option>';
  state.voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

voiceSelect.addEventListener('change', () => {
  const idx = voiceSelect.value;
  state.selectedVoice = idx !== '' ? state.voices[parseInt(idx)] : null;
});

// ─── Text-to-Speech ───────────────────────────────────────────────────────────
function speak(text) {
  if (!text) return;
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = state.selectedVoice || state.voices[0] || null;
  utt.rate = 1.0;
  utt.pitch = 1.0;
  speechSynthesis.speak(utt);
}

// ─── Speech-to-Text ───────────────────────────────────────────────────────────
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const r = new SpeechRecognition();
  r.lang = 'en-US';
  r.continuous = false;
  r.interimResults = true;

  r.onstart = () => {
    sttStatus.textContent = '● Listening…';
    micBtn.classList.add('recording');
    state.recording = true;
  };

  r.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript).join('');
    msgInput.value = transcript;
    if (e.results[e.results.length - 1].isFinal) {
      sttStatus.textContent = '✓ Got it!';
      setTimeout(() => { sttStatus.textContent = ''; }, 800);
    }
  };

  r.onerror = (e) => {
    console.error('STT error:', e.error);
    sttStatus.textContent = e.error === 'not-allowed'
      ? '⚠ Mic access denied' : '⚠ Try again';
    setTimeout(() => { sttStatus.textContent = ''; }, 2000);
  };

  r.onend = () => {
    micBtn.classList.remove('recording');
    state.recording = false;
    const val = msgInput.value.trim();
    if (val) sendMessage(val);
  };

  return r;
}

micBtn.addEventListener('click', () => {
  if (!state.recognition) state.recognition = initRecognition();
  if (!state.recognition) {
    sttStatus.textContent = '⚠ Not supported in this browser';
    return;
  }
  if (state.recording) {
    state.recognition.stop();
  } else {
    msgInput.value = '';
    state.recognition.start();
  }
});

// ─── Message rendering ───────────────────────────────────────────────────────
function addMessage(role, text) {
  removeWelcome();
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'bot' ? '⬡' : 'You';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  if (role === 'bot') {
    const replayBtn = document.createElement('button');
    replayBtn.className = 'replay-btn';
    replayBtn.title = 'Replay audio';
    replayBtn.textContent = '🔊';
    replayBtn.addEventListener('click', () => speak(text));
    row.append(avatar, bubble, replayBtn);
  } else {
    row.append(bubble, avatar);
  }

  messageList.appendChild(row);
  scrollBottom();
  return row;
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function processMessage(userMessage) {
  const res = await fetch('/process-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage }),
  });
  const data = await res.json();
  return data.responseText;
}

// ─── Send flow ────────────────────────────────────────────────────────────────
async function sendMessage(text) {
  text = text.trim();
  if (!text) return;

  msgInput.value = '';
  addMessage('user', text);

  // show typing
  botTyping.style.display = 'flex';
  scrollBottom();

  try {
    const response = await processMessage(text);
    botTyping.style.display = 'none';
    addMessage('bot', response);
    speak(response);
  } catch (err) {
    botTyping.style.display = 'none';
    addMessage('bot', 'Sorry, something went wrong. Please try again.');
    console.error(err);
  }
}

// ─── Input events ─────────────────────────────────────────────────────────────
sendBtn.addEventListener('click', () => sendMessage(msgInput.value));

msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(msgInput.value);
  }
});

// ─── Dark mode ────────────────────────────────────────────────────────────────
darkToggle.addEventListener('change', () => {
  state.darkMode = darkToggle.checked;
  document.body.classList.toggle('dark', state.darkMode);
});

// ─── Reset ────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', async () => {
  messageList.innerHTML = `
    <div class="welcome-msg">
      <span class="wm-icon">⬡</span>
      <p>Conversation reset.<br/>Start a new chat below.</p>
    </div>`;
  speechSynthesis.cancel();
  await fetch('/reset', { method: 'POST' }).catch(() => {});
});