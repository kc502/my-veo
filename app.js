const apiKeyInput = document.getElementById('apiKey');
const checkKeyBtn = document.getElementById('checkKeyBtn');
const keyStatus = document.getElementById('keyStatus');
const generateBtn = document.getElementById('generateBtn');
const generateStatus = document.getElementById('generateStatus');
const resultArea = document.getElementById('resultArea');

checkKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) { keyStatus.textContent = 'Paste your API key first'; return; }
  keyStatus.textContent = 'Checking…';
  try {
    const res = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const j = await res.json();
    if (res.ok && j.valid) {
      keyStatus.textContent = '✅ Valid key';
      generateBtn.disabled = false;
      generateStatus.textContent = 'Key valid — fill prompt and click Generate';
    } else {
      keyStatus.textContent = '❌ Invalid key';
      generateBtn.disabled = true;
      generateStatus.textContent = 'Provide valid key';
    }
  } catch (err) {
    keyStatus.textContent = 'Error checking key';
    generateBtn.disabled = true;
    generateStatus.textContent = 'Error';
    console.error(err);
  }
});

generateBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  const payload = {
    apiKey: key,
    model: document.getElementById('model').value,
    aspectRatio: document.getElementById('aspect').value,
    personGeneration: document.getElementById('personGeneration').value,
    resolution: document.getElementById('resolution').value,
    negativePrompt: document.getElementById('negativePrompt').value,
    prompt: document.getElementById('videoPrompt').value,
  };

  if (!payload.prompt || payload.prompt.trim().length < 5) {
    alert('Please write a longer prompt (at least 5 chars).');
    return;
  }

  generateBtn.disabled = true;
  generateStatus.textContent = 'Starting generation… (this may take 10s–minutes)';
  resultArea.innerHTML = '';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Generation failed');
    }

    // server returns JSON { operationName: "...", downloadUrl: "...?" } when ready
    const j = await res.json();

    if (j.downloadUrl) {
      // direct URL to mp4 (signed)
      generateStatus.textContent = 'Done — click to play/download';
      const video = document.createElement('video');
      video.controls = true;
      video.src = j.downloadUrl;
      resultArea.appendChild(video);
    } else if (j.operationName) {
      generateStatus.textContent = 'Queued — polling for completion...';
      // poll for status
      pollOperation(j.operationName, payload.apiKey);
    } else {
      generateStatus.textContent = 'Started — waiting.';
      resultArea.textContent = JSON.stringify(j);
    }
  } catch (err) {
    console.error(err);
    generateStatus.textContent = 'Error: ' + (err.message || err);
  } finally {
    generateBtn.disabled = false;
  }
});


async function pollOperation(operationName, apiKey) {
  try {
    const res = await fetch('/api/operation-status', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ operationName, apiKey })
    });
    const j = await res.json();
    if (j.done && j.downloadUrl) {
      generateStatus.textContent = 'Ready — video below';
      const video = document.createElement('video');
      video.controls = true;
      video.src = j.downloadUrl;
      resultArea.innerHTML = '';
      resultArea.appendChild(video);
    } else if (j.done && j.error) {
      generateStatus.textContent = 'Generation error: ' + j.error.message;
    } else {
      generateStatus.textContent = 'Not ready — polling again in 6s';
      setTimeout(() => pollOperation(operationName, apiKey), 6000);
    }
  } catch (err) {
    console.error(err);
    generateStatus.textContent = 'Polling error';
  }
}
