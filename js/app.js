// Frequencies used by each of the 7 EQ bands.
const bandFrequencies = [50, 120, 400, 500, 800, 4500, 10000];

// DOM references for all controls and display elements.
const player = document.getElementById('player');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const bypassBtn = document.getElementById('bypassBtn');
const seekBar = document.getElementById('seekBar');
const currentTimeLabel = document.getElementById('currentTime');
const durationLabel = document.getElementById('duration');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const albumArt = document.getElementById('albumArt');
const dropZone = document.getElementById('dropZone');
const fileSelectBtn = document.getElementById('fileSelectBtn');
const audioFileInput = document.getElementById('audioFileInput');
const sliders = document.querySelectorAll('input[data-type="band"], input[data-type="level"]');

// Audio graph state.
let audioCtx = null;
let sourceNode = null;
let analyser = null;
let gainNode = null;
let filters = [];
let currentTrack = null;
let isBypassed = false;

function initAudioContext() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  analyser = audioCtx.createAnalyser();
  analyser.fftSize =512;
  analyser.smoothingTimeConstant = 0.85;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;

  sourceNode = audioCtx.createMediaElementSource(player);
  player.muted = false;
  player.volume = 1;

  filters = bandFrequencies.map((frequency) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = frequency;
    filter.Q.value = 1.4;
    filter.gain.value = 0;
    return filter;
  });

  connectAudioChain();
  updateAllSliders();
}

