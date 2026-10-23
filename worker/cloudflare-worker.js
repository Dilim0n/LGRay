/**
 * Cloudflare Worker for X-ray Client (webOS TV)
 * Endpoint: api-lgray.dilim0n.ru
 * 
 * Features:
 * 1. Mobile Web UI (/import?code=XXXXX) for phone camera QR scan with 1-click paste & send.
 * 2. API for TV to create short 5-character pairing code (GET /api/session/create).
 * 3. Long-polling / polling API for TV (GET /api/session/poll?code=XXXXX).
 * 4. Upload API from phone to TV (POST /api/session/upload).
 * 5. Works with Cloudflare KV (if bound as SESSIONS or KV) or native Cache API.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Authorization',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const isKV = (x) => x && typeof x.get === 'function' && typeof x.put === 'function';
    const kv = isKV(env.SESSIONS) ? env.SESSIONS : (isKV(env.KV) ? env.KV : null);

    if (url.pathname === '/api/debug') {
      return new Response(JSON.stringify({
        hasKV: !!kv,
        kvType: typeof env.SESSIONS,
        isKVBinding: !!kv,
        edgeColo: request.cf ? request.cf.colo : 'unknown'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Helper: Storage with Cloudflare KV and Cache API fallback
    const storage = {
      async get(key) {
        if (kv) {
          try {
            return await kv.get(key);
          } catch (e) {
            console.error('KV get error:', e);
          }
        }
        
        // Cache API fallback
        try {
          const cache = caches.default;
          const cacheKey = new Request(`https://${url.hostname}/__cache_session/${key}`);
          const resp = await cache.match(cacheKey);
          return resp ? await resp.text() : null;
        } catch (e) {
          return null;
        }
      },
      async set(key, value, ttlSeconds = 600) {
        if (kv) {
          try {
            return await kv.put(key, value, { expirationTtl: ttlSeconds });
          } catch (e) {
            console.error('KV put error:', e);
          }
        }

        // Cache API fallback
        try {
          const cache = caches.default;
          const cacheKey = new Request(`https://${url.hostname}/__cache_session/${key}`);
          const resp = new Response(value, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': `no-cache, max-age=${ttlSeconds}`
            }
          });
          await cache.put(cacheKey, resp);
        } catch (e) {}
      },
      async delete(key) {
        if (kv) {
          try {
            return await kv.delete(key);
          } catch (e) {}
        }
        try {
          const cache = caches.default;
          await cache.delete(new Request(`https://${url.hostname}/__cache_session/${key}`));
        } catch (e) {}
      }
    };

    // --------------------------------------------------------------------------
    // 1. Mobile Web UI for QR Scanner (/import, /, /send)
    // --------------------------------------------------------------------------
    if (url.pathname === '/import' || url.pathname === '/' || url.pathname === '/send') {
      const code = (url.searchParams.get('code') || '').toUpperCase().trim();
      return new Response(renderMobileHtml(code, url.origin), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // --------------------------------------------------------------------------
    // 2. API: TV creates a new pairing code (GET /api/session/create)
    // --------------------------------------------------------------------------
    if (url.pathname === '/api/session/create') {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Safe chars
      let code = '';
      const randomValues = new Uint8Array(5);
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < 5; i++) {
        code += chars[randomValues[i] % chars.length];
      }

      const sessionData = {
        code: code,
        status: 'waiting',
        createdAt: Date.now(),
        payload: null
      };

      await storage.set(code, JSON.stringify(sessionData), 600); // 10 minutes TTL

      const responseBody = {
        success: true,
        code: code,
        expiresIn: 600,
        qrUrl: `${url.origin}/import?code=${code}`
      };

      return new Response(JSON.stringify(responseBody), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --------------------------------------------------------------------------
    // 3. API: Phone uploads subscription to TV (POST /api/session/upload)
    // --------------------------------------------------------------------------
    if (url.pathname === '/api/session/upload' && request.method === 'POST') {
      try {
        const body = await request.json();
        const code = (body.code || '').toUpperCase().trim();
        const subscriptionUrl = (body.url || body.subscriptionUrl || '').trim();

        if (!code || code.length < 4) {
          return new Response(JSON.stringify({ error: 'Неверный код сопряжения. Введите 5 символов с экрана ТВ.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!subscriptionUrl) {
          return new Response(JSON.stringify({ error: 'Ссылка на подписку пуста.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const existing = await storage.get(code);
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Сессия с таким кодом не найдена или истекла. Пожалуйста, откройте QR-код на ТВ заново.' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const session = JSON.parse(existing);
        session.status = 'ready';
        session.payload = {
          url: subscriptionUrl,
          name: body.name || body.subTitle || 'Импортированная подписка',
          updatedAt: Date.now()
        };

        await storage.set(code, JSON.stringify(session), 300);

        return new Response(JSON.stringify({ success: true, message: 'Подписка успешно передана на ТВ!' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Ошибка обработки запроса: ' + e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // --------------------------------------------------------------------------
    // 4. API: TV polls for uploaded subscription (GET /api/session/poll?code=XXXXX)
    // --------------------------------------------------------------------------
    if (url.pathname === '/api/session/poll') {
      const code = (url.searchParams.get('code') || '').toUpperCase().trim();
      if (!code) {
        return new Response(JSON.stringify({ error: 'Параметр code обязателен' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existing = await storage.get(code);
      if (!existing) {
        return new Response(JSON.stringify({ status: 'expired', message: 'Сессия истекла' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const session = JSON.parse(existing);
      if (session.status === 'ready' && session.payload) {
        return new Response(JSON.stringify({ status: 'ready', data: session.payload }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ status: 'waiting' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('X-ray TV Cloud Relay API is running.', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};

/**
 * Mobile Web Page for Phone (Scanned via Camera QR or direct visit)
 */
