
/* =====================================================
   iPhone / Safari Audio Session 相容性設定
===================================================== */

function setupAudioSession() {
  try {
    if ('audioSession' in navigator) {
      navigator.audioSession.type = 'playback';
    }
  } catch (err) {
    console.warn('Audio Session 設定失敗：', err);
  }
}

setupAudioSession();

/* =====================================================
   電台清單
===================================================== */

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

/* =====================================================
   HTML 元件
===================================================== */

const audio = document.getElementById('radio-audio');
const toggle = document.getElementById('radio-toggle');
const stop = document.getElementById('radio-stop');
const status = document.getElementById('radio-status');
const title = document.getElementById('radio-title');
const desc = document.getElementById('radio-desc');
const select = document.getElementById('station-select');
const link = document.getElementById('radio-link');

/* =====================================================
   全域狀態
===================================================== */

let currentIndex = 0;

// 使用者是否希望收音機持續播放
let radioWanted = false;

// 避免重複恢復播放
let recoveringRadio = false;

// 播放操作版本，避免舊操作影響新操作
let playbackVersion = 0;

// 語音播放狀態
let activeSpeech = null;
let speechVersion = 0;

// 收音機恢復計時器
let recoveryTimer = null;

// 螢幕常亮
let wakeLock = null;
let wakePending = false;
let wakeWanted = false;

/* =====================================================
   電台基本功能
===================================================== */

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

  toggle.textContent = radioWanted
    ? '❚❚ 暫停電台'
    : '▶ 播放電台';
}

/* =====================================================
   取消自動恢復
===================================================== */

function cancelRecovery() {
  if (recoveryTimer !== null) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
}

/* =====================================================
   停止播放
===================================================== */

function stopPlayback(message = '已停止') {
  radioWanted = false;
  playbackVersion++;

  cancelRecovery();

  audio.pause();

  // 釋放直播串流連線
  audio.removeAttribute('src');
  audio.load();

  toggle.textContent = '▶ 播放電台';

  setStatus(message);
}

/* =====================================================
   播放目前電台
===================================================== */

async function playCurrent() {
  setupAudioSession();

  const station = currentStation();

  if (!station.url) {
    radioWanted = false;

    setStatus('此電台請改用下方官方網站播放');

    updateStationUI();

    return;
  }

  cancelRecovery();

  const version = ++playbackVersion;

  radioWanted = true;

  if (audio.getAttribute('src') !== station.url) {
    audio.src = station.url;
  }

  setStatus(`正在連線 ${station.name}…`);

  toggle.textContent = '❚❚ 暫停電台';

  try {
    await audio.play();

    if (version !== playbackVersion || !radioWanted) {
      return;
    }

    toggle.textContent = '❚❚ 暫停電台';

    setStatus(`正在播放：${station.name}`);

    console.log('電台播放成功：', station.name);

  } catch (err) {
    if (version !== playbackVersion) {
      return;
    }

    console.error('電台播放失敗：', err);

    radioWanted = false;

    setStatus('無法播放這個電台，請切換其他電台試試');

    toggle.textContent = '▶ 播放電台';
  }
}

/* =====================================================
   iPhone 音訊自動恢復
===================================================== */

async function restoreRadio(reason = '') {
  if (!radioWanted) return;
  if (recoveringRadio) return;
  if (activeSpeech !== null) return;
  if (!currentStation().url) return;

  setupAudioSession();

  // 收音機沒有被暫停時，不重新連線
  if (!audio.paused && !audio.ended) {
    return;
  }

  const version = playbackVersion;

  recoveringRadio = true;

  console.log('嘗試恢復收音機：', reason);

  try {
    await audio.play();

    if (version !== playbackVersion || !radioWanted) {
      return;
    }

    toggle.textContent = '❚❚ 暫停電台';

    setStatus(`正在播放：${currentStation().name}`);

    console.log('收音機恢復成功');

  } catch (err) {
    if (version !== playbackVersion || !radioWanted) {
      return;
    }

    console.warn('收音機恢復失敗：', err);

    radioWanted = false;

    toggle.textContent = '▶ 播放電台';

    setStatus('音訊已中斷，請按播放重新連線');

  } finally {
    recoveringRadio = false;
  }
}

/* =====================================================
   延遲恢復播放
===================================================== */

function scheduleRecovery(delay = 300, reason = '') {
  cancelRecovery();

  if (!radioWanted) return;

  recoveryTimer = setTimeout(() => {
    recoveryTimer = null;

    restoreRadio(reason);

  }, delay);
}

/* =====================================================
   播放／暫停按鈕
===================================================== */

async function onToggle() {
  if (radioWanted) {
    radioWanted = false;
    playbackVersion++;

    cancelRecovery();

    audio.pause();

    toggle.textContent = '▶ 播放電台';

    setStatus('已暫停');

    return;
  }

  await playCurrent();
}

/* =====================================================
   切換電台
===================================================== */

function onStationChange() {
  const wasPlaying = radioWanted;

  stopPlayback('已切換電台');

  currentIndex = Number(select.value) || 0;

  updateStationUI();

  setStatus(`已選擇：${currentStation().name}`);

  if (wasPlaying) {
    playCurrent();
  }
}

/* =====================================================
   收音機事件監聽
===================================================== */

