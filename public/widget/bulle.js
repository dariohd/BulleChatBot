(function () {
  "use strict";

  var script =
    document.currentScript ||
    document.querySelector('script[data-site-key][src*="bulle"]');
  if (!script) return;

  var siteKey = script.getAttribute("data-site-key");
  var apiRoot = (function resolveApiRoot() {
    var proxy = script.getAttribute("data-proxy");
    var host = window.location.hostname;
    var isLocal = host === "localhost" || host === "127.0.0.1";

    if (proxy === "same-origin" && !isLocal) {
      return window.location.origin.replace(/\/$/, "") + "/api/bulle";
    }

    var explicit = script.getAttribute("data-api");
    if (explicit) {
      var base = explicit.replace(/\/$/, "");
      if (base.endsWith("/api/bulle") || base.endsWith("/api")) return base;
      return base + "/api";
    }

    try {
      return new URL(script.src).origin + "/api";
    } catch (e) {
      return window.location.origin.replace(/\/$/, "") + "/api";
    }
  })();

  function apiUrl(subpath) {
    return apiRoot + "/" + String(subpath).replace(/^\//, "");
  }

  var chatEndpoints = ["assist", "q", "chat"];

  if (!siteKey) {
    console.error("[Bulle] data-site-key manquant sur le script.");
    return;
  }

  function getSessionId() {
    var key = "bulle-session-" + siteKey;
    try {
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var id =
        "sess_" +
        Math.random().toString(36).slice(2) +
        Date.now().toString(36);
      localStorage.setItem(key, id);
      return id;
    } catch (e) {
      return "sess_" + Date.now();
    }
  }

  var sessionId = getSessionId();
  var messagesStorageKey = "bulle-messages-" + siteKey;

  var config = {
    name: "Bulle",
    welcomeMessage: "Bonjour ! Je suis Bulle. Posez-moi une question sur ce site.",
    suggestions: [],
    primaryColor: "#2563eb",
    language: "fr",
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    panelBg: "#ffffff",
    messagesBg: "#f8fafc",
  };

  function cssColorToHex(color) {
    if (!color) return null;
    var value = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    var rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return null;
    return (
      "#" +
      [rgb[1], rgb[2], rgb[3]]
        .map(function (n) {
          var hex = parseInt(n, 10).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  function isColorDark(hex) {
    if (!hex || hex.length < 7) return false;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 140;
  }

  function readHostCssVar(name) {
    try {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    } catch (e) {
      return "";
    }
  }

  function readHostFont() {
    try {
      var family = getComputedStyle(document.body).fontFamily;
      if (!family) return null;
      return family;
    } catch (e) {
      return null;
    }
  }

  function resolveTheme(apiData) {
    var color =
      (apiData && apiData.primaryColor) ||
      script.getAttribute("data-primary-color") ||
      cssColorToHex(readHostCssVar("--accent")) ||
      cssColorToHex(readHostCssVar("--primary-color")) ||
      config.primaryColor;
    var fontFamily =
      script.getAttribute("data-font-family") ||
      readHostFont() ||
      config.fontFamily;
    var panelBg =
      script.getAttribute("data-panel-bg") ||
      cssColorToHex(readHostCssVar("--bg-elevated")) ||
      cssColorToHex(readHostCssVar("--surface")) ||
      config.panelBg;
    var messagesBg =
      script.getAttribute("data-messages-bg") ||
      cssColorToHex(readHostCssVar("--bg")) ||
      config.messagesBg;
    return {
      primaryColor: color,
      fontFamily: fontFamily,
      panelBg: panelBg,
      messagesBg: messagesBg,
    };
  }

  function applyTheme(theme) {
    config.primaryColor = theme.primaryColor;
    config.fontFamily = theme.fontFamily;
    config.panelBg = theme.panelBg;
    config.messagesBg = theme.messagesBg;
    styleEl.textContent = createStyles(theme);
  }

  var state = {
    open: false,
    loading: false,
    messages: [],
  };

  try {
    var savedMessages = sessionStorage.getItem(messagesStorageKey);
    if (savedMessages) {
      state.messages = JSON.parse(savedMessages);
    }
  } catch (e) {
    // ignore
  }

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
      url: window.location.href.slice(0, 2048),
      title: document.title.slice(0, 500),
      description: metaDesc
        ? (metaDesc.getAttribute("content") || "").slice(0, 1000)
        : undefined,
      headings: headings.slice(0, 15).map(function (h) {
        return h.slice(0, 300);
      }),
      content: content,
      language: document.documentElement.lang || undefined,
    };
  }

  function mascotAssetUrl(file) {
    try {
      var base = new URL(script.src);
      base.pathname = base.pathname.replace(/\/[^/]+$/, "/" + file);
      return base.href;
    } catch (e) {
      return "https://bulle-chatbot.vercel.app/widget/" + file;
    }
  }

  function mascotMark(size, extraClass) {
    return (
      '<img class="bulle-mascot' +
      (extraClass ? " " + extraClass : "") +
      '" src="' +
      mascotAssetUrl("bulle-mascot.svg") +
      '" width="' +
      size +
      '" height="' +
      size +
      '" alt="" decoding="async" draggable="false" />'
    );
  }

  function createStyles(theme) {
    var color = theme.primaryColor || theme;
    var font = theme.fontFamily || config.fontFamily;
    var panelBg = theme.panelBg || config.panelBg;
    var messagesBg = theme.messagesBg || config.messagesBg;
    var themeMode = script.getAttribute("data-theme");
    var hostDark = isColorDark(panelBg) || isColorDark(messagesBg);
    var useDark =
      themeMode === "dark" ||
      (themeMode !== "light" && hostDark);

    var css =
      ":host { all: initial; font-family: " +
      font +
      "; --bulle-accent: " +
      color +
      "; --bulle-panel: " +
      (panelBg || "#ffffff") +
      "; --bulle-messages: color-mix(in srgb, " +
      color +
      " 8%, " +
      (messagesBg || panelBg || "#f8fafc") +
      "); --bulle-text: #1e293b; --bulle-muted: #94a3b8; --bulle-border: color-mix(in srgb, " +
      color +
      " 18%, #e2e8f0); --bulle-bubble-ring: color-mix(in srgb, " +
      color +
      " 35%, transparent); }";

    if (useDark) {
      css +=
        ":host { --bulle-panel: #1e293b; --bulle-messages: color-mix(in srgb, " +
        color +
        " 12%, #0f172a); --bulle-text: #e2e8f0; --bulle-border: #334155; --bulle-muted: #64748b; }";
    }

    css +=
      ":host { display: block; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }" +
      ".bulle-root { pointer-events: none; }" +
      ".bulle-toggle { pointer-events: auto; position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; padding: 0; border: none; background: transparent; cursor: pointer; transition: transform .2s ease; }" +
      ".bulle-toggle:hover { transform: translateY(-3px); }" +
      ".bulle-toggle:focus-visible { outline: 2px solid var(--bulle-accent); outline-offset: 4px; border-radius: 22px; }" +
      ".bulle-toggle-bubble { position: relative; display: flex; align-items: center; justify-content: center; width: 76px; height: 68px; background: var(--bulle-panel); border: 2px solid var(--bulle-bubble-ring); border-radius: 22px 22px 22px 8px; box-shadow: 0 12px 32px rgba(15,23,42,.18); }" +
      ".bulle-toggle-bubble::after { content: \"\"; position: absolute; bottom: -8px; right: 14px; width: 14px; height: 14px; background: var(--bulle-panel); border-right: 2px solid var(--bulle-bubble-ring); border-bottom: 2px solid var(--bulle-bubble-ring); transform: rotate(45deg); pointer-events: none; }" +
      ".bulle-toggle .bulle-mascot { display: block; width: 46px; height: 46px; object-fit: contain; pointer-events: none; }" +
      ".bulle-root.bulle-open .bulle-toggle { display: none; }" +
      ".bulle-panel-shell { pointer-events: none; position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; width: 380px; max-width: calc(100vw - 32px); visibility: hidden; max-height: 0; overflow: hidden; opacity: 0; transform: translateY(10px); transition: opacity .22s ease, transform .22s ease, max-height .22s ease, visibility .22s ease; }" +
      ".bulle-root.bulle-open .bulle-panel-shell { pointer-events: auto; visibility: visible; max-height: min(560px, calc(100vh - 100px)); opacity: 1; transform: translateY(0); overflow: visible; }" +
      ".bulle-panel { pointer-events: auto; position: relative; z-index: 1; background: var(--bulle-panel); border-radius: 24px; border: 2px solid var(--bulle-bubble-ring); display: flex; flex-direction: column; overflow: hidden; max-height: min(520px, calc(100vh - 120px)); box-shadow: 0 20px 50px rgba(0,0,0,.16); cursor: default; }" +
      ".bulle-panel::after { content: \"\"; position: absolute; bottom: -9px; right: 30px; width: 18px; height: 18px; background: var(--bulle-panel); border-right: 2px solid var(--bulle-bubble-ring); border-bottom: 2px solid var(--bulle-bubble-ring); transform: rotate(45deg); pointer-events: none; }" +
      ".bulle-header { padding: 12px 14px 10px; background: var(--bulle-panel); border-bottom: 1px solid var(--bulle-border); display: flex; align-items: center; gap: 10px; pointer-events: auto; }" +
      ".bulle-avatar { width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }" +
      ".bulle-avatar .bulle-mascot { width: 44px; height: 44px; object-fit: contain; }" +
      ".bulle-close { margin-left: auto; background: var(--bulle-messages); border: 1px solid var(--bulle-border); color: var(--bulle-muted); cursor: pointer; padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center; pointer-events: auto; }" +
      ".bulle-close:hover { color: var(--bulle-text); border-color: var(--bulle-accent); }" +
      ".bulle-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: var(--bulle-messages); min-height: 180px; pointer-events: auto; }" +
      ".bulle-msg { max-width: 88%; padding: 10px 14px; font-size: 14px; line-height: 1.5; word-wrap: break-word; animation: bulle-msg-in .25s ease; }" +
      "@keyframes bulle-msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }" +
      ".bulle-msg.user { align-self: flex-end; background: var(--bulle-accent); color: #fff; border-radius: 18px 18px 6px 18px; }" +
      ".bulle-msg.assistant { align-self: flex-start; background: var(--bulle-panel); color: var(--bulle-text); border: 1px solid var(--bulle-border); border-radius: 18px 18px 18px 6px; }" +
      ".bulle-msg.assistant a { color: var(--bulle-accent); text-decoration: underline; word-break: break-all; }" +
      ".bulle-msg.assistant p { margin: 0 0 8px; }" +
      ".bulle-msg.assistant p:last-child { margin-bottom: 0; }" +
      ".bulle-msg.assistant .bulle-list { margin: 4px 0 8px; padding-left: 18px; }" +
      ".bulle-msg.assistant .bulle-list li { margin: 4px 0; }" +
      ".bulle-msg.assistant strong { font-weight: 600; }" +
      ".bulle-msg.typing { color: var(--bulle-muted); display: flex; align-items: center; gap: 6px; background: transparent; border: none; }" +
      ".bulle-typing-dots { display: inline-flex; gap: 4px; }" +
      ".bulle-typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--bulle-muted); animation: bulle-dot 1.2s infinite ease-in-out; }" +
      ".bulle-typing-dots span:nth-child(2) { animation-delay: .15s; }" +
      ".bulle-typing-dots span:nth-child(3) { animation-delay: .3s; }" +
      "@keyframes bulle-dot { 0%, 80%, 100% { opacity: .35; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }" +
      ".bulle-suggestions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; background: var(--bulle-messages); pointer-events: auto; }" +
      ".bulle-suggestions[hidden] { display: none; }" +
      ".bulle-suggestion { border: 1px solid var(--bulle-border); background: var(--bulle-panel); color: var(--bulle-text); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: inherit; pointer-events: auto; }" +
      ".bulle-suggestion:hover { border-color: var(--bulle-accent); color: var(--bulle-accent); }" +
      ".bulle-input-area { padding: 12px 16px 14px; border-top: 1px solid var(--bulle-border); background: var(--bulle-panel); display: flex; gap: 8px; pointer-events: auto; }" +
      ".bulle-input { flex: 1; border: 1px solid var(--bulle-border); border-radius: 999px; padding: 10px 16px; font-size: 14px; outline: none; font-family: inherit; resize: none; max-height: 80px; background: var(--bulle-messages); color: var(--bulle-text); pointer-events: auto; }" +
      ".bulle-input::placeholder { color: var(--bulle-muted); }" +
      ".bulle-input:focus { border-color: var(--bulle-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--bulle-accent) 15%, transparent); }" +
      ".bulle-send { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--bulle-accent); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: auto; }" +
      ".bulle-send:disabled { opacity: .5; cursor: not-allowed; }" +
      ".bulle-powered { padding: 6px; font-size: 10px; color: var(--bulle-muted); background: var(--bulle-panel); display: flex; align-items: center; justify-content: center; gap: 6px; pointer-events: none; }" +
      ".bulle-powered .bulle-mascot { width: 18px; height: 18px; object-fit: contain; }" +
      ".bulle-powered strong { color: var(--bulle-accent); font-weight: 600; }" +
      ".bulle-toggle:focus-visible, .bulle-send:focus-visible, .bulle-close:focus-visible, .bulle-suggestion:focus-visible { outline: 2px solid var(--bulle-accent); outline-offset: 2px; }" +
      "@media (prefers-reduced-motion: reduce) { .bulle-msg, .bulle-panel-shell, .bulle-toggle { animation: none !important; transition: none !important; } .bulle-typing-dots span { animation: none !important; opacity: .6; } }" +
      "@media (max-width: 480px) { .bulle-panel-shell, .bulle-toggle { right: 16px; bottom: 16px; width: calc(100vw - 32px); } }";

    return css;
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html) node.innerHTML = html;
    return node;
  }

  var host = el("div");
  host.className = "bulle-widget-root";
  host.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "open" });
  var styleEl = el("style");
  shadow.appendChild(styleEl);

  var root = el("div", "bulle-root");
  shadow.appendChild(root);

  var panelShell = el("div", "bulle-panel-shell");
  var panel = el("div", "bulle-panel");
  var header = el("div", "bulle-header");
  header.innerHTML =
    '<div class="bulle-avatar">' +
    mascotMark(44) +
    '</div>' +
    '<button type="button" class="bulle-close" aria-label="Fermer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';

  var messagesEl = el("div", "bulle-messages");
  messagesEl.setAttribute("aria-live", "polite");
  messagesEl.setAttribute("aria-relevant", "additions");
  var suggestionsEl = el("div", "bulle-suggestions");
  suggestionsEl.hidden = true;
  var inputArea = el("div", "bulle-input-area");
  var textarea = el("textarea", "bulle-input");
  textarea.setAttribute("rows", "1");
  textarea.setAttribute("placeholder", "Votre question…");
  textarea.setAttribute("aria-label", "Votre message");
  var sendBtn = el("button", "bulle-send");
  sendBtn.setAttribute("type", "button");
  sendBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  inputArea.appendChild(textarea);
  inputArea.appendChild(sendBtn);

  var powered = el("div", "bulle-powered");
  powered.innerHTML =
    mascotMark(18) + "<span>Réponses IA · <strong>Bulle</strong></span>";

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(suggestionsEl);
  panel.appendChild(inputArea);
  panel.appendChild(powered);
  panelShell.appendChild(panel);
  root.appendChild(panelShell);

  var toggle = el("button", "bulle-toggle");
  toggle.setAttribute("type", "button");
  toggle.setAttribute("aria-label", "Ouvrir le chat Bulle");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML =
    '<span class="bulle-toggle-bubble">' + mascotMark(46) + "</span>";
  root.appendChild(toggle);

  function persistMessages() {
    try {
      sessionStorage.setItem(messagesStorageKey, JSON.stringify(state.messages));
    } catch (e) {
      // ignore
    }
  }

  function collectPageHeadings() {
    return Array.from(document.querySelectorAll("h1, h2, h3"))
      .filter(function (el) {
        return !el.closest(".bulle-widget-root");
      })
      .map(function (el) {
        return (el.textContent || "").replace(/\s+/g, " ").trim();
      })
      .filter(function (text) {
        return text.length > 0;
      });
  }

  function headingToQuestion(heading) {
    var topic = heading.replace(/\s+/g, " ").trim();
    if (topic.length < 2 || topic.length > 80) return null;

    var lower = topic.toLowerCase();
    if (/contact|nous écrire|écrivez|joindre|prendre rendez-vous/i.test(lower)) {
      return "Comment vous contacter ?";
    }
    if (/à propos|a propos|about|qui suis|présentation|presentation|parcours/i.test(lower)) {
      return "Parlez-moi de ce site en bref.";
    }
    if (/projets?|portfolio|réalisations|realisations|works|galerie/i.test(lower)) {
      return "Quels projets sont présentés ici ?";
    }
    if (/services?|prestations|offres|tarifs|solutions/i.test(lower)) {
      return "Quels services sont proposés ?";
    }
    if (/stack|techno|compétences|competences|skills/i.test(lower)) {
      return "Quelles technologies sont utilisées ?";
    }

    var clean = topic.replace(/[?:!.…]+$/g, "").trim();
    if (clean.length < 4) return null;
    return "En savoir plus sur « " + clean + " » ?";
  }

  function derivePageSuggestions() {
    var seen = {};
    var result = [];

    function push(question) {
      if (!question) return;
      var key = question.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      result.push(question);
    }

    collectPageHeadings().forEach(function (heading) {
      if (result.length >= 3) return;
      push(headingToQuestion(heading));
    });

    if (result.length < 3 && config.name) {
      push("Que propose " + config.name + " ?");
    }
    if (result.length < 3) {
      push("Résumez ce site en quelques mots.");
    }
    if (result.length < 3) {
      push("Comment vous contacter ?");
    }

    return result.slice(0, 3);
  }

  function activeSuggestions() {
    if (config.suggestions && config.suggestions.length) {
      return config.suggestions.slice(0, 3);
    }
    return derivePageSuggestions();
  }

  function hasUserMessage() {
    return state.messages.some(function (m) {
      return m.role === "user";
    });
  }

  function shouldShowSuggestions() {
    return state.open && !state.loading && !hasUserMessage();
  }

  function renderSuggestions() {
    suggestionsEl.innerHTML = "";
    if (!shouldShowSuggestions()) {
      suggestionsEl.hidden = true;
      return;
    }
    suggestionsEl.hidden = false;
    activeSuggestions().forEach(function (text) {
      var btn = el("button", "bulle-suggestion");
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", function () {
        textarea.value = text;
        sendMessage();
      });
      suggestionsEl.appendChild(btn);
    });
  }

  function createTypingNode() {
    var node = el("div", "bulle-msg assistant typing");
    node.innerHTML =
      '<span>Un instant</span><span class="bulle-typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
    return node;
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    state.messages.forEach(function (msg) {
      messagesEl.appendChild(el("div", "bulle-msg " + msg.role, formatMessage(msg.content)));
    });
    if (state.loading) {
      messagesEl.appendChild(createTypingNode());
    }
    sendBtn.disabled = state.loading;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    renderSuggestions();
    persistMessages();
  }

  function escapeHtml(text) {
    var d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function inlineFormat(text) {
    var s = escapeHtml(text);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    s = s.replace(
      /(^|[\s(])((https?:\/\/)[^\s<)]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
    );
    return s;
  }

  function formatMessage(text) {
    var lines = String(text).split("\n");
    var parts = [];
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var bullet = line.match(/^\s*[-*]\s+(.+)$/);

      if (bullet) {
        if (!inList) {
          parts.push('<ul class="bulle-list">');
          inList = true;
        }
        parts.push("<li>" + inlineFormat(bullet[1]) + "</li>");
        continue;
      }

      if (inList) {
        parts.push("</ul>");
        inList = false;
      }

      if (line.trim()) {
        parts.push("<p>" + inlineFormat(line) + "</p>");
      }
    }

    if (inList) {
      parts.push("</ul>");
    }

    return parts.join("");
  }

  function togglePanel() {
    state.open = !state.open;
    root.classList.toggle("bulle-open", state.open);
    toggle.setAttribute("aria-expanded", state.open ? "true" : "false");
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
      })
      .filter(function (m) {
        return !(
          m.role === "assistant" &&
          (m.content.indexOf("Je n'ai pas pu répondre") === 0 ||
            m.content.indexOf("La limite du jour") === 0 ||
            m.content.indexOf("Trop de messages") === 0)
        );
      })
      .slice(-12);

    function postChat(endpointIndex) {
      if (endpointIndex >= chatEndpoints.length) {
        return Promise.reject(new Error("Aucun endpoint disponible"));
      }
      return fetch(apiUrl(chatEndpoints[endpointIndex]), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bulle-Site-Key": siteKey,
        },
        body: JSON.stringify({
          siteKey: siteKey,
          sessionId: sessionId,
          pageContext: pageContext,
          messages: chatMessages,
        }),
      }).then(function (res) {
        if (res.status === 404 && endpointIndex < chatEndpoints.length - 1) {
          return postChat(endpointIndex + 1);
        }
        return res;
      });
    }

    function friendlyError(err, status) {
      var message = err && err.message ? String(err.message) : "";
      if (
        status === 429 &&
        (message.indexOf("Quota") !== -1 || message.indexOf("quota") !== -1)
      ) {
        return "La limite du jour est atteinte. Revenez demain, ou contactez le propriétaire du site.";
      }
      if (status === 429) {
        return "Trop de messages d'un coup. Attendez une minute et réessayez.";
      }
      return "Je n'ai pas pu répondre pour l'instant. Réessayez dans quelques instants.";
    }

    postChat(0)
      .then(function (res) {
        if (!res.ok) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (body) {
              var err = new Error(body.error || "HTTP " + res.status);
              err.status = res.status;
              throw err;
            });
        }
        if (!res.body) throw new Error("Pas de flux");

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var assistantText = "";

        state.messages.push({ role: "assistant", content: "" });
        state.loading = false;
        var assistantIndex = state.messages.length - 1;

        function read() {
          return reader.read().then(function (result) {
            if (result.value) {
              assistantText += decoder.decode(result.value, {
                stream: !result.done,
              });
            }
            if (result.done) {
              assistantText += decoder.decode();
              state.messages[assistantIndex].content = assistantText;
              renderMessages();
              return;
            }
            state.messages[assistantIndex].content = assistantText;
            renderMessages();
            return read();
          });
        }

        return read().catch(function (streamErr) {
          console.error("[Bulle] stream:", streamErr);
          throw streamErr;
        });
      })
      .catch(function (err) {
        console.error("[Bulle] chat:", err);
        state.loading = false;
        if (
          state.messages.length > 0 &&
          state.messages[state.messages.length - 1].role === "assistant" &&
          !state.messages[state.messages.length - 1].content
        ) {
          state.messages.pop();
        }
        state.messages.push({
          role: "assistant",
          content: friendlyError(err, err.status),
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
    var syncKey = "bulle-sync-" + siteKey;
    try {
      if (sessionStorage.getItem(syncKey)) return;
      sessionStorage.setItem(syncKey, "1");
    } catch (e) {
      // sessionStorage indisponible
    }

    fetch(apiUrl("index/sync"), {
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

  applyTheme(resolveTheme());

  fetch(apiUrl("sites?siteKey=" + encodeURIComponent(siteKey)))
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      if (!data) return;
      config.name = data.name || config.name;
      config.welcomeMessage = data.welcomeMessage || config.welcomeMessage;
      config.suggestions = Array.isArray(data.suggestions)
        ? data.suggestions.slice(0, 3)
        : [];
      config.language = data.language || config.language;

      applyTheme(resolveTheme(data));
      renderSuggestions();
    })
    .catch(function () {
      applyTheme(resolveTheme());
    });
})();
