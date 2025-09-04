const control = document.getElementById('control');
const light = document.getElementById('light');
const play = document.getElementById('play');
const pause = document.getElementById('pause');
const audioIn = document.getElementById('audioIn');
const audio = new Audio();
let pickr;

const socket = io();

socket.on('connect', () => {
  socket.on('hex', (val) => { document.body.style.backgroundColor = val })
  socket.on('audio', (val) => { getSound(encodeURI(val)); })
  socket.on('pauseAudio', (val) => { audio.pause(); })
  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});

// enter controller mode
control.onclick = () => {
  console.log('control')
  // make sure you're not in fullscreen
  if (document.fullscreenElement) {
    document.exitFullscreen()
      .then(() => console.log('exited full screen mode'))
      .catch((err) => console.error(err));
    document.getElementById('auto-panel')?.style.display = 'block';
  }
  // make buttons and controls visible
  document.getElementById('user').classList.remove('fadeOut');
  document.getElementById('controlPanel').style.opacity = 0.6;
  if (!pickr) {
    // create our color picker. You can change the swatches that appear at the bottom
    pickr = Pickr.create({
      el: '.pickr',
      theme: 'classic',
      showAlways: true,
      swatches: [
        'rgba(255, 255, 255, 1)',
        'rgba(244, 67, 54, 1)',
        'rgba(233, 30, 99, 1)',
        'rgba(156, 39, 176, 1)',
        'rgba(103, 58, 183, 1)',
        'rgba(63, 81, 181, 1)',
        'rgba(33, 150, 243, 1)',
        'rgba(3, 169, 244, 1)',
        'rgba(0, 188, 212, 1)',
        'rgba(0, 150, 136, 1)',
        'rgba(76, 175, 80, 1)',
        'rgba(139, 195, 74, 1)',
        'rgba(205, 220, 57, 1)',
        'rgba(255, 235, 59, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(0, 0, 0, 1)',
      ],
      components: {
        preview: false,
        opacity: false,
        hue: true,
      },
    });

    pickr.on('change', (e) => {
      // when pickr color value is changed change background and send message on ws to change background
      const hexCode = e.toHEXA().toString();
      document.body.style.backgroundColor = hexCode;
      socket.emit('hex', hexCode)
    });
  }
};

light.onclick = () => {
  // safari requires playing on input before allowing audio
  audio.muted = true;
  audio.play().then(audio.muted = false)

  // in light mode make it full screen and fade buttons
  document.documentElement.requestFullscreen();
  document.getElementById('user').classList.add('fadeOut');
  // if you were previously in control mode remove color picker and hide controls
  if (pickr) {
    // this is annoying because of the pickr package
    pickr.destroyAndRemove();
    document.getElementById('controlPanel').append(Object.assign(document.createElement('div'), { className: 'pickr' }));
    pickr = undefined;
  }
  document.getElementById('controlPanel').style.opacity = 0;
};


const getSound = (query, loop = false, random = false) => {
  const url = `https://freesound.org/apiv2/search/text/?query=${query}+"&fields=name,previews&token=U5slaNIqr6ofmMMG2rbwJ19mInmhvCJIryn2JX89&format=json`;
  fetch(url)
    .then((response) => response.clone().text())
    .then((data) => {
      console.log(data);
      data = JSON.parse(data);
      if (data.results.length >= 1) var src = random ? choice(data.results).previews['preview-hq-mp3'] : data.results[0].previews['preview-hq-mp3'];
      audio.src = src;
      audio.play();
      console.log(src);
    })
    .catch((error) => console.log(error));
};

play.onclick = () => {
  socket.emit('audio', audioIn.value)
  getSound(encodeURI(audioIn.value));
};
pause.onclick = () => {
  socket.emit('pauseAudio', audioIn.value)
  audio.pause();
};
audioIn.onkeyup = (e) => { if (e.keyCode === 13) { play.click(); } };


// ===== Auto Flash 功能 =====
function startAutoFromUI() {
  const raw = document.getElementById('auto-colors').value.trim();
  const colors = raw.split(',').map(s => s.trim()).filter(Boolean);
  const stepMs = parseInt(document.getElementById('auto-step').value, 10) || 300;
  const mode = document.getElementById('auto-mode').value;
  const loop = document.getElementById('auto-loop').checked;

  const cfg = { colors, stepMs, mode, loop, ease: (mode === 'fade') };
  socket.emit('autoFlash', cfg);
}

function stopAutoFromUI() {
  socket.emit('stopAuto', {});
}

document.getElementById('btn-start-auto').addEventListener('click', startAutoFromUI);
document.getElementById('btn-stop-auto').addEventListener('click', stopAutoFromUI);

// 当点击 Jane Wren 按钮时，显示 Auto Flash 面板
document.getElementById('control').addEventListener('click', () => {
  document.getElementById('auto-panel').style.display = 'block';
});

// 灯端接收自动闪烁配置
let autoTimer = null;
let autoIdx = 0;
function applyColor(color, ease) {
  document.body.style.transition = ease ? 'background-color 0.25s linear' : 'none';
  document.body.style.backgroundColor = color;
}
function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  autoIdx = 0;
}
socket.on('autoFlash', (cfg) => {
  stopAuto();
  if (!cfg.colors || cfg.colors.length === 0) return;
  applyColor(cfg.colors[0], cfg.ease);
  if (cfg.colors.length === 1 && !cfg.loop) return;
  autoTimer = setInterval(() => {
    autoIdx += 1;
    if (!cfg.loop && autoIdx >= cfg.colors.length) {
      stopAuto();
      return;
    }
    const color = cfg.colors[autoIdx % cfg.colors.length];
    applyColor(color, cfg.mode === 'fade');
  }, Math.max(50, cfg.stepMs || 300));
});
socket.on('stopAuto', stopAuto);
