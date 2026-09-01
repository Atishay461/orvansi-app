"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import MessageBlock from "@/components/MessageBlock";
import { SendIcon, BotIcon } from "lucide-react";

export default function Home() {
  const [model, setModel] = useState("orvansi-0.1");
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { model },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BotIcon className="w-6 h-6 text-blue-400" />
          <h1 className="header-title">Orvansi AI</h1>
        </div>
        <select
          className="model-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="orvansi-0.1">Orvansi 0.1 (Fastest)</option>
          <option value="orvansi-1.2">Orvansi 1.2 (All Around)</option>
          <option value="orvansi-2.1">Orvansi 2.1 (Advanced + Tools)</option>
          <option value="orvansi-beta">Orvansi Beta (Custom HF POC)</option>
        </select>
      </header>

      <main className="chat-container">
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "auto", marginBottom: "auto" }}>
            <h2>Welcome to Orvansi</h2>
            <p>Select your model above and start chatting!</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`message-wrapper ${m.role}`}>
              <div className="message-bubble">
                {m.role === "assistant" ? (
                  <MessageBlock content={m.content} />
                ) : (
                  <div>{m.content}</div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className="input-area">
        <form className="input-form" onSubmit={handleSubmit}>
          <input
            className="chat-input"
            value={input}
            placeholder="Type your message to Orvansi..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button className="send-btn" type="submit" disabled={isLoading || !input.trim()}>
            <SendIcon size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
