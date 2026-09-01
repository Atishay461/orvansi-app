"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export default function MessageBlock({ content }: { content: string }) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);

  // Parse `<thinking>...</thinking>` tags out of the response
  const { thinking, mainContent } = useMemo(() => {
    let thinking = "";
    let mainContent = content;

    const thinkMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      mainContent = content.replace(thinkMatch[0], "").trim();
    } else if (content.includes("<thinking>")) {
      // Stream is in progress, still thinking
      const parts = content.split("<thinking>");
      if (parts.length > 1) {
        thinking = parts[1].trim();
        mainContent = parts[0].trim();
      }
    }

    return { thinking, mainContent };
  }, [content]);

  return (
    <div className="flex flex-col gap-2">
      {thinking && (
        <div className="thinking-block">
          <div
            className={`thinking-header ${isThinkingOpen ? "open" : ""}`}
            onClick={() => setIsThinkingOpen(!isThinkingOpen)}
          >
            {isThinkingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {content.includes("</thinking>") ? "Thought process" : "Orvansi is thinking..."}
              {!content.includes("</thinking>") && <Loader2 size={14} className="animate-spin" />}
            </span>
          </div>
          {isThinkingOpen && <div className="thinking-content">{thinking}</div>}
        </div>
      )}

      {mainContent && (
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
