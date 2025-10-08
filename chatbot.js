window.addEventListener("DOMContentLoaded", () => {

  // --- DOM Elements ---
  const chatContainer = document.querySelector(".chat-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm ? promptForm.querySelector(".prompt-input") : null;
  const appHeader = document.getElementById("app-header");
  const promptMessage = document.getElementById("prompt-message");

  const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
  const fileInput = document.getElementById("file-input");
  const addFileButton = document.getElementById("add-file-button");
  const cancelFileButton = document.getElementById("cancel-file-button");
  const filePreview = fileUploadWrapper ? fileUploadWrapper.querySelector(".filepreview") : null;

  const deleteChatsButton = document.getElementById("delete-chats-button");
  const sendButton = document.getElementById("send-prompt-button");

  // --- Initial UI State ---
  if (chatContainer) chatContainer.style.display = "none";
  if (sendButton) sendButton.style.display = "none"; // hide send button initially
  let hasUserStartedChat = false;

  // --- User plan & file limits ---
  const isPremiumUser = window.isPremiumUser === true;
  let freeUserFileCount = 0;
  const FREE_USER_FILE_LIMIT = 2;

  // --- Chat history ---
  const chatHistory = [];

  // --- Gemini API config ---
  // NOTE: Do NOT hard-code API keys in client-side code in production.
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8"; // Replace with your key or better: call your server-side proxy
  const API_URL = API_KEY
    ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`
    : "/api/generate"; // prefer server proxy in production

  const systemPrompt = `
You are MyMcKenzie AI — an intelligent UK-based legal assistant.
You help litigants in person by offering plain-English legal process guidance.
Never refer to yourself as "Google Gemini." Always use "MyMcKenzie AI."
`;

  // --- Helper Functions ---
  const scrollToBottom = () => {
    if (!chatContainer) return;
    const threshold = 50; // pixels from bottom
    const distanceFromBottom = chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop;
    if (distanceFromBottom < threshold) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    }
  };

  // Escape HTML to avoid XSS
  const escapeHtml = (str = "") =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Shorter, deduping linkify: shows hostname as the link text and avoids repeated full URLs
  const linkify = (() => {
  const debugLinks = false; // set true to log hrefs created

  // Helper to get hostname fallback
  const hostnameFor = (url) => {
    try { return new URL(url).hostname; } catch (e) { return url; }
  };

  return (text) => {
    if (!text) return "";

    // 1) Handle Markdown-style links like [label](https://...).
    // Convert to a placeholder that contains only the URL so later logic treats it consistently.
    // We keep original label for fallback but prefer hostname as visible text later.
    const mdRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let preprocessed = text.replace(mdRe, (match, labelRaw, hrefRaw) => {
      // leave just the href text in place of the whole markdown link
      // so we don't accidentally capture the surrounding brackets in the URL match.
      return hrefRaw;
    });

    // 2) Escape to prevent XSS for non-url parts
    const escapeHtml = (str = "") =>
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#39;");

    const escaped = escapeHtml(preprocessed);

    // 3) Match http(s) URLs; exclude closing parentheses/brackets/angle brackets to avoid including them
    const urlPattern = /https?:\/\/[^\s<)>\]]+/g;
    const seen = new Set();

    const replaced = escaped.replace(urlPattern, (matchEscaped) => {
      // matchEscaped is escaped text; create href by reversing &amp; -> &
      let href = matchEscaped.replace(/&amp;/g, "&");

      // 4) Remove any trailing punctuation that might still have been included (.,:;!?)+ or ]
      href = href.replace(/[.,:;!?\)\]\}]+$/g, "");

      // 5) Build a short label (hostname) for display
      const label = hostnameFor(href) || href;

      const safeHref = escapeHtml(href);
      const safeLabel = escapeHtml(label);

      if (debugLinks) console.info("[linkify] =>", { href, label });

      // mark seen (keeps behavior consistent; you can hide duplicates here if you wish)
      seen.add(href);

      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="legal-link">${safeLabel}</a>`;
    });

    return replaced;
  };
})();

  // Typing effect: accumulate text and run linkify on the whole accumulated string
  const typingEffect = (text, targetElement) => {
    if (!targetElement) return;
    let index = 0;
    let accumulated = "";
    const typeChunk = () => {
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      accumulated += text.slice(index, index + chunkSize);
      index += chunkSize;
      targetElement.innerHTML = linkify(accumulated);
      scrollToBottom();
      if (index < text.length) {
        setTimeout(typeChunk, Math.floor(Math.random() * 40) + 20);
      }
    };
    typeChunk();
  };

  const createMsgElement = (html, ...classes) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add("message", ...classes);
    return div;
  };

  const appendBotMessage = (text, isThinking = false) => {
    if (!chatContainer) return null;
    const classes = ["bot-message"];
    if (isThinking) classes.push("thinking");
    const botDiv = createMsgElement(`<p class="message-text">${linkify(text)}</p>`, ...classes);
    chatContainer.appendChild(botDiv);
    scrollToBottom();
    return botDiv;
  };

  const appendUserMessage = (text) => {
    if (!chatContainer) return null;
    const userDiv = createMsgElement(`<p class="message-text">${linkify(text)}</p>`, "user-message");
    chatContainer.appendChild(userDiv);
    scrollToBottom();
    return userDiv;
  };

  const hidePromptMessage = () => {
    if (promptMessage) promptMessage.style.display = "none";
  };

  const activateChat = () => {
    if (!hasUserStartedChat) {
      if (chatContainer) chatContainer.style.display = "block";
      if (appHeader) appHeader.style.display = "none";
      hasUserStartedChat = true;
      hidePromptMessage();
    }
  };

  // --- Show send button only when typing ---
  if (promptInput) {
    promptInput.addEventListener("input", () => {
      if (sendButton) sendButton.style.display = promptInput.value.trim() ? "inline-block" : "none";
    });
    // Also hide header and banner on input focus
    promptInput.addEventListener("focus", activateChat);
  }

  // --- Generate response via Gemini (or your server proxy) ---
  const generateResponse = async (userMessage) => {
    const botDiv = appendBotMessage("💬 Thinking...", true);
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // If you use a server proxy, it should attach the system prompt as system role server-side
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...chatHistory
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Unknown error");

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received.";
      chatHistory.push({ role: "model", parts: [{ text: reply }] });

      // Use typingEffect which preserves URLs intact
      const target = botDiv ? botDiv.querySelector(".message-text") : null;
      typingEffect(reply, target);
    } catch (err) {
      if (botDiv && botDiv.querySelector(".message-text")) {
        botDiv.querySelector(".message-text").textContent = `⚠️ Error: ${err.message || err}`;
      }
      console.error("Gemini Error:", err);
      scrollToBottom();
    }
  };

  // --- Handle form submit ---
  if (promptForm) {
    promptForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const userText = promptInput ? promptInput.value.trim() : "";
      if (!userText && (!fileInput || !fileInput.files.length)) return;

      activateChat();
      appendUserMessage(userText || "[File attached]");
      if (promptInput) promptInput.value = "";
      if (sendButton) sendButton.style.display = "none";

      generateResponse(userText || "[File attached]");
    });
  }

  // --- Delete chats ---
  if (deleteChatsButton) {
    deleteChatsButton.addEventListener("click", () => {
      if (!chatContainer) return;
      chatContainer.innerHTML = "";
      chatContainer.style.display = "none";
      hasUserStartedChat = false;
      if (appHeader) appHeader.style.display = "block";
      if (promptMessage) promptMessage.style.display = "block";
      chatHistory.length = 0;
    });
  }

  // --- File attachments ---
  if (addFileButton && fileInput) addFileButton.addEventListener("click", () => fileInput.click());
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files[0] && filePreview) {
        filePreview.src = URL.createObjectURL(fileInput.files[0]);
        filePreview.style.display = 'inline-block';
        if (cancelFileButton) cancelFileButton.style.display = 'inline-block';
      }
    });
  }
  if (cancelFileButton) {
    cancelFileButton.addEventListener("click", () => {
      if (fileInput) fileInput.value = '';
      if (filePreview) filePreview.style.display = 'none';
      cancelFileButton.style.display = 'none';
    });
  }

});