function renderMobileHtml(code, origin) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>X-ray TV - Перенос подписки на ТВ</title>
  <style>
    :root {
      --bg: #090b10;
      --card-bg: #121620;
      --accent: #00f0ff;
      --accent-grad: linear-gradient(135deg, #00f0ff 0%, #6366f1 100%);
      --text: #f8fafc;
      --dim: #94a3b8;
      --border: #1e2638;
      --success: #10b981;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 440px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 54px;
      height: 54px;
      margin: 0 auto 12px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-icon svg { width: 30px; height: 30px; stroke: var(--accent); fill: none; stroke-width: 2; }
    h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
    p.subtitle { font-size: 13px; color: var(--dim); margin-top: 4px; }
    
    .code-box {
      background: rgba(0, 240, 255, 0.06);
      border: 1px dashed rgba(0, 240, 255, 0.4);
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      margin-bottom: 20px;
    }
    .code-label {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 8px;
    }
    .code-input-wrap {
      width: 100%;
    }
    .code-input {
      width: 100%;
      height: 52px;
      background: #0a0d15;
      border: 2px solid var(--accent);
      border-radius: 12px;
      font-size: 26px;
      font-family: monospace;
      font-weight: 800;
      letter-spacing: 5px;
      text-align: center;
      color: #ffffff;
      text-transform: uppercase;
      outline: none;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.15);
      transition: all 0.2s;
    }
    .code-input:focus {
      border-color: #ffffff;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.45);
    }

    .form-group { margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: var(--dim); margin-bottom: 8px; }
    .input-wrapper { position: relative; }
    textarea {
      width: 100%;
      height: 110px;
      background: #0a0d15;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px;
      color: #fff;
      font-size: 14px;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
    }
    textarea:focus { border-color: var(--accent); box-shadow: 0 0 15px rgba(0, 240, 255, 0.2); }

    .quick-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
    }
    .btn-paste {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
    }

    .btn-submit {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 16px;
      background: var(--accent-grad);
      color: #080a11;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 240, 255, 0.35);
      transition: transform 0.15s, opacity 0.15s;
    }
    .btn-submit:active { transform: scale(0.98); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .status-alert {
      display: none;
      margin-top: 18px;
      padding: 14px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      line-height: 1.4;
    }
    .status-alert.success { display: block; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); color: var(--success); }
    .status-alert.error { display: block; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--error); color: var(--error); }

    .success-screen {
      display: none;
      text-align: center;
      padding: 20px 0;
    }
    .check-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid var(--success);
      color: var(--success);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 32px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="form-container">
      <div class="header">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h1>Перенос подписки на ТВ</h1>
        <p class="subtitle">Отправьте подписку на ваш LG Smart TV в 1 клик</p>
      </div>

      <div class="code-box">
        <label for="code-input" class="code-label">Код сопряжения с экрана ТВ</label>
        <div class="code-input-wrap">
          <input type="text" id="code-input" class="code-input" maxlength="6" value="${code || ''}" placeholder="НАПРИМЕР: ABC12" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" />
        </div>
      </div>

      <div class="form-group">
        <label for="sub-input">Ссылка на подписку (VLESS / VMess / URL):</label>
        <div class="input-wrapper">
          <textarea id="sub-input" placeholder="Вставьте ссылку https://..."></textarea>
        </div>
        <div class="quick-actions">
          <button type="button" class="btn-paste" id="btn-paste">
            <span>Вставить из буфера</span>
          </button>
        </div>
      </div>

      <button type="button" class="btn-submit" id="btn-send">Отправить на телевизор</button>

      <div id="status-box" class="status-alert"></div>
    </div>

    <div id="success-screen" class="success-screen">
      <div class="check-icon">✓</div>
      <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">Подписка отправлена!</h2>
      <p style="font-size: 14px; color: var(--dim); line-height: 1.5;">Телевизор получил конфигурацию и автоматически обновляет список серверов. Приятного просмотра!</p>
    </div>
  </div>

  <script>
    // Robust element lookup supporting multiple IDs
    const codeInput = document.getElementById('code-input');
    const sendBtn = document.getElementById('btn-send') || document.getElementById('send-btn');
    const input = document.getElementById('sub-input') || document.getElementById('url-inp');
    const pasteBtn = document.getElementById('btn-paste') || document.getElementById('paste-btn');
    const statusBox = document.getElementById('status-box') || document.getElementById('status-alert');
    const formContainer = document.getElementById('form-container') || document.getElementById('form-wrap');
    const successScreen = document.getElementById('success-screen') || document.getElementById('success-wrap');

    // Auto-fill code from URL search param if input is empty
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code');
      if (urlCode && codeInput && !codeInput.value) {
        codeInput.value = urlCode.toUpperCase().trim();
      }
    } catch (e) {}

    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase();
      });
    }

    if (pasteBtn) {
      pasteBtn.addEventListener('click', async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text && input) {
              input.value = text.trim();
              showStatus('Ссылка успешно вставлена из буфера!', 'success');
              return;
            }
          }
        } catch (err) {}
        if (input) input.focus();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const activeCode = (codeInput ? codeInput.value : '').toUpperCase().trim();
        const url = (input ? input.value : '').trim();

        if (!activeCode || activeCode.length < 4) {
          showStatus('Пожалуйста, введите код с экрана телевизора (5 символов)', 'error');
          if (codeInput) codeInput.focus();
          return;
        }
        if (!url) {
          showStatus('Пожалуйста, вставьте ссылку на подписку', 'error');
          if (input) input.focus();
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Отправка...';
        if (statusBox) statusBox.style.display = 'none';

        try {
          const uploadEndpoint = window.location.origin + '/api/session/upload';
          const res = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ code: activeCode, url: url })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            if (formContainer) formContainer.style.display = 'none';
            if (successScreen) successScreen.style.display = 'block';
          } else {
            showStatus(data.error || 'Ошибка при передаче на ТВ. Проверьте код сопряжения.', 'error');
            sendBtn.disabled = false;
            sendBtn.textContent = 'Отправить на телевизор';
          }
        } catch (err) {
          showStatus('Ошибка подключения: ' + err.message, 'error');
          sendBtn.disabled = false;
          sendBtn.textContent = 'Отправить на телевизор';
        }
      });
    }

    function showStatus(msg, type) {
      if (!statusBox) {
        alert(msg);
        return;
      }
      statusBox.textContent = msg;
      statusBox.className = 'status-alert ' + type;
      statusBox.style.display = 'block';
      try {
        statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}
    }
  </script>
</body>
</html>`;
}