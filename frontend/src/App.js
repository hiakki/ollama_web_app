import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState([]); // Stores conversation history

  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(backendURL + "/models")
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models);
        setSelectedModel(data.models[0] || "");
      })
      .catch((error) => console.error("Error fetching models:", error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const newHistory = [...history, { type: "user", text: prompt }];
    setHistory(newHistory);
    setPrompt("");

    const response = await fetch(backendURL + "/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, prompt })
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let botResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      botResponse += decoder.decode(value);
      setHistory([...newHistory, { type: "bot", text: botResponse }]);
    }
  };

  return (
    <div className="chat-container">
      <h2 className="title">Ollama AI Chat</h2>
      <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="model-select">
        {models.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      <div className="chat-box">
        {history.map((msg, index) => (
          <div key={index} style={{
            alignSelf: msg.type === "user" ? "flex-end" : "flex-start",
            background: msg.type === "user" ? "#0084ff" : "#f1f0f0",
            color: msg.type === "user" ? "white" : "black",
            padding: "10px",
            maxWidth: "75%",
            border: "1px solid #ddd"
          }}>
            {msg.type === "bot" ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="input-area">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // Prevents new line
              handleSubmit(e); // Calls submit function
            }
          }}
          rows="2"
          placeholder="Ask me anything..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;


/* CSS for responsive design */
const styles = `
  html, body {
    height: 100dvh; /* Dynamic height to adjust when the keyboard opens */
    display: flex;
    flex-direction: column;
  }
  .chat-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: auto;
    height: 100vh;
    border-radius: 10px;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }
  .title {
    text-align: center;
    margin: 10px 0;
  }
  .model-select {
    width: 50%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    justify-content: center;
    align-self: center;
    margin-bottom: 10px;
  }
  .chat-box {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #f5f5f5;
    border-radius: 10px;
  }
  .input-area {
    display: flex;
    padding: 10px;
    gap: 10px;
    background: white;
    position: sticky;
    bottom: 0;
    left: 0;
    width: 100%;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow for visibility */
  }
  textarea {
    resize: none;
    min-height: 40px;
    max-height: 120px;
    overflow-y: auto;
    width: 80%;
  }
  button {
    padding: 10px;
    background: blue;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    width: 15%;
  }
  @media (max-width: 600px) {
    .chat-container {
      width: 100%;
      height: 100vh;
      padding: 5px;
    }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
