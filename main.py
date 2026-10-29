"""PyScript workout timer. Radio playback uses HTMLAudioElement in radio.js."""
import asyncio
import math
import time
from js import document, window
from pyodide.ffi import create_proxy

get = document.getElementById
PHASE_LABELS = {'prepare': '預備時間', 'work': '運動時間', 'rest': '休息時間', 'done': '訓練完成'}
phase = 'prepare'
round_num = 1
running = False
remaining = 10
end_time = None
last_second = None
settings = {'prepare': 10, 'work': 25, 'rest': 20, 'rounds': 6}
proxies = []

def read_settings():
    defaults = {'prepare': 10, 'work': 25, 'rest': 20, 'rounds': 6}
    limits = {'prepare': (0, 3600), 'work': (1, 3600), 'rest': (0, 3600), 'rounds': (1, 99)}
    result = {}
    for name, fallback in defaults.items():
        try: value = int(get(name).value)
        except (ValueError, TypeError): value = fallback
        lo, hi = limits[name]
        result[name] = max(lo, min(hi, value))
        get(name).value = str(result[name])
    return result

def speak(msg):
    if get('voice').checked:
        window.timerSpeak(msg)

def render():
    mins, secs = divmod(max(0, math.ceil(remaining)), 60)
    get('clock').textContent = f'{mins:02d}:{secs:02d}'
    get('phase').textContent = PHASE_LABELS[phase]
    get('round').textContent = f'第 {round_num} / {settings["rounds"]} 組' if phase != 'done' else f'共完成 {settings["rounds"]} 組'
    get('start').textContent = '❚❚ 暫停' if running else ('▶ 重新開始' if phase == 'done' else '▶ 開始／繼續')
    document.body.classList.toggle('work-mode', phase == 'work')
    window.timerIsRunning = running

def enter(new_phase, announce=True):
    global phase, remaining, end_time, last_second
    phase = new_phase
    remaining = settings.get(new_phase, 0)
    end_time = time.monotonic() + remaining if running else None
    last_second = None
    if announce:
        prompts = {'prepare': 'Ready', 'work': 'Go', 'rest': 'Rest', 'done': 'Workout complete'}
        speak(prompts[new_phase])
    render()

def next_phase():
    global round_num, running
    if phase == 'prepare': enter('work')
    elif phase == 'work':
        if round_num >= settings['rounds']:
            running = False
            enter('done')
            window.timerWake(False)
        elif settings['rest'] > 0: enter('rest')
        else:
            round_num += 1
            enter('work')
    elif phase == 'rest':
        round_num += 1
        enter('work')

def handle_start(event):
    global running, end_time, settings, round_num
    if phase == 'done':
        settings = read_settings()
        round_num = 1
        enter('prepare', False)
    if running:
        remaining_pause()
    else:
        running = True
        end_time = time.monotonic() + remaining
        if get('wake').checked: window.timerWake(True)
        if phase == 'prepare': speak('Ready')
        elif phase == 'work': speak('Go')
        render()

def remaining_pause():
    global running, remaining, end_time
    if end_time is not None: remaining = max(0, end_time - time.monotonic())
    running = False
    end_time = None
    window.timerWake(False)
    render()

def handle_reset(event=None):
    global settings, round_num, running
    running = False
    settings = read_settings()
    round_num = 1
    enter('prepare', False)
    window.timerWake(False)

def handle_setting(event):
    if not running: handle_reset()

async def timer_loop():
    global remaining, last_second
    while True:
        await asyncio.sleep(0.08)
        if not running or end_time is None: continue
        remaining = max(0, end_time - time.monotonic())
        shown = math.ceil(remaining)
        if shown != last_second:
            last_second = shown
            if 1 <= shown <= 3: speak(str(shown))
            render()
        if remaining <= 0:
            next_phase()
            # Zero-length prepare/rest phase should transition immediately.
            for _ in range(3):
                if running and remaining == 0: next_phase()

for element, event, callback in [
    ('start', 'click', handle_start), ('reset', 'click', handle_reset),
    ('prepare','change',handle_setting), ('work','change',handle_setting),
    ('rest','change',handle_setting), ('rounds','change',handle_setting)]:
    proxy = create_proxy(callback)
    proxies.append(proxy)
    get(element).addEventListener(event, proxy)
handle_reset()
asyncio.create_task(timer_loop())
