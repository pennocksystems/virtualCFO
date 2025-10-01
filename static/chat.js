const chatForm = document.getElementById("chat-form");
const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");

chatForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Add user message
  const userMsg = document.createElement("div");
  userMsg.classList.add("message", "user");
  userMsg.innerHTML = `<p>${text}</p>`;
  chatWindow.appendChild(userMsg);

  // Scroll down
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Placeholder agent response
  setTimeout(() => {
    const agentMsg = document.createElement("div");
    agentMsg.classList.add("message", "agent");
    agentMsg.innerHTML = `<p>[Demo Response] I’ll analyze that once integrated with GPT.</p>`;
    chatWindow.appendChild(agentMsg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }, 800);

  userInput.value = "";
});
