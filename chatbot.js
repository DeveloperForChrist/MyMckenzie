const chatContainer = document.querySelector('.chat-container');
const promptForm = document.querySelector('.prompt-form');
const promptInput = promptForm.querySelector('.prompt-input');

const createMsgElement = (html, ...classes) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add("message", ...classes);
    return div;
}

const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage) return;

    // Clear input
    promptInput.value = "";

    // Create user message
    const userHTML = `<p class="message-text"></p>`;
    const userDiv = createMsgElement(userHTML, "user-message");
    userDiv.querySelector(".message-text").textContent = userMessage;
    chatContainer.appendChild(userDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Bot reply after delay
    setTimeout(() => {
        const botHTML = `<i class="fa-solid fa-circle-user bot-avatar"></i>
                         <p class="message-text">Thinking to get you a response...</p>`;
        const botDiv = createMsgElement(botHTML, "bot-message");
        chatContainer.appendChild(botDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 600);
}

// Listen for form submit
promptForm.addEventListener("submit", handleFormSubmit);
