window.addEventListener("DOMContentLoaded", () => {

  // --- DOM Elements ---
  const chatContainer = document.querySelector(".chat-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm.querySelector(".prompt-input");
  const appHeader = document.getElementById("app-header");
  const promptMessage = document.getElementById("prompt-message");

  const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
  const fileInput = document.getElementById("file-input");
  const addFileButton = document.getElementById("add-file-button");
  const cancelFileButton = document.getElementById("cancel-file-button");
  const filePreview = fileUploadWrapper.querySelector(".filepreview");

  const deleteChatsButton = document.getElementById("delete-chats-button");
  const sendButton = document.getElementById("send-prompt-button");

  // --- Initial UI State ---
  chatContainer.style.display = "none";
  sendButton.style.display = "none"; // hide send button initially
  let hasUserStartedChat = false;

  // --- User plan & file limits ---
  const isPremiumUser = window.isPremiumUser === true;
  let freeUserFileCount = 0;
  const FREE_USER_FILE_LIMIT = 2;

  // --- Chat history ---
  const chatHistory = [];

  // --- Gemini API config ---
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8"; // Replace with your key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;
  const systemPrompt = `
You are MyMcKenzie AI — an intelligent UK-based legal assistant.
You help litigants in person by offering plain-English legal process guidance.
Never refer to yourself as “Google Gemini.” Always use “MyMcKenzie AI.”
`;

  // --- Helper Functions ---
  const scrollToBottom = () => {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
  };

  const typingEffect = (text, targetElement) => {
    targetElement.textContent = "";
    let index = 0;
    const typeChunk = () => {
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      targetElement.textContent += text.slice(index, index + chunkSize);
      index += chunkSize;
      scrollToBottom();
      if (index < text.length) setTimeout(typeChunk, Math.floor(Math.random() * 40) + 20);
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
    const classes = ["bot-message"];
    if (isThinking) classes.push("thinking"); // special class for Thinking
    const botDiv = createMsgElement(`<p class="message-text">${text}</p>`, ...classes);
    chatContainer.appendChild(botDiv);
    scrollToBottom();
    return botDiv;
  };

  const appendUserMessage = (text) => {
    const userDiv = createMsgElement(`<p class="message-text">${text}</p>`, "user-message");
    chatContainer.appendChild(userDiv);
    scrollToBottom();
  };

  const hidePromptMessage = () => {
    if (promptMessage) promptMessage.style.display = "none";
  };

  const activateChat = () => {
    if (!hasUserStartedChat) {
      chatContainer.style.display = "block";
      appHeader.style.display = "none";
      hasUserStartedChat = true;
      hidePromptMessage();
    }
  };

  // --- Show send button only when typing ---
  promptInput.addEventListener("input", () => {
    if (promptInput.value.trim() === "") {
      sendButton.style.display = "none";
    } else {
      sendButton.style.display = "inline-block";
    }
  });

  // --- Hide header and banner on input focus ---
  promptInput.addEventListener("focus", activateChat);

  // --- Generate response via Gemini ---
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

      typingEffect(reply, botDiv.querySelector(".message-text"));
    } catch (err) {
      botDiv.querySelector(".message-text").textContent = `⚠️ Error: ${err.message}`;
      console.error("Gemini Error:", err);
      scrollToBottom();
    }
  };

  // --- Handle form submit ---
  promptForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userText = promptInput.value.trim();
    if (!userText && !fileInput.files.length) return;

    activateChat();
    appendUserMessage(userText || "[File attached]");
    promptInput.value = "";
    sendButton.style.display = "none";

    generateResponse(userText || "[File attached]");
  });

  // --- Delete chats ---
  deleteChatsButton.addEventListener("click", () => {
    chatContainer.innerHTML = "";
    chatContainer.style.display = "none";
    hasUserStartedChat = false;
    if(appHeader) appHeader.style.display = "block";
    if(promptMessage) promptMessage.style.display = "block";
    chatHistory.length = 0;
  });

  // --- File attachments ---
  addFileButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if(fileInput.files[0]){
      filePreview.src = URL.createObjectURL(fileInput.files[0]);
      filePreview.style.display = 'inline-block';
      cancelFileButton.style.display = 'inline-block';
    }
  });
  cancelFileButton.addEventListener("click", () => {
    fileInput.value = '';
    filePreview.style.display = 'none';
    cancelFileButton.style.display = 'none';
  });

});
