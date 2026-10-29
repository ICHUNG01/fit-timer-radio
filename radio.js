const STATIONS = [
  {
    name: 'ICRT FM100',
    desc: '英文新聞與流行音樂',
    url: 'https://stream.rcs.revma.com/nkdfurztxp3vv'
  },
  {
    name: '中廣新聞網',
    desc: '新聞與時事',
    url: 'https://stream.rcs.revma.com/78fm9wyy2tzuv'
  },
  {
    name: '中廣流行網',
    desc: 'I like radio · 流行與談話',
    url: 'https://stream.rcs.revma.com/aw9uqyxy2tzuv'
  },
  {
    name: '中廣音樂網',
    desc: 'i Radio · 流行音樂',
    url: 'https://stream.rcs.revma.com/ndk05tyy2tzuv'
  },
  {
    name: '警廣全國交通網',
    desc: '交通路況與治安資訊',
    url: 'https://stream.pbs.gov.tw/live/PBS/playlist.m3u8'
  },
  {
    name: '警廣臺中分臺',
    desc: '臺中地區廣播',
    url: 'https://stream.pbs.gov.tw/live/TCS/playlist.m3u8'
  },
  {
    name: 'Hit FM',
    desc: '使用官方網站線上播放',
    url: null,
    website: 'https://www.hitfm.com.tw/mobile/onair.php'
  }
];

const audio = document.getElementById('radio-audio');
const toggle = document.getElementById('radio-toggle');
const stop = document.getElementById('radio-stop');
const status = document.getElementById('radio-status');
const title = document.getElementById('radio-title');
const desc = document.getElementById('radio-desc');
const select = document.getElementById('station-select');
const link = document.getElementById('radio-link');
let currentIndex = 0;

function currentStation() {
  return STATIONS[currentIndex];
}

function setStatus(message) {
  status.textContent = message;
}

function populateSelect() {
  select.innerHTML = '';
  STATIONS.forEach((station, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = station.name;
    select.appendChild(option);
  });
}

function updateStationUI() {
  const station = currentStation();
  title.textContent = station.name;
  desc.textContent = station.desc;
  select.value = String(currentIndex);
  if (station.website) {
    link.href = station.website;
    link.style.display = 'inline-block';
  } else {
    link.style.display = 'none';
  }
  toggle.textContent = audio.paused ? '▶ 播放電台' : '❚❚ 暫停電台';
}

function stopPlayback(message = '已停止') {
  audio.pause();
  try { audio.currentTime = 0; } catch {}
  toggle.textContent = '▶ 播放電台';
  setStatus(message);
}

async function playCurrent() {
  const station = currentStation();
  if (!station.url) {
    setStatus('此電台請改用下方官方網站播放');
    updateStationUI();
    return;
  }

  if (audio.src !== station.url) {
    audio.src = station.url;
  }
  setStatus(`正在連線 ${station.name}…`);
  try {
    await audio.play();
    toggle.textContent = '❚❚ 暫停電台';
    setStatus(`正在播放：${station.name}`);
  } catch (err) {
    console.error(err);
    setStatus('無法播放這個電台，請切換其他電台試試');
    toggle.textContent = '▶ 播放電台';
  }
}

async function onToggle() {
  if (!audio.paused) {
    audio.pause();
    toggle.textContent = '▶ 播放電台';
    setStatus('已暫停');
    return;
  }
  await playCurrent();
}

function onStationChange() {
  const wasPlaying = !audio.paused;
  stopPlayback('已切換電台');
  currentIndex = Number(select.value) || 0;
  audio.removeAttribute('src');
  audio.load();
  updateStationUI();
  setStatus(`已選擇：${currentStation().name}`);
  if (wasPlaying) {
    playCurrent();
  }
}

audio.addEventListener('playing', () => {
  toggle.textContent = '❚❚ 暫停電台';
  setStatus(`正在播放：${currentStation().name}`);
});
audio.addEventListener('pause', () => {
  if (!audio.ended) {
    toggle.textContent = '▶ 播放電台';
  }
});
audio.addEventListener('waiting', () => setStatus('緩衝中…'));
audio.addEventListener('error', () => {
  toggle.textContent = '▶ 播放電台';
  setStatus('串流播放失敗，請切換其他電台或改用官方網站');
});

toggle.addEventListener('click', onToggle);
stop.addEventListener('click', () => stopPlayback('已停止'));
select.addEventListener('change', onStationChange);

window.timerSpeak = (message) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(message);
  u.lang = 'en-US';
  u.rate = 1.05;
  u.volume = 0.9;
  window.speechSynthesis.speak(u);
};

let wakeLock = null;
window.timerWake = async (enable) => {
  let msg = '';
  try {
    if (enable) {
      if (!('wakeLock' in navigator)) throw new Error('Safari 不支援螢幕常亮');
      wakeLock = await navigator.wakeLock.request('screen');
      msg = '螢幕常亮已啟用';
    } else if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      msg = '已停止螢幕常亮';
    }
  } catch (e) {
    msg = '無法保持螢幕常亮（可能是系統限制）';
  }
  document.getElementById('wake-status').textContent = msg || '螢幕常亮須保持網頁在前景';
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.timerIsRunning && document.getElementById('wake').checked) {
    window.timerWake(true);
  }
});

populateSelect();
updateStationUI();
setStatus('請先選擇電台，再按播放');

