import { uploadAttachment } from './chatbot-storage.js';

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
  const filePreview = document.querySelector(".filepreview");

  const deleteChatsButton = document.getElementById("delete-chats-button");
  const sendButton = document.getElementById("send-prompt-button");
  const stopButton = document.getElementById("stop-button"); // Stop button

  // --- Initial UI State ---
  if (chatContainer) chatContainer.style.display = "none";
  if (sendButton) sendButton.style.display = "none";
  let hasUserStartedChat = false;

  // --- User plan & file limits ---
  const isPremiumUser = window.isPremiumUser === true;
  let freeUserFileCount = 0;
  const FREE_USER_FILE_LIMIT = 0;

  // --- Chat history ---
  const chatHistory = [];

  // --- Gemini API config ---
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8";
  const API_URL = API_KEY
    ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`
    : "/api/generate";

  const systemPrompt = `
You are MyMcKenzie AI — an intelligent UK-based legal assistant.
You help litigants in person by offering plain-English legal process guidance.
Never refer to yourself as "Google Gemini." Always use "MyMcKenzie AI."
`;

  // --- Helper Functions ---
  const scrollToBottom = () => {
    if (!chatContainer) return;
    const threshold = 50;
    const distanceFromBottom = chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop;
    if (distanceFromBottom < threshold) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    }
  };

  const escapeHtml = (str = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const linkify = (() => {
    const hostnameFor = (url) => {
      try { return new URL(url).hostname; } catch { return url; }
    };
    return (text) => {
      if (!text) return "";
      const mdRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let preprocessed = text.replace(mdRe, (match, label, href) => href);
      const escaped = escapeHtml(preprocessed);
      const urlPattern = /https?:\/\/[^\s<)>\]]+/g;
      return escaped.replace(urlPattern, (matchEscaped) => {
        let href = matchEscaped.replace(/&amp;/g, "&").replace(/[.,:;!?\)\]\}]+$/g, "");
        const label = hostnameFor(href);
        const safeHref = escapeHtml(href);
        const safeLabel = escapeHtml(label);
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="legal-link">${safeLabel}</a>`;
      });
    };
  })();

  // --- Typing effect with stop support ---
  let stopTyping = false; // global flag

  const typingEffect = (text, targetElement) => {
    if (!targetElement) return;
    let index = 0;
    let accumulated = "";
    stopTyping = false;

    const typeChunk = () => {
      if (stopTyping) return;
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      accumulated += text.slice(index, index + chunkSize);
      index += chunkSize;
      targetElement.innerHTML = linkify(accumulated);
      scrollToBottom();
      if (index < text.length) {
        setTimeout(typeChunk, Math.floor(Math.random() * 40) + 20);
      } else {
        targetElement.classList.remove("thinking"); // done typing
      }
    };
    typeChunk();
  };

  // --- Stop button functionality ---
  if (stopButton) {
    stopButton.addEventListener("click", () => {
      stopTyping = true;
      const lastBotMessage = document.querySelector(".bot-message.thinking .message-text");
      if (lastBotMessage) lastBotMessage.classList.remove("thinking");
    });
  }

  const createMsgElement = (html, ...classes) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add("message", ...classes);
    return div;
  };

  const appendBotMessage = (text, isThinking = false, attachments = []) => {
    if (!chatContainer) return null;
    const classes = ["bot-message"];
    if (isThinking) classes.push("thinking");
    let html = `<p class="message-text">${linkify(text)}</p>`;
    if (attachments && attachments.length) {
      html += '<div class="message-attachments">';
      attachments.forEach(a => {
        if (a.type && a.type.startsWith('image/') && a.url) {
          html += `<img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name||'attachment')}" class="attachment-thumb"/>`;
        } else if (a.url) {
          html += `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name||a.url)}</a>`;
        }
      });
      html += '</div>';
    }
    const botDiv = createMsgElement(html, ...classes);
    chatContainer.appendChild(botDiv);
    scrollToBottom();
    return botDiv;
  };

  const appendUserMessage = (text, attachments = []) => {
    if (!chatContainer) return null;
    let html = `<p class="message-text">${linkify(text)}</p>`;
    if (attachments && attachments.length) {
      html += '<div class="message-attachments">';
      attachments.forEach(a => {
        if (a.type && a.type.startsWith('image/') && a.url) {
          html += `<img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name||'attachment')}" class="attachment-thumb"/>`;
        } else if (a.url) {
          html += `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.name||a.url)}</a>`;
        }
      });
      html += '</div>';
    }
    const userDiv = createMsgElement(html, "user-message");
    chatContainer.appendChild(userDiv);
    scrollToBottom();
    return userDiv;
  };

  const hidePromptMessage = () => { if (promptMessage) promptMessage.style.display = "none"; };
  const activateChat = () => {
    if (!hasUserStartedChat) {
      if (chatContainer) chatContainer.style.display = "block";
      if (appHeader) appHeader.style.display = "none";
      hasUserStartedChat = true;
      hidePromptMessage();
    }
  };

  if (promptInput) {
    promptInput.addEventListener("input", () => {
      if (sendButton) sendButton.style.display = promptInput.value.trim() ? "inline-block" : "none";
    });
    promptInput.addEventListener("focus", activateChat);
  }

  // --- Generate AI response ---
  const generateResponse = async (userMessage) => {
    const botDiv = appendBotMessage("💬 Thinking...", true);
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  // --- Form submit ---
  if (promptForm) {
    promptForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userText = promptInput ? promptInput.value.trim() : "";
      if (!userText && (!fileInput || !fileInput.files.length)) return;

  activateChat();
  const attachmentsArr = attachmentMeta ? [attachmentMeta] : [];
  appendUserMessage(userText || "[File attached]", attachmentsArr);
      if (promptInput) promptInput.value = "";
      if (sendButton) sendButton.style.display = "none";

  // If file attached, upload to storage (server-side flow) and include in message metadata
      let attachmentMeta = null;
      if (fileInput && fileInput.files && fileInput.files.length) {
        const file = fileInput.files[0];
        try {
          const res = await uploadAttachment(file);
          if (res.success) {
            attachmentMeta = { url: res.publicUrl, path: res.path, key: res.key, name: file.name, type: file.type, size: file.size };
          } else {
            console.warn('Attachment upload failed:', res.error);
            showToast('⚠️ Attachment upload failed. Sending without attachment.');
          }
        } catch (err) {
          console.error('Upload error', err);
          showToast('⚠️ Attachment upload error.');
        }
      }

      // send the message to the AI (or your message save flow) with attachment metadata appended
      generateResponse(userText || "[File attached]");

  // TODO: insert message via server API into `messages` table if desired.
  // Example: await fetch('/api/messages', { method: 'POST', body: JSON.stringify({ user_id, content: userText, attachments: [attachmentMeta] }) })

      // clear any attached file after sending
      try { clearAttachment(); } catch (e) {}
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

  // --- Toast Notification ---
  const showToast = (message) => {
    let toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("visible"), 100);
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // --- File attachments ---
  if (addFileButton && fileInput) {
    addFileButton.addEventListener("click", () => {
      if (!isPremiumUser && freeUserFileCount >= FREE_USER_FILE_LIMIT) {
        showToast(`⚠️ Free-Plan users can only upload ${FREE_USER_FILE_LIMIT} file. Upgrade for unlimited uploads.`);
        return;
      }
      // reset previous selection then open picker
      try { fileInput.value = null; } catch (e) {}
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!isPremiumUser && freeUserFileCount >= FREE_USER_FILE_LIMIT) {
        showToast(`⚠️ You've reached your free upload limit.`);
        fileInput.value = "";
        return;
      }

      // show preview: image thumbnail or filename
      if (filePreview) {
        if (file.type && file.type.startsWith('image/')) {
          filePreview.innerHTML = '';
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          img.style.maxWidth = '60px'; img.style.maxHeight = '40px'; img.style.verticalAlign = 'middle';
          filePreview.appendChild(img);
        } else {
          filePreview.textContent = file.name;
        }
        filePreview.style.display = 'inline-block';
      }
      if (cancelFileButton) cancelFileButton.style.display = 'inline-block';
      if (!isPremiumUser) freeUserFileCount++;
    });
  }

  if (cancelFileButton) {
    cancelFileButton.addEventListener("click", () => {
      if (fileInput) fileInput.value = "";
      if (filePreview) { filePreview.style.display = "none"; filePreview.innerHTML = ''; }
      cancelFileButton.style.display = "none";
      if (!isPremiumUser && freeUserFileCount > 0) freeUserFileCount--;
    });
  }

  // clear attachments helper
  const clearAttachment = () => {
    if (fileInput) fileInput.value = "";
    if (filePreview) { filePreview.style.display = 'none'; filePreview.innerHTML = ''; }
    if (cancelFileButton) cancelFileButton.style.display = 'none';
  };

});

