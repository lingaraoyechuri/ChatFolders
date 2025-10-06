import React from "react";
import { createRoot } from "react-dom/client";
import { QuestionsCard } from "../components/QuestionsCard";

const App: React.FC = () => {
  const [questions, setQuestions] = React.useState<string[]>([]);
  const questionsCardRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const chatContainer = document.querySelector("main");
    if (!chatContainer) return;

    let lastQuestions: string[] = [];

    const getQuestions = () => {
      // ChatGPT selector
      const chatgptQuestions = Array.from(
        chatContainer.querySelectorAll('div[class*="whitespace-pre-wrap"]')
      ).map((el) => el.textContent || "");

      // Perplexity selector: treat each editor div as a single prompt
      const perplexityQuestions = Array.from(
        chatContainer.querySelectorAll(
          'div[data-lexical-editor="true"][role="textbox"][aria-readonly="true"]'
        )
      ).map((el) =>
        Array.from(el.querySelectorAll("span[data-lexical-text='true']"))
          .map((span) => span.textContent || "")
          .join("\n")
      );

      // Gemini selector: each user-query element
      const geminiQuestions = Array.from(
        chatContainer.querySelectorAll("user-query")
      ).map((el) => {
        // Find the prompt text inside div.query-text > p.query-text-line
        const queryTextDiv = el.querySelector("div.query-text");
        if (queryTextDiv) {
          const lines = Array.from(
            queryTextDiv.querySelectorAll("p.query-text-line")
          )
            .map((p) => p.textContent || "")
            .filter((t) => t.trim() !== "");
          return lines.join("\n");
        }
        return "";
      });

      // DeepSeek: user prompts are in .ds-message.user, child with class starting with 'fbb'
      const deepSeekQuestions: string[] = [];
      const deepSeekUserMessages = Array.from(
        chatContainer.querySelectorAll(".ds-message.user")
      );
      for (const msg of deepSeekUserMessages) {
        // Find child with class starting with 'fbb' (DeepSeek uses hashed classnames)
        const promptEl = msg.querySelector('.fbb737a4, [class^="fbb"]');
        if (promptEl) {
          const text = promptEl.textContent?.trim();
          if (text && text.length > 0) {
            deepSeekQuestions.push(text);
          }
        }
      }

      // Combine and deduplicate
      const allQuestions = [
        ...chatgptQuestions,
        ...perplexityQuestions,
        ...geminiQuestions,
        ...deepSeekQuestions,
      ].filter((q) => q.trim() !== "");
      return Array.from(new Set(allQuestions));
    };

    let debounceTimer: NodeJS.Timeout | null = null;

    const updateQuestions = () => {
      const newQuestions = getQuestions();
      // Only update if changed
      if (
        newQuestions.length !== lastQuestions.length ||
        newQuestions.some((q, i) => q !== lastQuestions[i])
      ) {
        setQuestions(newQuestions);
        lastQuestions = newQuestions;
      }
    };

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateQuestions, 200); // 200ms debounce
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
    });

    // Initial load
    updateQuestions();

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const handleOnQuestionClick = (question: string) => {
    const chatContainer = document.querySelector("main");
    if (!chatContainer) return;
    // ChatGPT selector
    const chatgptElements = Array.from(
      chatContainer.querySelectorAll('div[class*="whitespace-pre-wrap"]')
    );
    for (const element of chatgptElements) {
      const elementText = element.textContent?.trim();
      if (elementText === question.trim()) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        const htmlElement = element as HTMLElement;
        const originalBackground = htmlElement.style.backgroundColor;
        htmlElement.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
        htmlElement.style.transition = "background-color 0.3s ease";
        setTimeout(() => {
          htmlElement.style.backgroundColor = originalBackground;
        }, 2000);
        return;
      }
    }
    // Perplexity selector: match joined text and highlight the whole editor div
    const perplexityEditors = Array.from(
      chatContainer.querySelectorAll(
        'div[data-lexical-editor="true"][role="textbox"][aria-readonly="true"]'
      )
    );
    for (const editor of perplexityEditors) {
      const joinedText = Array.from(
        editor.querySelectorAll("span[data-lexical-text='true']")
      )
        .map((span) => span.textContent || "")
        .join("\n")
        .trim();
      if (joinedText === question.trim()) {
        editor.scrollIntoView({ behavior: "smooth", block: "center" });
        const htmlElement = editor as HTMLElement;
        const originalBackground = htmlElement.style.backgroundColor;
        htmlElement.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
        htmlElement.style.transition = "background-color 0.3s ease";
        setTimeout(() => {
          htmlElement.style.backgroundColor = originalBackground;
        }, 2000);
        return;
      }
    }
    // Gemini selector: match joined text and highlight the user-query bubble
    const geminiQueries = Array.from(
      chatContainer.querySelectorAll("user-query")
    );
    for (const queryEl of geminiQueries) {
      const queryTextDiv = queryEl.querySelector("div.query-text");
      if (queryTextDiv) {
        const lines = Array.from(
          queryTextDiv.querySelectorAll("p.query-text-line")
        )
          .map((p) => p.textContent || "")
          .filter((t) => t.trim() !== "");
        const joinedText = lines.join("\n").trim();
        if (joinedText === question.trim()) {
          queryEl.scrollIntoView({ behavior: "smooth", block: "center" });
          const htmlElement = queryEl as HTMLElement;
          const originalBackground = htmlElement.style.backgroundColor;
          htmlElement.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
          htmlElement.style.transition = "background-color 0.3s ease";
          setTimeout(() => {
            htmlElement.style.backgroundColor = originalBackground;
          }, 2000);
          return;
        }
      }
    }
    // DeepSeek selector: match text and highlight the user prompt element
    const deepSeekUserMessages = Array.from(
      chatContainer.querySelectorAll(".ds-message")
    );
    console.log("deepSeekUserMessages", deepSeekUserMessages);
    for (const msg of deepSeekUserMessages) {
      const promptEl = msg.querySelector('.fbb737a4, [class^="fbb"]');
      if (promptEl) {
        const elText = promptEl.textContent?.trim();
        if (elText === question.trim()) {
          promptEl.scrollIntoView({ behavior: "smooth", block: "center" });
          const htmlElement = promptEl as HTMLElement;
          const originalBackground = htmlElement.style.backgroundColor;
          htmlElement.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
          htmlElement.style.transition = "background-color 0.3s ease";
          setTimeout(() => {
            htmlElement.style.backgroundColor = originalBackground;
          }, 2000);
          return;
        }
      }
    }
  };
  return (
    <div ref={questionsCardRef}>
      <QuestionsCard
        questions={questions}
        onQuestionClick={handleOnQuestionClick}
      />
    </div>
  );
};

const createAppContainer = () => {
  const existingContainer = document.getElementById(
    "ai-assistant-extension-root"
  );
  if (existingContainer) {
    return existingContainer;
  }
  const appContainer = document.createElement("div");
  appContainer.id = "ai-assistant-extension-root";
  appContainer.style.position = "fixed";
  appContainer.style.top = "0";
  appContainer.style.left = "0";
  appContainer.style.width = "100%";
  appContainer.style.height = "100%";
  appContainer.style.zIndex = "9999";
  appContainer.style.pointerEvents = "none";
  document.body.appendChild(appContainer);
  return appContainer;
};

const init = () => {
  try {
    const container = createAppContainer();
    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error("Error initializing extension:", error);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  setTimeout(init, 500);
}

export default App;
