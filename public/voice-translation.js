(() => {
  'use strict';
  let recording = false;
  let recorder = null;
  let chunks = [];
  let stream = null;

  const $ = s => document.querySelector(s);
  const toast = msg => {
    if (window.toast) window.toast(msg);
    else alert(msg);
  };

  async function stopAndTranslate() {
    if (!recorder || !recording) return;
    recording = false;
    $('#voiceMic') && ($('#voiceMic').textContent = 'Translating…');
    try { recorder.stop(); } catch {}
  }

  async function sendAudio(blob) {
    const lang = $('#voiceLang')?.value || 'en';
    const form = new FormData();
    form.append('file', blob, 'nexa-voice.webm');
    form.append('language', lang);
    const response = await fetch('/v1/audio/transcriptions', { method: 'POST', body: form, cache: 'no-store' });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data?.error || `Voice service HTTP ${response.status}`);

    const original = String(data?.text || '').trim();
    const english = String(data?.englishText || original).trim();
    const out = $('#voiceOut');
    if (out) {
      out.innerHTML = `<b>Detected (${lang.toUpperCase()})</b><br>${escapeHtml(original || 'No speech detected.')}<hr style="border:0;border-top:1px solid rgba(180,218,255,.16);margin:10px 0"><b>English translation</b><br>${escapeHtml(english || 'No English translation returned.')}`;
    }
    if (english && window.NexaApp?.chat) await window.NexaApp.chat(english);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast('Microphone recording is not supported by this browser.');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(x => MediaRecorder.isTypeSupported(x));
      recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          await sendAudio(blob);
        } catch (e) {
          const out = $('#voiceOut');
          if (out) out.textContent = `Voice translation failed: ${e.message}`;
        } finally {
          stream?.getTracks().forEach(t => t.stop());
          stream = null; recorder = null; chunks = [];
          if ($('#voiceMic')) $('#voiceMic').textContent = 'Start microphone';
        }
      };
      recording = true;
      $('#voiceMic') && ($('#voiceMic').textContent = 'Stop & translate');
      $('#voiceOut') && ($('#voiceOut').textContent = 'Listening… Speak naturally. Your selected language will be transcribed and translated to English.');
      recorder.start();
    } catch (e) {
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
      toast(`Microphone access failed: ${e.message}`);
    }
  }

  function interceptVoiceButton(e) {
    const button = e.target.closest?.('#voiceMic');
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (recording) stopAndTranslate(); else start();
  }

  // Capture phase prevents the legacy browser SpeechRecognition handler from
  // running. All selected languages now use the Nexa server STT + English translation path.
  document.addEventListener('click', interceptVoiceButton, true);
})();
