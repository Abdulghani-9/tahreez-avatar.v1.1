import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const canvas = document.getElementById('scene');
const talkBtn = document.getElementById('talk');
const muteBtn = document.getElementById('mute');
const langSel = document.getElementById('lang');
const lastDiv = document.getElementById('last');
const autorotateChk = document.getElementById('autorotate');
const faceTrackChk = document.getElementById('faceTrack');
const lipSyncChk = document.getElementById('lipSync');
const camEl = document.getElementById('cam');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6);

scene.add(new THREE.HemisphereLight(0xffffff, 0x101020, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(1,1,1.5);
scene.add(dir);

const group = new THREE.Group();
scene.add(group);

const loader = new THREE.TextureLoader();
const tex = loader.load('./assets/avatar.png', () => {
  tex.colorSpace = THREE.SRGBColorSpace;
  const aspect = tex.image.width / tex.image.height;
  const h = 4.2; const w = h * aspect;
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true });
  const body = new THREE.Mesh(geo, mat);
  body.position.set(0, 0, 0);
  body.name = 'body';
  group.add(body);
});

const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .0 }));
back.position.set(0,0,-2);
scene.add(back);

let t0 = performance.now();
let mouthOpen = 0;
let talking = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let ttsGain = audioCtx.createGain(); ttsGain.gain.value = 1.0; ttsGain.connect(audioCtx.destination);

const speak = (text, lang='en-US') => {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  const voices = speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === lang) || voices[0];
  if (v) utter.voice = v;
  utter.rate = 1.0; utter.pitch = 1.0;
  utter.onstart = ()=> { talking = true; };
  utter.onend = ()=> { talking = false; mouthOpen = 0; };
  speechSynthesis.speak(utter);
};

function updateMouth(dt) {
  if (!lipSyncChk.checked) return;
  if (!talking) { mouthOpen = Math.max(0, mouthOpen - dt*2); return; }
  mouthOpen = 0.4 + 0.3 * Math.sin(performance.now() * 0.02) + 0.2 * Math.random();
  mouthOpen = Math.min(1, Math.max(0, mouthOpen));
  const s = 1 + mouthOpen * 0.02;
  group.scale.set(s, 1 - mouthOpen*0.01, 1);
}

let faceDetector = null;
async function initFace() {
  try {
    const { FaceDetector, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js');
    const filesetResolver = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm');
    faceDetector = await FaceDetector.createFromOptions(filesetResolver, { runningMode: 'VIDEO', baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/short_range/float16/1/short_range.tflite' } });
  } catch (e) { console.warn('Face detector init failed', e); }
}
initFace();

async function startCamera() {
  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === 'videoinput' && (!d.label || (!/hdmi/i.test(d.label) && !/real/i.test(d.label))));
    const deviceId = cams.length ? cams[0].deviceId : undefined;
    const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId } : true, audio: false });
    camEl.srcObject = stream;
  } catch (e) { console.warn('Camera error', e); }
}
startCamera();

let mediaStream = null, mediaRecorder = null, chunks = [];
async function startMic() {
  if (mediaStream) return;
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
  chunks = [];
  mediaRecorder.ondataavailable = (e)=> { if (e.data.size > 0) chunks.push(e.data); };
  mediaRecorder.onstop = async ()=> {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    chunks = [];
    const lang = langSel.value || 'en-US';
    const form = new FormData();
    form.append('audio', blob, 'clip.webm');
    form.append('lang', lang);
    try {
      const res = await fetch('/api/stt', { method: 'POST', body: form });
      const j = await res.json();
      const text = (j.text || '').trim();
      if (text) {
        lastDiv.textContent = (lang.startsWith('ar') ? 'المستخدم: ' : 'User: ') + text;
        const answer = await askTahreez(text, lang);
        speak(answer, lang);
        lastDiv.textContent += (lang.startsWith('ar') ? '\\nالمساعد: ' : '\\nAssistant: ') + answer;
      }
    } catch (e) { console.warn('STT failed', e); }
  };
}

async function askTahreez(q, lang) {
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, lang })
    });
    const j = await res.json();
    return j.text || (lang.startsWith('ar') ? 'عذرًا، لم أفهم.' : "Sorry, I didn't catch that.");
  } catch (e) {
    return lang.startsWith('ar') ? 'عذرًا، تعذّر الوصول لقاعدة المعرفة.' : 'Sorry, knowledge base is unavailable.';
  }
}

talkBtn.addEventListener('mousedown', async ()=> {
  talkBtn.classList.add('active');
  await startMic();
  mediaRecorder && mediaRecorder.start();
});
window.addEventListener('mouseup', ()=> {
  talkBtn.classList.remove('active');
  mediaRecorder && mediaRecorder.state !== 'inactive' && mediaRecorder.stop();
});

muteBtn.addEventListener('click', ()=> {
  ttsGain.gain.value = ttsGain.gain.value > 0 ? 0 : 1;
  muteBtn.textContent = ttsGain.gain.value ? '🔈' : '🔇';
});

window.addEventListener('resize', ()=> {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

function loop(now = performance.now()) {
  const dt = (now - t0) / 1000; t0 = now;

  if (autorotateChk.checked) {
    group.rotation.y = Math.sin(now * 0.0005) * 0.06;
    group.position.y = Math.sin(now * 0.0012) * 0.05;
  }
  updateMouth(dt);

  if (faceDetector && faceTrackChk.checked && camEl.videoWidth > 0) {
    if (!loop._ftLast || now - loop._ftLast > 120) {
      loop._ftLast = now;
      faceDetector.detectForVideo(camEl, now).then((res) => {
        if (res.detections && res.detections.length) {
          const d = res.detections[0];
          const bb = d.boundingBox;
          const cx = (bb.originX + bb.width/2) / camEl.videoWidth;
          const cy = (bb.originY + bb.height/2) / camEl.videoHeight;
          const yaw = (cx - 0.5) * -0.8;
          const pitch = (cy - 0.5) * 0.8;
          group.rotation.y = yaw;
          group.rotation.x = pitch;
        }
      }).catch(()=>{});
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();
