window.addEventListener("DOMContentLoaded", () => {

  // --- Select DOM Elements ---
  const chatContainer = document.querySelector(".chat-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm.querySelector(".prompt-input");

  // --- Gemini API Configuration ---
  const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8"; // Replace with your Gemini key
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;

  // --- Chat History ---
  const chatHistory = [];

  // --- MyMcKenzie System Prompt ---
  const systemPrompt = `
You are MyMcKenzie — an AI legal guidance assistant for people representing themselves in UK courts.
You help users understand legal processes, documents, and terminology clearly in plain English.
You do not offer legal advice — only general guidance.
Whenever you are saying Mymckenzie, make sure it is exactly Mymckenzie with no space between My and Mckenzie
If you are reading a user input and it talks about looking for a mckenzie friend then you are the Mckenzie friend
Always include this disclaimer at least once: "⚖️ This is general legal guidance, not legal advice."
Be friendly, ethical, and supportive like a patient McKenzie Friend.
`;

  // --- Helper: Format Bot Text ---
  const formatBotText = (text) => {
    return text
      .replace(/\n/g, "<br>")               // Preserve line breaks
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
      .replace(/\*(.*?)\*/g, "<i>$1</i>");    // Italic
  };

  // --- Helper: Create Message Element ---
  const createMsgElement = (html, ...classes) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add("message", ...classes);
    return div;
  };

  // --- Append Bot Message ---
  const appendBotMessage = (text) => {
    const formatted = formatBotText(text);
    const botDiv = createMsgElement(`<p class="message-text">${formatted}</p>`, "bot-message");
    chatContainer.appendChild(botDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return botDiv;
  };

  // --- Append User Message ---
  const appendUserMessage = (text) => {
    const userDiv = createMsgElement(`<p class="message-text">${text}</p>`, "user-message");
    chatContainer.appendChild(userDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  // --- Generate Response from Gemini ---
  const generateResponse = async (userMessage, botDiv) => {
    try {
      // Save user message in chat history
      chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

      // API request
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

      // Extract and format reply
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received.";
      botDiv.querySelector(".message-text").innerHTML = formatBotText(reply);

      // Save bot response in chat history
      chatHistory.push({ role: "model", parts: [{ text: reply }] });

    } catch (error) {
      botDiv.querySelector(".message-text").textContent = `⚠️ Error: ${error.message}`;
      console.error("Gemini Error:", error);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  // --- Handle Form Submit ---
  promptForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const userMessage = promptInput.value.trim();
    if (!userMessage) return;
    promptInput.value = "";

    // Display User Message
    appendUserMessage(userMessage);

    // Display Thinking Message
    const botDiv = createMsgElement(
      `<i class="fa-solid fa-circle-user bot-avatar"></i><p class="message-text">Thinking...</p>`,
      "bot-message"
    );
    chatContainer.appendChild(botDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Call Gemini
    generateResponse(userMessage, botDiv);
  });

  // --- Initial Greeting ---
  appendBotMessage(
    "👋 Hello, I’m <b>MyMcKenzie</b>. I can help you understand legal processes, forms, and court procedures. This is general legal guidance, not legal advice."
  );

});
