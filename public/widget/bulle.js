(function () {
  "use strict";

  var script =
    document.currentScript ||
    document.querySelector('script[data-site-key][src*="bulle"]');
  if (!script) return;

  var siteKey = script.getAttribute("data-site-key");
  var apiBase =
    script.getAttribute("data-api") ||
    (script.src ? new URL(script.src).origin : window.location.origin);

  if (!siteKey) {
    console.error("[Bulle] data-site-key manquant sur le script.");
    return;
  }

  var config = {
    name: "Bulle",
    welcomeMessage: "Bonjour, je suis Bulle. Comment puis-je vous aider ?",
    primaryColor: "#2563eb",
    language: "fr",
  };

  var state = {
    open: false,
    loading: false,
    messages: [],
  };

  function extractPageContext() {
    var metaDesc = document.querySelector('meta[name="description"]');
    var headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map(function (el) {
        return el.textContent.trim();
      })
      .filter(Boolean);

    var main =
      document.querySelector("main") ||
      document.querySelector("article") ||
      document.querySelector('[role="main"]') ||
      document.body;

    var clone = main.cloneNode(true);
    clone
      .querySelectorAll(
        "script, style, nav, footer, header, noscript, iframe, .bulle-widget-root"
      )
      .forEach(function (el) {
        el.remove();
      });

    var content = (clone.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    return {
      url: window.location.href,
      title: document.title,
      description: metaDesc ? metaDesc.getAttribute("content") : undefined,
      headings: headings.slice(0, 15),
      content: content,
      language: document.documentElement.lang || undefined,
    };
  }

  function createStyles(color) {
    return (
      ":host { all: initial; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }" +
      ".bulle-root { position: fixed; bottom: 24px; right: 24px; z-index: 2147483646; }" +
      ".bulle-toggle { width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer; background: " +
      color +
      "; color: #fff; box-shadow: 0 8px 32px rgba(0,0,0,.18); display: flex; align-items: center; justify-content: center; transition: transform .2s, box-shadow .2s; }" +
      ".bulle-toggle:hover { transform: scale(1.05); box-shadow: 0 12px 40px rgba(0,0,0,.22); }" +
      ".bulle-toggle svg { width: 28px; height: 28px; }" +
      ".bulle-panel { position: absolute; bottom: 76px; right: 0; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,.16); display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(12px) scale(.96); pointer-events: none; transition: opacity .25s, transform .25s; }" +
      ".bulle-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }" +
      ".bulle-header { padding: 16px 20px; background: " +
      color +
      "; color: #fff; display: flex; align-items: center; gap: 12px; }" +
      ".bulle-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }" +
      ".bulle-header-text h3 { margin: 0; font-size: 15px; font-weight: 600; }" +
      ".bulle-header-text p { margin: 2px 0 0; font-size: 12px; opacity: .85; }" +
      ".bulle-close { margin-left: auto; background: none; border: none; color: #fff; cursor: pointer; opacity: .8; padding: 4px; }" +
      ".bulle-close:hover { opacity: 1; }" +
      ".bulle-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }" +
      ".bulle-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }" +
      ".bulle-msg.user { align-self: flex-end; background: " +
      color +
      "; color: #fff; border-bottom-right-radius: 4px; }" +
      ".bulle-msg.assistant { align-self: flex-start; background: #fff; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }" +
      ".bulle-msg.typing { color: #94a3b8; font-style: italic; }" +
      ".bulle-input-area { padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #fff; display: flex; gap: 8px; }" +
      ".bulle-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none; font-family: inherit; resize: none; max-height: 80px; }" +
      ".bulle-input:focus { border-color: " +
      color +
      "; box-shadow: 0 0 0 3px " +
      color +
      "22; }" +
      ".bulle-send { width: 40px; height: 40px; border-radius: 10px; border: none; background: " +
      color +
      "; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }" +
      ".bulle-send:disabled { opacity: .5; cursor: not-allowed; }" +
      ".bulle-powered { text-align: center; padding: 6px; font-size: 10px; color: #94a3b8; background: #fff; }" +
      "@media (max-width: 480px) { .bulle-panel { width: calc(100vw - 16px); right: -8px; height: calc(100vh - 100px); } .bulle-root { bottom: 16px; right: 16px; } }"
    );
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html) node.innerHTML = html;
    return node;
  }

  var host = el("div");
  host.className = "bulle-widget-root";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "open" });
  var styleEl = el("style");
  shadow.appendChild(styleEl);

  var root = el("div", "bulle-root");
  shadow.appendChild(root);

  var panel = el("div", "bulle-panel");
  var header = el("div", "bulle-header");
  header.innerHTML =
    '<div class="bulle-avatar">B</div>' +
    '<div class="bulle-header-text"><h3 class="bulle-name">Bulle</h3><p class="bulle-subtitle">Assistant du site</p></div>' +
    '<button class="bulle-close" aria-label="Fermer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';

  var messagesEl = el("div", "bulle-messages");
  var inputArea = el("div", "bulle-input-area");
  var textarea = el("textarea", "bulle-input");
  textarea.setAttribute("rows", "1");
  textarea.setAttribute("placeholder", "Posez votre question...");
  var sendBtn = el("button", "bulle-send");
  sendBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  inputArea.appendChild(textarea);
  inputArea.appendChild(sendBtn);

  var powered = el("div", "bulle-powered", "Propulsé par Bulle");

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputArea);
  panel.appendChild(powered);
  root.appendChild(panel);

  var toggle = el("button", "bulle-toggle");
  toggle.setAttribute("aria-label", "Ouvrir le chat Bulle");
  toggle.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
  root.appendChild(toggle);

  function renderMessages() {
    messagesEl.innerHTML = "";
    state.messages.forEach(function (msg) {
      messagesEl.appendChild(el("div", "bulle-msg " + msg.role, escapeHtml(msg.content)));
    });
    if (state.loading) {
      messagesEl.appendChild(el("div", "bulle-msg assistant typing", "Bulle réfléchit..."));
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(text) {
    var d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML.replace(/\n/g, "<br>");
  }

  function togglePanel() {
    state.open = !state.open;
    panel.classList.toggle("open", state.open);
    if (state.open && state.messages.length === 0) {
      state.messages.push({
        role: "assistant",
        content: config.welcomeMessage,
      });
      renderMessages();
    }
    if (state.open) textarea.focus();
  }

  toggle.addEventListener("click", togglePanel);
  header.querySelector(".bulle-close").addEventListener("click", togglePanel);

  function sendMessage() {
    var text = textarea.value.trim();
    if (!text || state.loading) return;

    textarea.value = "";
    state.messages.push({ role: "user", content: text });
    state.loading = true;
    renderMessages();

    var pageContext = extractPageContext();
    var chatMessages = state.messages
      .filter(function (m) {
        return m.role === "user" || m.role === "assistant";
      })
      .filter(function (m, i, arr) {
        if (i === 0 && m.role === "assistant" && arr.length > 1) return false;
        return true;
      });

    fetch(apiBase + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bulle-Site-Key": siteKey,
      },
      body: JSON.stringify({
        siteKey: siteKey,
        pageContext: pageContext,
        messages: chatMessages,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Erreur réseau");
        if (!res.body) throw new Error("Pas de flux");

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var assistantText = "";

        state.messages.push({ role: "assistant", content: "" });
        state.loading = false;
        var assistantIndex = state.messages.length - 1;

        function read() {
          return reader.read().then(function (result) {
            if (result.done) return;
            assistantText += decoder.decode(result.value, { stream: true });
            state.messages[assistantIndex].content = assistantText;
            renderMessages();
            return read();
          });
        }

        return read();
      })
      .catch(function () {
        state.loading = false;
        state.messages.push({
          role: "assistant",
          content:
            "Désolé, une erreur est survenue. Veuillez réessayer dans un instant.",
        });
        renderMessages();
      });
  }

  sendBtn.addEventListener("click", sendMessage);
  textarea.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function syncSiteIndex() {
    fetch(apiBase + "/api/index/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bulle-Site-Key": siteKey,
      },
      body: JSON.stringify({
        siteKey: siteKey,
        origin: window.location.origin,
      }),
    }).catch(function () {});
  }

  syncSiteIndex();

  fetch(apiBase + "/api/sites?siteKey=" + encodeURIComponent(siteKey))
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      if (!data) return;
      config.name = data.name || config.name;
      config.welcomeMessage = data.welcomeMessage || config.welcomeMessage;
      config.primaryColor = data.primaryColor || config.primaryColor;
      config.language = data.language || config.language;

      styleEl.textContent = createStyles(config.primaryColor);
      header.querySelector(".bulle-name").textContent = "Bulle";
      header.querySelector(".bulle-subtitle").textContent =
        "Assistant de " + config.name;
    })
    .catch(function () {
      styleEl.textContent = createStyles(config.primaryColor);
    });
})();
