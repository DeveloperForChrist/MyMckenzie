const uploadAttachment = async (file) => {
  try {
    const publicUrl = URL.createObjectURL(file);
    return { success: true, publicUrl, path: publicUrl, key: null };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
};

window.addEventListener("DOMContentLoaded", () => {

  // --- DOM Elements ---
  const chatContainer = document.querySelector(".chat-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm ? promptForm.querySelector(".prompt-input") : null; // textarea
  const promptContainerEl = document.querySelector('.prompt-container');
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
  // Allow submission with only attachment by removing HTML5 required attribute if present
  if (promptInput) { try { promptInput.removeAttribute('required'); } catch (e) {} }
  // Disable native HTML5 validation that can block submit on empty text input
  if (promptForm) { try { promptForm.setAttribute('novalidate', ''); } catch (e) {} }

  // --- Initial UI State ---
  if (chatContainer) chatContainer.style.display = "none";
  if (sendButton) sendButton.style.display = "none";
  let hasUserStartedChat = false;
  let isSubmitting = false;
  let isTypingActive = false;

  // Inject minimal CSS for formatted headings in bot messages
  try {
    const headingCss = `
.message-text .msg-heading{display:block;margin:10px 0 6px;font-weight:700;color:var(--white-color);} 
.message-text .msg-heading.level-1{font-size:1.1rem;border-bottom:1px solid var(--border-color);padding-bottom:4px;margin-top:12px;} 
.message-text .msg-heading.level-2{font-size:1.05rem;margin-top:10px;} 
.message-text .msg-heading.level-3{font-size:1rem;margin-top:8px;opacity:0.95;}`;
    const styleEl = document.createElement('style');
    styleEl.textContent = headingCss;
    document.head.appendChild(styleEl);
  } catch(_) {}

  // Floating 'scroll to bottom' button
  const scrollToBottomBtn = document.createElement('button');
  scrollToBottomBtn.id = 'scroll-to-bottom';
  scrollToBottomBtn.title = 'Jump to latest';
  scrollToBottomBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
  Object.assign(scrollToBottomBtn.style, {
    position: 'fixed',
    right: '24px',
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    border: 'none',
    background: '#000',
    color: '#fff',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1001',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    cursor: 'pointer',
  });
  document.body.appendChild(scrollToBottomBtn);

  const updateScrollButtonPosition = () => {
    try {
      const barH = promptContainerEl ? Math.ceil(promptContainerEl.getBoundingClientRect().height) : (promptForm ? Math.ceil(promptForm.getBoundingClientRect().height) : 56);
      const offset = Math.max(80, barH + 24); // keep above chatbar
      scrollToBottomBtn.style.bottom = offset + 'px';
    } catch (_) {}
  };

  const showScrollToBottom = () => {
    updateScrollButtonPosition();
    scrollToBottomBtn.style.display = 'inline-flex';
  };

  const hideScrollToBottom = () => {
    scrollToBottomBtn.style.display = 'none';
  };

  scrollToBottomBtn.addEventListener('click', () => {
    hideScrollToBottom();
    scrollToBottom(true);
  });

  // --- User plan & file limits ---
  const isPremiumUser = window.isPremiumUser === true;
  let freeUserFileCount = 0;
  const FREE_USER_FILE_LIMIT = 3;

  // --- Chat history ---
  const chatHistory = [];

  // --- Gemini API config ---
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8";
  const GEM_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];
  const makeApiUrl = (model) =>
    API_KEY
      ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`
      : `/api/generate?model=${encodeURIComponent(model)}`;

  const systemPrompt = `
You are MyMcKenzie AI — an intelligent UK-based legal assistant.
You help litigants in person by offering plain-English legal process guidance.
Never refer to yourself as "Google Gemini." Always use "MyMcKenzie AI."
`;

  // --- Helper Functions ---
  const scrollToBottom = (force = false) => {
    if (!chatContainer) return;
    if (force) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
      return;
    }
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

  // Convert simple markdown-like headings/bold to clean HTML
  const styleBotHtml = (html) => {
    if (!html) return "";
    let out = html;
    // Headings: lines starting with #, ##, ### -> styled blocks
    out = out.replace(/^\s*###\s+(.+)$/gm, '<div class="msg-heading level-3">$1<\/div>');
    out = out.replace(/^\s*##\s+(.+)$/gm, '<div class="msg-heading level-2">$1<\/div>');
    out = out.replace(/^\s*#\s+(.+)$/gm, '<div class="msg-heading level-1">$1<\/div>');
    // Single-line strong-only headings: **Heading** on its own line -> heading block
    out = out.replace(/^\s*\*\*(.+?)\*\*\s*$/gm, '<div class="msg-heading">$1<\/div>');
    // Inline bold: **text** -> <strong>
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>');
    return out;
  };

  // --- Attachment text extraction helpers ---
  const readTextFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });

  // Read any file as base64 (without data: prefix)
  const readFileAsBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = reader.result || '';
        const base64 = String(res).split(',')[1] || '';
        resolve(base64);
      } catch (_) {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    const loaded = new Promise((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = reject;
    });
    document.head.appendChild(script);
    await loaded;
    if (window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      } catch (_) {}
    }
    return window.pdfjsLib;
  };

  const extractPdfText = async (file) => {
    try {
      const pdfjsLib = await loadPdfJs();
      if (!pdfjsLib) throw new Error('PDF.js failed to load');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 30); // safety cap
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items.map(i => (i.str || '').trim());
        fullText += strings.join(' ') + '\n\n';
      }
      return fullText.trim();
    } catch (err) {
      console.error('PDF extract error:', err);
      return '';
    }
  };

  const extractAttachmentText = async (file) => {
    if (!file) return '';
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    // 1) Plain text
    if (type.startsWith('text/')) {
      return await readTextFile(file);
    }

    // 2) PDF
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return await extractPdfText(file);
    }

    // 3) DOCX
    const isDocx = type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
    if (isDocx) {
      try {
        const loadMammoth = async () => {
          if (window.mammoth) return window.mammoth;
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.21/mammoth.browser.min.js';
          script.async = true;
          const loaded = new Promise((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = reject;
          });
          document.head.appendChild(script);
          await loaded;
          return window.mammoth;
        };
        const mammoth = await loadMammoth();
        if (!mammoth) throw new Error('Mammoth failed to load');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = (result && result.value) ? String(result.value).trim() : '';
        return text;
      } catch (err) {
        console.error('DOCX extract error:', err);
        return '';
      }
    }

    // 4) Fallback: unsupported types (images, etc.)
    return '';
  };

  // --- Typing effect with stop support ---
  let stopTyping = false; // global flag

  const typingEffect = (text, targetElement) => {
    if (!targetElement) return;
    let index = 0;
    let accumulated = "";
    stopTyping = false;
    isTypingActive = true;
    try {
      const dfb = chatContainer ? (chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop) : 0;
      if (dfb > 80) showScrollToBottom();
    } catch (_) {}

    const typeChunk = () => {
      if (stopTyping) return;
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      accumulated += text.slice(index, index + chunkSize);
      index += chunkSize;
      targetElement.innerHTML = linkify(accumulated);
      updateChatPadding();
      scrollToBottom();
      if (index < text.length) {
        setTimeout(typeChunk, Math.floor(Math.random() * 40) + 20);
      } else {
        // Final render: convert markdown-like headings/bold to clean HTML
        try {
          const finalHtml = styleBotHtml(linkify(text));
          targetElement.innerHTML = finalHtml;
        } catch (_) {}
        targetElement.classList.remove("thinking");
        isTypingActive = false;
        hideScrollToBottom(); // done typing
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
      isTypingActive = false;
      hideScrollToBottom();
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
    updateChatPadding();
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
    updateChatPadding();
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

  // Auto-resize textarea and Enter/Shift+Enter behavior
  const updateChatPadding = () => {
    try {
      if (!chatContainer) return;
      const barH = promptContainerEl ? Math.ceil(promptContainerEl.getBoundingClientRect().height) : (promptForm ? Math.ceil(promptForm.getBoundingClientRect().height) : 0);
      const pad = Math.max(120, barH + 24);
      chatContainer.style.paddingBottom = pad + 'px';
      chatContainer.style.scrollPaddingBottom = pad + 'px';
      updateScrollButtonPosition();
    } catch (_) {}
  };

  const autoResize = () => {
    if (!promptInput) return;
    promptInput.style.height = 'auto';
    const scrollH = promptInput.scrollHeight;
    const maxH = 200; // keep in sync with CSS max-height
    const newH = Math.min(scrollH, maxH);
    promptInput.style.height = newH + 'px';
    promptInput.style.overflowY = scrollH > maxH ? 'auto' : 'hidden';
    updateChatPadding();
    scrollToBottom();
  };

  if (promptInput) {
    // Ensure textarea behavior for Enter vs Shift+Enter
    promptInput.addEventListener("keydown", (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (promptForm) {
          if (typeof promptForm.requestSubmit === 'function') {
            promptForm.requestSubmit();
          } else {
            const evt = new Event('submit', { cancelable: true, bubbles: true });
            promptForm.dispatchEvent(evt);
          }
        }
      }
    });

    promptInput.addEventListener('input', () => {
      if (sendButton) sendButton.style.display = promptInput.value.trim() ? 'inline-block' : 'none';
      autoResize();
    });

    promptInput.addEventListener('focus', () => {
      activateChat();
      autoResize();
    });

    // Initialize height
    setTimeout(autoResize, 0);
  }

  window.addEventListener('resize', updateChatPadding);
  // Initialize padding after DOM ready
  setTimeout(updateChatPadding, 0);

  // Show a 'scroll to bottom' button when user scrolls away during typing
  if (chatContainer) {
    chatContainer.addEventListener('scroll', () => {
      const distanceFromBottom = chatContainer.scrollHeight - chatContainer.clientHeight - chatContainer.scrollTop;
      const away = distanceFromBottom > 80;
      if (isTypingActive && away) {
        showScrollToBottom();
      } else {
        hideScrollToBottom();
      }
    });
  }

  // Explicit click handler to force submit via JS submit listener
  if (sendButton && promptForm) {
    sendButton.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (typeof promptForm.requestSubmit === 'function') {
        promptForm.requestSubmit();
      } else {
        const evt = new Event('submit', { cancelable: true, bubbles: true });
        promptForm.dispatchEvent(evt);
      }
    });
  }

  // --- Generate AI response ---
  const generateResponse = async (userParts) => {
    const botDiv = appendBotMessage("💬 Thinking...", true);
    const parts = Array.isArray(userParts) ? userParts : [{ text: String(userParts || '') }];
    chatHistory.push({ role: "user", parts });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let lastErr = null;

    for (let mi = 0; mi < GEM_MODELS.length; mi++) {
      const model = GEM_MODELS[mi];
      const MAX_RETRIES = 2; // per model

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Keep UI as 'Thinking...' while trying models; log status to console for debugging
          const status = mi > 0 ? `Trying ${model} (fallback) — attempt ${attempt + 1}...` : `${model} — attempt ${attempt + 1}...`;
          try { console.debug('Model status:', status); } catch (_) {}

          const response = await fetch(makeApiUrl(model), {
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
          if (!response.ok) {
            const msg = data?.error?.message || `HTTP ${response.status}`;
            const overloaded = response.status === 429 || response.status === 503 || /overload|busy|try again later/i.test(msg);
            if (overloaded && attempt < MAX_RETRIES) {
              await sleep(400 * Math.pow(2, attempt));
              continue; // retry same model
            }
            lastErr = new Error(msg);
            if (overloaded) break; // try next model
            throw lastErr; // non-overload error: bail out
          }

          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received.";
          chatHistory.push({ role: "model", parts: [{ text: reply }] });

          const target = botDiv ? botDiv.querySelector(".message-text") : null;
          typingEffect(reply, target);
          return;
        } catch (err) {
          lastErr = err;
          const msg = String(err && err.message || err || '');
          const isNetwork = /Failed to fetch|NetworkError|network/i.test(msg);
          if (isNetwork && attempt < MAX_RETRIES) {
            await sleep(400 * Math.pow(2, attempt));
            continue;
          }
          // Move to next model
          break;
        }
      }
    }

    // Final failure
    if (botDiv && botDiv.querySelector(".message-text")) {
      botDiv.querySelector(".message-text").textContent = "⚠️ The service is overloaded or unavailable. Please try again in a minute.";
    }
    console.error("Gemini Error:", lastErr);
    scrollToBottom();
  };

  // --- Form submit ---
  if (promptForm) {
    promptForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;
      const userText = promptInput ? promptInput.value.trim() : "";
      const hasFile = !!(fileInput && fileInput.files && fileInput.files.length);
      if (!userText && !hasFile) { isSubmitting = false; return; }

      activateChat();

      // Optimistic user message and processing indicator
      let attachmentMeta = null;
      let attachmentText = '';
      let fileName = '';
      let tempAttachment = null;
      let processingDiv = null;
      let file = null;

      if (hasFile) {
        file = fileInput.files[0];
        fileName = file.name || 'attachment';
        try {
          tempAttachment = { url: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size };
        } catch (_) {}
      }

      // Show user's message immediately
      appendUserMessage(userText || "[File attached]", tempAttachment ? [tempAttachment] : []);

      // Show processing indicator while we extract/upload
      if (hasFile) {
        processingDiv = appendBotMessage("🔄 Processing attachment...", true);
      }

      // Perform extraction and upload
      if (hasFile && file) {
        try {
          // Extract text for supported types (text/*, PDF)
          attachmentText = await extractAttachmentText(file);
        } catch (ex) {
          console.warn('Attachment extraction failed:', ex);
        }
        try {
          // Stub upload to get a public-like URL for preview
          const res = await uploadAttachment(file);
          if (res.success) {
            attachmentMeta = { url: res.publicUrl, path: res.path, key: res.key, name: file.name, type: file.type, size: file.size };
          } else {
            console.warn('Attachment upload failed:', res.error);
            showToast('⚠️ Attachment upload failed. Sending without attachment preview.');
          }
        } catch (err) {
          console.error('Upload error', err);
          showToast('⚠️ Attachment upload error.');
        }
      }

      // Remove processing indicator
      if (processingDiv && processingDiv.parentNode) {
        try { processingDiv.remove(); } catch (_) { processingDiv.style.display = 'none'; }
      }

      // Clear UI input state
      if (promptInput) {
        promptInput.value = "";
        autoResize();
      }
      if (sendButton) sendButton.style.display = "none";

      // Build final prompt with attachment context if present
      let finalPrompt = userText || (hasFile ? `Please analyze the attached file${fileName ? ` \"${fileName}\"` : ''}.` : '');
      if (hasFile && attachmentText) {
        const MAX_ATTACHMENT_CHARS = 12000;
        const truncated = attachmentText.length > MAX_ATTACHMENT_CHARS
          ? attachmentText.slice(0, MAX_ATTACHMENT_CHARS) + "\n...[truncated]"
          : attachmentText;
        finalPrompt += `\n\nAttachment context (auto-extracted text):\n${truncated}`;
      } else if (hasFile && !attachmentText) {
        finalPrompt += `\n\n(Note: This file type is not yet supported for text extraction. Please summarize its key points.)`;
      }

      // Build content parts for the user message (text + optional inline image)
      let userParts = [{ text: finalPrompt || (hasFile ? "[File attached]" : "") }];
      if (hasFile && file && file.type && file.type.startsWith('image/')) {
        try {
          const base64Data = await readFileAsBase64(file);
          if (base64Data) {
            userParts.push({ inline_data: { mime_type: file.type, data: base64Data } });
          }
        } catch (e) {
          console.warn('Image base64 read failed:', e);
        }
      }

      // Send to AI
      generateResponse(userParts);

      // clear any attached file after sending
      try { clearAttachment(); } catch (e) {}
      isSubmitting = false;
      updateChatPadding();
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
      if (sendButton) sendButton.style.display = 'inline-block';
      if (!isPremiumUser) freeUserFileCount++;
    });
  }

  if (cancelFileButton) {
    cancelFileButton.addEventListener("click", () => {
      if (fileInput) fileInput.value = "";
      if (filePreview) { filePreview.style.display = "none"; filePreview.innerHTML = ''; }
      cancelFileButton.style.display = "none";
      if (!isPremiumUser && freeUserFileCount > 0) freeUserFileCount--;
      if (sendButton && (!promptInput || !promptInput.value.trim())) sendButton.style.display = "none";
    });
  }

  // clear attachments helper
  const clearAttachment = () => {
    if (fileInput) fileInput.value = "";
    if (filePreview) { filePreview.style.display = 'none'; filePreview.innerHTML = ''; }
    if (cancelFileButton) cancelFileButton.style.display = 'none';
  };

});

