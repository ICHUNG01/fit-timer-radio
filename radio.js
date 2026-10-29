const audio=document.getElementById('radio-audio');
const toggle=document.getElementById('radio-toggle');
const stop=document.getElementById('radio-stop');
const status=document.getElementById('radio-status');
function setRadioState(label){status.textContent=label;toggle.textContent=audio.paused?'▶ 播放 ICRT':'❚❚ 暫停 ICRT';}
toggle.addEventListener('click',async()=>{if(!audio.paused){audio.pause();setRadioState('已暫停');return}try{setRadioState('正在連線…');await audio.play();setRadioState('正在播放 ICRT')}catch(err){setRadioState('無法播放串流，請檢查網址或網路');console.error(err)}});
stop.addEventListener('click',()=>{audio.pause();audio.currentTime=0;setRadioState('已停止')});
audio.addEventListener('playing',()=>setRadioState('正在播放 ICRT'));
audio.addEventListener('pause',()=>setRadioState('已暫停'));
audio.addEventListener('waiting',()=>setRadioState('緩衝中…'));
audio.addEventListener('error',()=>setRadioState('串流播放失敗，請改用官方網站'));
window.timerSpeak=(message)=>{if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.lang='en-US';u.rate=1.05;u.volume=0.9;window.speechSynthesis.speak(u)};
let wakeLock=null;
window.timerWake=async(enable)=>{let msg='';try{if(enable){if(!('wakeLock' in navigator))throw new Error('Safari 不支援螢幕常亮');wakeLock=await navigator.wakeLock.request('screen');msg='螢幕常亮已啟用'}else if(wakeLock){await wakeLock.release();wakeLock=null;msg='已停止螢幕常亮'}}catch(e){msg='無法保持螢幕常亮（可能是系統限制）'}document.getElementById('wake-status').textContent=msg||'螢幕常亮須保持網頁在前景'};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.timerIsRunning&&document.getElementById('wake').checked){window.timerWake(true)}});
