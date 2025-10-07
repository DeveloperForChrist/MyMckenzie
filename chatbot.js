window.addEventListener("DOMContentLoaded", () => {

  // --- Select DOM Elements ---
  const chatContainer = document.querySelector(".chat-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm.querySelector(".prompt-input");
  const promptContainer = document.querySelector(".prompt-container");

  // --- Gemini API Configuration ---
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8"; // Replace with your key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

  // --- Chat History ---
  const chatHistory = [];

  // --- MyMcKenzie System Prompt ---
  const systemPrompt = `
You are MyMcKenzie — an AI legal guidance assistant for people representing themselves in UK courts.
You help users understand legal processes, documents, and terminology clearly in plain English.
You do not offer legal advice — only general guidance.
Whenever you are saying Mymckenzie, make sure it is exactly Mymckenzie with no space between My and Mckenzie.
Always include this disclaimer at least once in bold: "⚖️ This is general legal guidance, not legal advice."
Be extremely professional, ethical, and supportive like a patient McKenzie Friend.
`;

  // --- Helper: Format Bot Text ---
  const formatBotText = (text) => {
    return text
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.*?)\*/g, "<i>$1</i>");
  };

  // --- Helper: Create Message Element ---
  const createMsgElement = (html, ...classes) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add("message", ...classes);
    return div;
  };

  // --- Scroll chat to bottom accounting for input bar ---
  const scrollToBottom = () => {
    const barHeight = promptContainer.offsetHeight;
    chatContainer.scrollTop = chatContainer.scrollHeight - barHeight;
  };

  // --- Append Bot Message ---
  const appendBotMessage = (text) => {
    const formatted = formatBotText(text);
    const botDiv = createMsgElement(`<p class="message-text">${formatted}</p>`, "bot-message");
    chatContainer.appendChild(botDiv);
    scrollToBottom();
    return botDiv;
  };

  // --- Append User Message ---
  const appendUserMessage = (text) => {
    const userDiv = createMsgElement(`<p class="message-text">${text}</p>`, "user-message");
    chatContainer.appendChild(userDiv);
    scrollToBottom();
  };

  // --- Generate Response from Gemini ---
  const generateResponse = async (userMessage, botDiv) => {
    try {
      chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

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
      botDiv.querySelector(".message-text").innerHTML = formatBotText(reply);
      chatHistory.push({ role: "model", parts: [{ text: reply }] });

      scrollToBottom();
    } catch (error) {
      botDiv.querySelector(".message-text").textContent = `⚠️ Error: ${error.message}`;
      console.error("Gemini Error:", error);
      scrollToBottom();
    }
  };

  // --- Handle Form Submit ---
  promptForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage) return;
    promptInput.value = "";

    appendUserMessage(userMessage);

    const botDiv = createMsgElement(
      `<i class="fa-solid fa-circle-user bot-avatar"></i>
       <p class="message-text">Thinking...</p>`,
      "bot-message"
    );
    chatContainer.appendChild(botDiv);
    scrollToBottom();

    generateResponse(userMessage, botDiv);
  });

  // --- Initial Greeting ---
  appendBotMessage(
    "👋 Hello, I’m <b>MyMcKenzie</b>. I can help you understand legal processes, forms, and court procedures. <b>⚖️ This is general legal guidance, not legal advice.</b>"
  );

});window.addEventListener("DOMContentLoaded", () => {

  // --- Select DOM Elements ---
  const chatContainer = document.querySelector(".chat-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm.querySelector(".prompt-input");
  const promptContainer = document.querySelector(".prompt-container");

  // --- Gemini API Configuration ---
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8"; // Replace with your key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

  // --- Chat History ---
  const chatHistory = [];

  // --- MyMcKenzie System Prompt ---
  const systemPrompt = `
You are MyMcKenzie — an AI legal guidance assistant for people representing themselves in UK courts.
You help users understand legal processes, documents, and terminology clearly in plain English.
You do not offer legal advice — only general guidance.
Whenever you are saying Mymckenzie, make sure it is exactly Mymckenzie with no space between My and Mckenzie.
Always include this disclaimer at least once in bold: "⚖️ This is general legal guidance, not legal advice."
Be extremely professional, ethical, and supportive like a patient McKenzie Friend.
`;

  // --- Helper: Format Bot Text ---
  const formatBotText = (text) => {
    return text
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.*?)\*/g, "<i>$1</i>");
  };

  // --- Helper: Create Message Element ---
  const createMsgElement = (html, ...classes) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add("message", ...classes);
    return div;
  };

  // --- Scroll chat to bottom accounting for input bar ---
  const scrollToBottom = () => {
    const barHeight = promptContainer.offsetHeight;
    chatContainer.scrollTop = chatContainer.scrollHeight - barHeight;
  };

  // --- Append Bot Message ---
  const appendBotMessage = (text) => {
    const formatted = formatBotText(text);
    const botDiv = createMsgElement(`<p class="message-text">${formatted}</p>`, "bot-message");
    chatContainer.appendChild(botDiv);
    scrollToBottom();
    return botDiv;
  };

  // --- Append User Message ---
  const appendUserMessage = (text) => {
    const userDiv = createMsgElement(`<p class="message-text">${text}</p>`, "user-message");
    chatContainer.appendChild(userDiv);
    scrollToBottom();
  };

  // --- Generate Response from Gemini ---
  const generateResponse = async (userMessage, botDiv) => {
    try {
      chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

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
      botDiv.querySelector(".message-text").innerHTML = formatBotText(reply);
      chatHistory.push({ role: "model", parts: [{ text: reply }] });

      scrollToBottom();
    } catch (error) {
      botDiv.querySelector(".message-text").textContent = `⚠️ Error: ${error.message}`;
      console.error("Gemini Error:", error);
      scrollToBottom();
    }
  };

  // --- Handle Form Submit ---
  promptForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage) return;
    promptInput.value = "";

    appendUserMessage(userMessage);

    const botDiv = createMsgElement(
      `<i class="fa-solid fa-circle-user bot-avatar"></i>
       <p class="message-text">Thinking...</p>`,
      "bot-message"
    );
    chatContainer.appendChild(botDiv);
    scrollToBottom();

    generateResponse(userMessage, botDiv);
  });

  // --- Initial Greeting ---
  appendBotMessage(
    "👋 Hello, I’m <b>MyMcKenzie</b>. I can help you understand legal processes, forms, and court procedures. <b>⚖️ This is general legal guidance, not legal advice.</b>"
  );

});