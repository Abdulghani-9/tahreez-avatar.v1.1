 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/public/app.js b/public/app.js
index c4ce608d40c9689ace93555033198dedff09f2bd..90659d9b428f637ec864f786c4bcfffc0ea24096 100644
--- a/public/app.js
+++ b/public/app.js
@@ -40,56 +40,65 @@ const tex = loader.load('./assets/avatar.png', () => {
 
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
-  if (!lipSyncChk.checked) return;
-  if (!talking) { mouthOpen = Math.max(0, mouthOpen - dt*2); return; }
+  if (!lipSyncChk.checked) {
+    mouthOpen = 0;
+    group.scale.set(1, 1, 1);
+    return;
+  }
+  if (!talking) {
+    mouthOpen = Math.max(0, mouthOpen - dt * 2);
+    const s = 1 + mouthOpen * 0.02;
+    group.scale.set(s, 1 - mouthOpen * 0.01, 1);
+    return;
+  }
   mouthOpen = 0.4 + 0.3 * Math.sin(performance.now() * 0.02) + 0.2 * Math.random();
   mouthOpen = Math.min(1, Math.max(0, mouthOpen));
   const s = 1 + mouthOpen * 0.02;
-  group.scale.set(s, 1 - mouthOpen*0.01, 1);
+  group.scale.set(s, 1 - mouthOpen * 0.01, 1);
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
 
EOF
)
