// Select key elements from the HTML using their class names
const chatInput = document.querySelector('.chat-input');       // The text area where the user types messages
const sendButton = document.querySelector('.send-button');     // The button used to send messages
const chatBox = document.querySelector('.chat-box');           // The main chat container
const welcomeSection = document.querySelector('.welcome-section'); // The initial welcome section before chat starts
const messages = document.querySelector('.messages');          // The container that holds all chat messages

// Log the found elements (for debugging)
console.log('Elements found:', { chatInput, sendButton, chatBox, welcomeSection, messages });

// Track if the user has sent their first message
let isFirstMessage = true;

// Automatically resize the chat input box based on text length
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto'; // Reset height to calculate new scroll height
  chatInput.style.height = Math.min(chatInput.scrollHeight, 130) + 'px'; // Set height up to a max of 130px
});

// Store chat history (array of { role: 'user'|'ai', content: '...' })
let chatHistory = [];

// Function to expand the chat box and hide the welcome section when chatting begins
function expandChatBox() {
  console.log('Expanding chat box...');
  
  if (isFirstMessage) {
    // Hide welcome section if it exists
    if (welcomeSection) {
      welcomeSection.classList.add('hidden');
    }
    
    // Add 'expanded' class to chat box (likely triggers CSS animation/resize)
    chatBox.classList.add('expanded');
    
    // Mark that the first message has already been sent
    isFirstMessage = false;
  }
}

// Function that handles sending user messages
function sendMessage() {
  console.log('Send message called');
  
  // Get and trim the user's input text
  const userText = chatInput.value.trim();
  console.log('User text:', userText);
  
  // Do nothing if the input is empty
  if (!userText) {
    console.log('No text, returning');
    return;
  }

  // If this is the first message, expand the chat box
  expandChatBox();

  // Create a new message bubble for the user's message
  const userBubble = document.createElement('div');
  userBubble.className = 'user-msg'; // Apply user message styling
  userBubble.textContent = userText; // Insert user text
  messages.appendChild(userBubble);  // Add it to the message area
  messages.scrollTop = messages.scrollHeight; // Scroll to bottom

  // Clear input and reset height
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Save message to chat history
  chatHistory.push({ role: 'user', content: userText });

  // Show an AI "typing..." indicator
  const typingBubble = document.createElement('div');
  typingBubble.className = 'ai-msg typing';
  typingBubble.textContent = 'MyMckenzie is preparing a response...';
  messages.appendChild(typingBubble);
  messages.scrollTop = messages.scrollHeight;

  // Simulate a delay before the AI responds (for demo/testing)
  setTimeout(() => {
    typingBubble.remove(); // Remove "AI is typing..." bubble
    
    // Create AI message bubble
    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai-msg'; // Apply AI message styling
    aiBubble.textContent = 'This is a test response from the AI.'; // Placeholder text
    messages.appendChild(aiBubble);
    messages.scrollTop = messages.scrollHeight; // Scroll to bottom
  }, 1000); // 1-second delay to simulate thinking
}

// Detect when the user presses a key inside the chat input
chatInput.addEventListener('keydown', (e) => {
  console.log('Key pressed:', e.key);
  
  // If user presses Enter (without Shift), send the message
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Prevent newline in text area
    console.log('Enter pressed, sending message');
    sendMessage(); // Trigger message sending
  }
});

// Detect when the send button is clicked
sendButton.addEventListener('click', () => {
  console.log('Button clicked');
  sendMessage(); // Trigger message sending
});

// Placeholder for future real-time AI message streaming functionality
function startRealTimeChat() {
  console.log('Real-time chat ready for streaming (tokens can be appended here)');
}