function connectAudioChain() {
  if (!audioCtx || !sourceNode) return;

  sourceNode.disconnect();
  filters.forEach((filter) => filter.disconnect());
  gainNode.disconnect();
  analyser.disconnect();

  if (isBypassed) {
    sourceNode.connect(gainNode);
  } else {
    sourceNode.connect(filters[0]);
    filters.reduce((prev, next) => {
      prev.connect(next);
      return next;
    });
    filters[filters.length - 1].connect(gainNode);
  }

  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function formatDb(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)} dB`;
}

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function updateSliderTooltip(slider) {
  const wrapper = slider.closest('.slider-wrap');
  if (!wrapper) return;
  const valueLabel = wrapper.querySelector('.slider-value');
  if (!valueLabel) return;
  valueLabel.textContent = formatDb(slider.value);
}

function updateBandGain(index, gain) {
  if (!filters[index]) return;
  filters[index].gain.value = gain;
}

function updateMasterGain(value) {
  if (!gainNode) return;
  gainNode.gain.value = Math.max(0, (parseFloat(value) + 15) / 15);
}

function updateAllSliders() {
  sliders.forEach((slider) => {
    updateSliderTooltip(slider);
    const type = slider.dataset.type;
    if (type === 'band') {
      const index = Number(slider.dataset.index);
      updateBandGain(index, parseFloat(slider.value));
    }
    if (type === 'level') {
      updateMasterGain(slider.value);
    }
  });
}

function setTrackMetadata(track) {
  if (!track) {
    trackTitle.textContent = 'Upload a song';
    trackArtist.textContent = 'Local file';
    albumArt.style.background = 'radial-gradient(circle at 35% 30%, #6f6f6f 0%, #1f1e1c 60%)';
    return;
  }

  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  albumArt.style.background = `radial-gradient(circle at 35% 30%, ${track.art[0]} 0%, ${track.art[1]} 60%)`;
}

function loadTrack(track, autoplay = false) {
  currentTrack = track;
  player.src = track.src;
  player.crossOrigin = 'anonymous';
  player.load();
  setTrackMetadata(track);

  if (!audioCtx) {
    initAudioContext();
  }

  const playNow = () => {
    player.play().catch((err) => console.log('Play error:', err));
  };

  if (autoplay) {
    const startPlayback = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(playNow).catch((err) => console.log('Resume error:', err));
      } else {
        playNow();
      }
    };

    if (player.readyState >= 3) {
      startPlayback();
    } else {
      player.addEventListener('canplay', startPlayback, { once: true });
    }
  }
}

function playAudio() {
  if (!currentTrack) return;
  initAudioContext();
  const startPlayback = () => {
    player.play().catch((err) => console.log('Play error:', err));
  };

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(startPlayback).catch((err) => console.log('Resume error:', err));
  } else {
    startPlayback();
  }
}

function pauseAudio() {
  player.pause();
}

function restartAudio() {
  player.currentTime = 0;
}

function toggleBypass() {
  isBypassed = !isBypassed;
  bypassBtn.setAttribute('aria-pressed', String(!isBypassed));
  bypassBtn.querySelector('.led').classList.toggle('active', !isBypassed);
  bypassBtn.querySelector('.switch-label').textContent = isBypassed ? 'EQ BYPASSED' : 'EQ ACTIVE';
  if (audioCtx) {
    connectAudioChain();
  }
}

function updateSeek() {
  if (!player.duration || Number.isNaN(player.duration)) {
    seekBar.value = 0;
    currentTimeLabel.textContent = '0:00';
    durationLabel.textContent = '0:00';
    return;
  }
  currentTimeLabel.textContent = formatTime(player.currentTime);
  durationLabel.textContent = formatTime(player.duration);
  seekBar.value = (player.currentTime / player.duration) * 100;
}

function syncSeekBar(event) {
  if (!player.duration || Number.isNaN(player.duration)) return;
  const value = Number(event.target.value);
  player.currentTime = (value / 100) * player.duration;
}

sliders.forEach((slider) => {
  updateSliderTooltip(slider);
  slider.addEventListener('input', (event) => {
    const target = event.target;
    updateSliderTooltip(target);
    if (target.dataset.type === 'band') {
      updateBandGain(Number(target.dataset.index), parseFloat(target.value));
    }
    if (target.dataset.type === 'level') {
      updateMasterGain(target.value);
    }
  });
});

playBtn.addEventListener('click', playAudio);
pauseBtn.addEventListener('click', pauseAudio);
restartBtn.addEventListener('click', restartAudio);

bypassBtn.addEventListener('click', () => {
  initAudioContext();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(toggleBypass);
  } else {
    toggleBypass();
  }
});

seekBar.addEventListener('input', syncSeekBar);
player.addEventListener('timeupdate', updateSeek);
player.addEventListener('durationchange', updateSeek);
player.addEventListener('error', (e) => {
  console.error('Audio element error', e, player.error);
});
player.addEventListener('play', () => {
  console.log('Audio playing, readyState=', player.readyState, 'currentTime=', player.currentTime);
});
player.addEventListener('canplay', () => {
  console.log('Audio canplay, readyState=', player.readyState);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dropZone.classList.add('dragover');
  });
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
});

function addLocalTracks(files) {
  const audioFiles = Array.from(files).filter((file) => file.type.startsWith('audio') || /\.(mp3|wav|flac|m4a|aac)$/i.test(file.name));
  if (!audioFiles.length) return;
  const file = audioFiles[0];
  const track = {
    title: file.name.replace(/\.[^/.]+$/, ''),
    artist: 'Local file',
    src: URL.createObjectURL(file),
    art: ['#4a4a4a', '#1c1b1a'],
  };
  loadTrack(track, true);
}

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addLocalTracks(e.dataTransfer.files);
});

fileSelectBtn.addEventListener('click', () => {
  audioFileInput.click();
});

audioFileInput.addEventListener('change', (e) => {
  addLocalTracks(e.target.files);
  audioFileInput.value = '';
});

['dragenter', 'dragover', 'drop'].forEach((eventName) => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
  });
});

window.addEventListener('load', () => {
  // Try to load a bundled "initial" song so users have something to start with.
  // If the file isn't present, fall back to the default upload prompt.
  updateAllSliders();

  const defaultTrack = {
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    src: 'assets/initial.mp3',
    art: ['#6f6f6f', '#1f1e1c'],
  };

  let defaultLoaded = false;

  const handleDefaultCanPlay = () => {
    defaultLoaded = true;
    loadTrack(defaultTrack, false);
    player.removeEventListener('canplay', handleDefaultCanPlay);
    player.removeEventListener('error', handleDefaultError);
  };

  const handleDefaultError = () => {
    // No bundled initial song found — keep the UI in the empty/upload state.
    setTrackMetadata(null);
    player.removeEventListener('canplay', handleDefaultCanPlay);
    player.removeEventListener('error', handleDefaultError);
  };

  // Probe the expected default location. Browsers will fire either canplay or error.
  try {
    player.src = defaultTrack.src;
    player.crossOrigin = 'anonymous';
    player.load();
    player.addEventListener('canplay', handleDefaultCanPlay, { once: true });
    player.addEventListener('error', handleDefaultError, { once: true });

    // Safety fallback: if neither event fires within a short time, revert UI.
    setTimeout(() => {
      if (!defaultLoaded) {
        setTrackMetadata(null);
        player.removeAttribute('src');
      }
    }, 800);
  } catch (e) {
    setTrackMetadata(null);
  }
});