audio.addEventListener('playing', () => {
  if (!radioWanted) return;

  toggle.textContent = '❚❚ 暫停電台';

  setStatus(`正在播放：${currentStation().name}`);
});

audio.addEventListener('pause', () => {
  console.log('收音機發生 pause 事件');

  if (radioWanted) {
    setStatus('音訊暫時中斷，等待恢復…');

    // 語音正在播放時，等語音結束再恢復
    if (activeSpeech === null) {
      scheduleRecovery(300, '系統暫停音訊');
    }

  } else {
    toggle.textContent = '▶ 播放電台';
  }
});

audio.addEventListener('waiting', () => {
  if (radioWanted) {
    setStatus('緩衝中…');
  }
});

audio.addEventListener('stalled', () => {
  if (radioWanted) {
    console.warn('收音機串流暫時停滯');

    setStatus('串流連線暫時停滯…');
  }
});

audio.addEventListener('ended', () => {
  if (radioWanted) {
    scheduleRecovery(500, '串流播放結束');
  }
});

audio.addEventListener('error', () => {
  if (!radioWanted) return;

  console.error('收音機音訊錯誤：', audio.error);

  radioWanted = false;

  cancelRecovery();

  toggle.textContent = '▶ 播放電台';

  setStatus('串流播放失敗，請切換其他電台或重新播放');
});

/* =====================================================
   按鈕事件
===================================================== */

toggle.addEventListener('click', onToggle);

stop.addEventListener('click', () => {
  stopPlayback('已停止');
});

select.addEventListener('change', onStationChange);

/* =====================================================
   運動計時器語音
   iPhone / Safari 相容性修改
===================================================== */

window.timerSpeak = (message) => {
  if (!('speechSynthesis' in window)) {
    return;
  }

  setupAudioSession();

  const version = ++speechVersion;

  const u = new SpeechSynthesisUtterance(
    String(message)
  );

  u.lang = 'en-US';
  u.rate = 1.05;
  u.volume = 0.9;

  // 保留語音物件
  activeSpeech = u;

  console.log('準備播放語音：', message);

  u.onstart = () => {
    console.log('語音開始：', message);
  };

  function finishSpeech() {
    // 避免先前語音的事件干擾目前語音
    if (version !== speechVersion) {
      return;
    }

    activeSpeech = null;

    setupAudioSession();

    console.log('語音結束：', message);

    // 語音結束後檢查收音機
    if (radioWanted) {
      scheduleRecovery(300, '計時器語音結束');
    }
  }

  u.onend = finishSpeech;

  u.onerror = (event) => {
    console.warn('語音播放錯誤：', event.error);

    finishSpeech();
  };

  try {
    // 不再每次呼叫 speechSynthesis.cancel()
    window.speechSynthesis.speak(u);

  } catch (err) {
    console.error('無法播放計時器語音：', err);

    finishSpeech();
  }
};

/* =====================================================
   Audio Session 狀態監聽
===================================================== */

if ('audioSession' in navigator) {
  try {
    navigator.audioSession.addEventListener(
      'statechange',
      () => {
        const state = navigator.audioSession.state;

        console.log('Audio Session 狀態：', state);

        if (state === 'active' && radioWanted) {
          scheduleRecovery(300, 'Audio Session 恢復');
        }
      }
    );

  } catch (err) {
    console.warn('無法監聽 Audio Session：', err);
  }
}

/* =====================================================
   螢幕常亮 Wake Lock
===================================================== */

window.timerWake = async (enable) => {
  let msg = '';

  wakeWanted = enable;

  try {
    if (enable) {
      if (!('wakeLock' in navigator)) {
        throw new Error('瀏覽器不支援螢幕常亮');
      }

      if (wakePending) return;

      // 避免重複申請 Wake Lock
      if (wakeLock && !wakeLock.released) {
        return;
      }

      wakePending = true;

      try {
        const lock = await navigator.wakeLock.request('screen');

        // 避免申請期間已經停止計時
        if (!wakeWanted) {
          await lock.release();
          return;
        }

        wakeLock = lock;

        wakeLock.addEventListener('release', () => {
          console.log('Wake Lock 已釋放');

          if (wakeLock === lock) {
            wakeLock = null;
          }
        });

        msg = '螢幕常亮已啟用';

      } finally {
        wakePending = false;
      }

    } else {
      if (wakeLock) {
        const lock = wakeLock;

        wakeLock = null;

        await lock.release();
      }

      msg = '已停止螢幕常亮';
    }

  } catch (err) {
    console.warn('Wake Lock 錯誤：', err);

    msg = '無法保持螢幕常亮（可能是系統限制）';
  }

  const wakeStatus = document.getElementById('wake-status');

  if (wakeStatus) {
    wakeStatus.textContent =
      msg || '螢幕常亮須保持網頁在前景';
  }
};

/* =====================================================
   Safari 切換前景／背景
===================================================== */

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setupAudioSession();

    // 回到 Safari 時檢查收音機
    if (radioWanted) {
      scheduleRecovery(300, '網頁回到前景');
    }

    // 計時中重新取得螢幕常亮
    if (
      window.timerIsRunning &&
      document.getElementById('wake').checked
    ) {
      window.timerWake(true);
    }
  }
});

/* =====================================================
   網頁初始化
===================================================== */

populateSelect();

updateStationUI();

setStatus('請先選擇電台，再按播放');
