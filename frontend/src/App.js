import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown"; // Import react-markdown

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]); // Stores all responses

  const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

  // Fetch available models on load
  useEffect(() => {
    fetch(backendURL + "/models")
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models);
        setSelectedModel(data.models[0] || ""); // Select first model
      })
      .catch((error) => console.error("Error fetching models:", error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponse(""); // Clear previous response
  
    const response = await fetch(backendURL + "/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: prompt,
      }),
    });
  
    if (!response.body) return;
  
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    // Read the stream line by line
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      fullResponse += text;
      setResponse(fullResponse); // Update response state as it streams
    }

    // Store the final response in history
    setHistory((prevHistory) => [{ prompt, response: fullResponse }, ...prevHistory]);
  };
  
  return (
    <div style={{ maxWidth: "100%", margin: "auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>Ollama AI Chat</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <label>Select Model:</label>
        <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {models.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>

        <label>Enter Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows="3"
          placeholder="Type your question..."
        ></textarea>

        <button type="submit" style={{ padding: "10px", background: "blue", color: "white", cursor: "pointer" }}>
          Generate
        </button>
      </form>

      {response && (
        <div style={{ marginTop: "30px", padding: "10px", border: "1px solid #ddd", background: "#eef", maxHeight: "300px", overflowY: "auto" }}>
          <h4>Response:</h4>
          <ReactMarkdown>{response}</ReactMarkdown> {/* Render markdown properly */}
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div style={{ marginTop: "30px", padding: "10px", border: "1px solid #ddd", background: "#eef", maxHeight: "300px", overflowY: "auto" }}>
          <h4>Previous Queries:</h4>
          {history.map((item, index) => (
            <div key={index} style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
              <strong>Previous Prompt:</strong> {item.prompt}
              <br />
              <strong>Previous Response:</strong>
              <ReactMarkdown style={{
                whiteSpace: "pre-wrap", wordWrap: "break-word", overflowWrap: "break-word",
                background: "#f5f5f5", padding: "10px", borderRadius: "5px", maxWidth: "100%",
                overflowX: "auto"
              }}>
                {item.response}
              </ReactMarkdown>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default App;
