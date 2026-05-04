// Set webpack publicPath for content scripts (must be before any imports)
// @ts-ignore
if (typeof __webpack_public_path__ !== "undefined") {
  // @ts-ignore
  __webpack_public_path__ = "";
}

// Log IMMEDIATELY - before any imports that might fail
console.log("[AI Extension] Content script file executing");
console.log("[AI Extension] Document ready state:", document.readyState);
console.log("[AI Extension] Current URL:", window.location.href);
console.log("[AI Extension] typeof chrome:", typeof chrome);

import React from "react";
import { createRoot } from "react-dom/client";
import { QuestionsCard } from "../components/QuestionsCard";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Import browser API - use ES6 import with fallback handling
import browserAPIModule, {
  downloadsDownload as downloadsDownloadImport,
} from "../utils/browser";

// Use imported browser API, with fallback if import fails
let browserAPI: any = browserAPIModule;
let downloadsDownload: any = downloadsDownloadImport;

// Verify browser API is available
if (!browserAPI || !browserAPI.runtime) {
  console.warn(
    "[AI Extension] Browser API not available from import, using chrome fallback",
  );
  browserAPI = typeof chrome !== "undefined" ? chrome : null;

  if (!browserAPI) {
    console.error(
      "[AI Extension] CRITICAL: chrome extension API not available!",
    );
  } else {
    console.log("[AI Extension] Using fallback browserAPI:", !!browserAPI);

    if (!downloadsDownload) {
      downloadsDownload = (options: chrome.downloads.DownloadOptions) => {
        return new Promise<number>((resolve, reject) => {
          if (browserAPI && browserAPI.downloads) {
            browserAPI.downloads.download(options, (downloadId: number) => {
              try {
                const lastError = browserAPI.runtime.lastError;
                if (lastError) {
                  reject(
                    new Error(lastError.message || "Unknown download error"),
                  );
                } else {
                  resolve(downloadId);
                }
              } catch (e) {
                resolve(downloadId);
              }
            });
          } else {
            reject(new Error("Downloads API not available"));
          }
        });
      };
    }
  }
}

console.log("[AI Extension] Browser API ready:", !!browserAPI);
console.log("[AI Extension] Browser API runtime:", !!browserAPI?.runtime);

const EXTENSION_ROOT_ID = "ai-assistant-extension-root";
const EXTENSION_MOUNT_FLAG = "aiExtMounted";
let mountObserver: MutationObserver | null = null;

type ChatGPTPromptRecord = {
  id: string;
  text: string;
  element?: Element;
};

const isChatGPTPage = () => {
  const host = window.location.hostname;
  return host.includes("chatgpt.com") || host.includes("chat.openai.com");
};

const normalizePromptText = (text: string) => {
  return text.replace(/\r\n/g, "\n").trim();
};

const getPrimaryChatContainer = (): Element => {
  return document.querySelector("main") || document.body;
};

const compareDomOrder = (a: Element, b: Element) => {
  const position = a.compareDocumentPosition(b);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getScrollHosts = (
  chatContainer: Element,
): Array<HTMLElement | Window> => {
  const elementsToTry: Element[] = [
    chatContainer,
    chatContainer.parentElement as Element,
    chatContainer.closest('[class*="overflow"]') as Element,
    document.scrollingElement as Element,
    document.documentElement,
    document.body,
  ].filter(Boolean);

  const hosts: Array<HTMLElement | Window> = [];
  const pushUnique = (host: HTMLElement | Window) => {
    if (!hosts.includes(host)) {
      hosts.push(host);
    }
  };

  for (const candidate of elementsToTry) {
    if (!(candidate instanceof HTMLElement)) continue;
    const canScroll = candidate.scrollHeight - candidate.clientHeight > 80;
    if (
      !canScroll &&
      candidate !== document.body &&
      candidate !== document.documentElement
    ) {
      continue;
    }
    const overflowY = window.getComputedStyle(candidate).overflowY;
    const isScrollable =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    if (isScrollable || canScroll) {
      pushUnique(candidate);
    }
  }

  // ChatGPT frequently uses nested virtualized scrollers that are descendants
  // of <main>. Gather additional candidates and prioritize larger scroll ranges.
  const descendantScrollables = Array.from(
    chatContainer.querySelectorAll("*"),
  ).filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement)) return false;
    const scrollRange = el.scrollHeight - el.clientHeight;
    if (scrollRange < 140) return false;
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    return (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay" ||
      scrollRange > 800
    );
  });

  descendantScrollables
    .sort(
      (a, b) =>
        b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
    )
    .slice(0, 10)
    .forEach((host) => pushUnique(host));

  pushUnique(window);
  return hosts;
};

const isWindowScrollHost = (host: HTMLElement | Window): host is Window => {
  return host === window;
};

const getScrollTop = (host: HTMLElement | Window): number => {
  if (isWindowScrollHost(host)) {
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0
    );
  }
  return host.scrollTop;
};

const getScrollMetrics = (host: HTMLElement | Window) => {
  if (isWindowScrollHost(host)) {
    const doc = document.documentElement;
    return {
      maxTop: Math.max(0, doc.scrollHeight - window.innerHeight),
      viewportHeight: window.innerHeight,
    };
  }
  return {
    maxTop: Math.max(0, host.scrollHeight - host.clientHeight),
    viewportHeight: host.clientHeight,
  };
};

const setScrollTop = (host: HTMLElement | Window, top: number) => {
  if (isWindowScrollHost(host)) {
    window.scrollTo({ top, behavior: "auto" });
    return;
  }
  host.scrollTop = top;
};

const extractChatGPTUserPrompts = (
  chatContainer: Element,
): ChatGPTPromptRecord[] => {
  const promptMap = new Map<string, ChatGPTPromptRecord>();
  const fallbackByText = new Set<string>();

  const addRecord = (
    id: string | null | undefined,
    rawText: string | null | undefined,
    element: Element,
  ) => {
    const text = normalizePromptText(rawText || "");
    if (!text) return;

    const key = id && id.trim().length > 0 ? `id:${id}` : `text:${text}`;
    if (promptMap.has(key) || fallbackByText.has(text)) {
      return;
    }

    promptMap.set(key, {
      id: id && id.trim().length > 0 ? id : key,
      text,
      element,
    });
    fallbackByText.add(text);
  };

  const userArticles = Array.from(
    chatContainer.querySelectorAll('article[data-turn-id][data-turn="user"]'),
  );

  for (const article of userArticles) {
    const articleId = article.getAttribute("data-turn-id");
    const roleNode =
      article.querySelector('[data-message-author-role="user"]') || article;
    addRecord(articleId, roleNode.textContent, article);
  }

  const userRoleNodes = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="user"]'),
  );

  for (const node of userRoleNodes) {
    const parentArticle = node.closest("article[data-turn-id]");
    const nodeId =
      parentArticle?.getAttribute("data-turn-id") ||
      node.getAttribute("data-message-id") ||
      node.closest("[data-message-id]")?.getAttribute("data-message-id");
    addRecord(nodeId, node.textContent, parentArticle || node);
  }

  // Newer ChatGPT layouts use turn wrappers (e.g., user-turn/agent-turn) where
  // role attributes can be unstable; infer user turns from wrapper classes.
  const wrapperTurns = Array.from(
    chatContainer.querySelectorAll('div[class*="turn-messages"]'),
  );
  for (const turn of wrapperTurns) {
    const classes = turn.className || "";
    if (!classes.includes("user-turn") && classes.includes("agent-turn")) {
      continue;
    }

    if (classes.includes("user-turn")) {
      const textSource =
        turn.querySelector('[data-message-author-role="user"]') ||
        turn.querySelector("[data-message-id]") ||
        turn;
      const turnId =
        textSource.getAttribute("data-message-id") ||
        turn.getAttribute("data-message-id") ||
        turn.getAttribute("data-turn-id");
      addRecord(turnId, textSource.textContent, turn);
    }
  }

  if (promptMap.size === 0) {
    const fallbackNodes = Array.from(
      chatContainer.querySelectorAll('div[class*="whitespace-pre-wrap"]'),
    ).filter((el) => {
      const classes = el.className || "";
      if (classes.includes("markdown") || classes.includes("prose")) {
        return false;
      }
      return !el.closest('[data-message-author-role="assistant"]');
    });

    fallbackNodes.forEach((node, index) => {
      addRecord(`fallback-${index}`, node.textContent, node);
    });
  }

  return Array.from(promptMap.values()).sort((a, b) =>
    compareDomOrder(a.element || document.body, b.element || document.body),
  );
};

const loadChatGPTLazyHistoryRecords = async (
  chatContainer: Element,
  options?: {
    maxIterations?: number;
    waitMs?: number;
    noGrowthLimit?: number;
  },
): Promise<ChatGPTPromptRecord[]> => {
  const maxIterations = options?.maxIterations ?? 32;
  const waitMs = options?.waitMs ?? 260;
  const noGrowthLimit = options?.noGrowthLimit ?? 6;
  const hosts = getScrollHosts(chatContainer);
  const originalTops = hosts.map((host) => ({ host, top: getScrollTop(host) }));
  const maxViewportHeight = Math.max(
    ...hosts.map((host) => getScrollMetrics(host).viewportHeight),
    window.innerHeight,
  );
  const stepSize = Math.max(300, Math.floor(maxViewportHeight * 0.85));
  let noGrowthCount = 0;
  let records = extractChatGPTUserPrompts(chatContainer);
  let previousCount = records.length;

  try {
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      let moved = false;
      for (const host of hosts) {
        const currentTop = getScrollTop(host);
        const nextTop = Math.max(0, currentTop - stepSize);
        if (nextTop !== currentTop) {
          setScrollTop(host, nextTop);
          moved = true;
        }
      }

      if (!moved) break;
      await wait(waitMs);

      records = extractChatGPTUserPrompts(chatContainer);
      if (records.length > previousCount) {
        previousCount = records.length;
        noGrowthCount = 0;
      } else {
        noGrowthCount += 1;
      }

      if (noGrowthCount >= noGrowthLimit) {
        break;
      }
    }
  } finally {
    originalTops.forEach(({ host, top }) => setScrollTop(host, top));
  }

  return extractChatGPTUserPrompts(chatContainer);
};

const getChatGPTConversationId = (): string | null => {
  const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
  return match?.[1] || null;
};

const parsePromptTextFromApiContent = (content: any): string => {
  if (!content) return "";
  if (typeof content === "string") return normalizePromptText(content);
  if (Array.isArray(content)) {
    return normalizePromptText(
      content
        .map((item) => parsePromptTextFromApiContent(item))
        .filter(Boolean)
        .join("\n"),
    );
  }
  if (typeof content === "object") {
    if (Array.isArray(content.parts)) {
      return normalizePromptText(
        content.parts
          .map((part: any) => parsePromptTextFromApiContent(part))
          .filter(Boolean)
          .join("\n"),
      );
    }
    if (typeof content.text === "string") {
      return normalizePromptText(content.text);
    }
  }
  return "";
};

const fetchChatGPTHistoryPrompts = async (
  conversationId: string,
): Promise<ChatGPTPromptRecord[]> => {
  try {
    const response = await fetch(
      `/backend-api/conversation/${conversationId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.warn(
        `[AI Extension] ChatGPT history API request failed (${response.status})`,
      );
      return [];
    }

    const data = await response.json();
    const mapping = data?.mapping;
    if (!mapping || typeof mapping !== "object") {
      return [];
    }

    const prompts = Object.entries(mapping)
      .map(([mappingId, node]: [string, any], index) => {
        const role = node?.message?.author?.role;
        if (role !== "user") return null;

        const text = parsePromptTextFromApiContent(node?.message?.content);
        if (!text) return null;

        const id = node?.message?.id || mappingId || `remote-${index}`;
        const createdAt =
          typeof node?.message?.create_time === "number"
            ? node.message.create_time
            : null;

        return {
          id,
          text,
          createdAt,
          index,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      text: string;
      createdAt: number | null;
      index: number;
    }>;

    prompts.sort((a, b) => {
      if (a.createdAt != null && b.createdAt != null) {
        return a.createdAt - b.createdAt;
      }
      if (a.createdAt != null) return -1;
      if (b.createdAt != null) return 1;
      return a.index - b.index;
    });

    console.log(
      `[AI Extension] ChatGPT API history loaded ${prompts.length} prompts`,
    );
    return prompts.map((prompt) => ({
      id: prompt.id,
      text: prompt.text,
    }));
  } catch (error) {
    console.warn(
      "[AI Extension] Failed to fetch ChatGPT history prompts:",
      error,
    );
    return [];
  }
};

const mergePromptRecords = (
  remotePrompts: ChatGPTPromptRecord[],
  domRecords: ChatGPTPromptRecord[],
): ChatGPTPromptRecord[] => {
  const domById = new Map<string, ChatGPTPromptRecord>();
  const domByTextQueue = new Map<string, ChatGPTPromptRecord[]>();
  domRecords.forEach((record) => {
    domById.set(record.id, record);
    const queue = domByTextQueue.get(record.text) || [];
    queue.push(record);
    domByTextQueue.set(record.text, queue);
  });

  const merged: ChatGPTPromptRecord[] = [];
  const usedDomIds = new Set<string>();
  remotePrompts.forEach((remoteRecord, index) => {
    const idMatch = domById.get(remoteRecord.id);
    let domMatch: ChatGPTPromptRecord | null = null;
    if (idMatch) {
      domMatch = idMatch;
    } else {
      const queue = domByTextQueue.get(remoteRecord.text);
      domMatch = queue && queue.length > 0 ? queue.shift() || null : null;
    }

    if (domMatch?.id) {
      usedDomIds.add(domMatch.id);
    }

    merged.push({
      id: remoteRecord.id || domMatch?.id || `remote-${index}`,
      text: remoteRecord.text,
      element: domMatch?.element,
    });
  });

  domRecords.forEach((record) => {
    if (!usedDomIds.has(record.id)) {
      merged.push(record);
    }
  });

  return merged;
};

const mergeAndPersistChatGPTRecords = (
  existing: ChatGPTPromptRecord[],
  incoming: ChatGPTPromptRecord[],
): ChatGPTPromptRecord[] => {
  const mergedById = new Map<string, ChatGPTPromptRecord>();

  existing.forEach((record) => {
    mergedById.set(record.id, record);
  });

  incoming.forEach((record) => {
    const current = mergedById.get(record.id);
    if (!current) {
      mergedById.set(record.id, record);
      return;
    }

    mergedById.set(record.id, {
      ...current,
      ...record,
      element: record.element || current.element,
    });
  });

  return Array.from(mergedById.values());
};

const highlightAndScrollToElement = (element: Element) => {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  const htmlElement = element as HTMLElement;
  const originalBackground = htmlElement.style.backgroundColor;
  htmlElement.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
  htmlElement.style.transition = "background-color 0.3s ease";
  setTimeout(() => {
    htmlElement.style.backgroundColor = originalBackground;
  }, 2000);
};

const App: React.FC = () => {
  const [questions, setQuestions] = React.useState<string[]>([]);
  const questionsCardRef = React.useRef<HTMLDivElement>(null);
  const chatGptPromptRecordsRef = React.useRef<ChatGPTPromptRecord[]>([]);
  const chatGptCachedPromptsRef = React.useRef<ChatGPTPromptRecord[] | null>(
    null,
  );
  const chatGptConversationIdRef = React.useRef<string | null>(null);
  const chatGptFetchInFlightRef = React.useRef(false);
  const chatGptLazyLoadInFlightRef = React.useRef<Promise<
    ChatGPTPromptRecord[]
  > | null>(null);
  const chatGptLazyLoadedKeyRef = React.useRef<string | null>(null);
  const chatGptAccumulatedRecordsRef = React.useRef<ChatGPTPromptRecord[]>([]);
  const mergeIntoAccumulatedChatGptRecords = React.useCallback(
    (records: ChatGPTPromptRecord[]) => {
      const merged = mergeAndPersistChatGPTRecords(
        chatGptAccumulatedRecordsRef.current,
        records,
      );
      chatGptAccumulatedRecordsRef.current = merged;
      return merged;
    },
    [],
  );
  const getActiveChatContainer = React.useCallback(() => {
    return (
      document.querySelector("main") ||
      document.querySelector(
        ".flex-1.flex.flex-col.gap-3.px-4.max-w-3xl.mx-auto.w-full.pt-1",
      ) ||
      document.body
    );
  }, []);
  const hydrateAllChatGptPromptsOnOpen = React.useCallback(async () => {
    if (!isChatGPTPage()) return;

    const chatContainer = getActiveChatContainer();
    if (!chatContainer) return;

    const conversationId = getChatGPTConversationId();
    if (
      conversationId &&
      !chatGptCachedPromptsRef.current &&
      !chatGptFetchInFlightRef.current
    ) {
      chatGptFetchInFlightRef.current = true;
      try {
        chatGptCachedPromptsRef.current =
          await fetchChatGPTHistoryPrompts(conversationId);
      } finally {
        chatGptFetchInFlightRef.current = false;
      }
    }

    const hosts = getScrollHosts(chatContainer);
    let noGrowthCount = 0;
    let lastCount = chatGptAccumulatedRecordsRef.current.length;

    for (let iteration = 0; iteration < 64; iteration += 1) {
      hosts.forEach((host) => setScrollTop(host, 0));
      await wait(220);

      const domRecords = extractChatGPTUserPrompts(chatContainer);
      const mergedCurrent = mergePromptRecords(
        chatGptCachedPromptsRef.current || [],
        domRecords,
      );
      const persisted = mergeIntoAccumulatedChatGptRecords(mergedCurrent);
      const currentCount = persisted.length;
      const allAtTop = hosts.every((host) => getScrollTop(host) <= 1);

      if (currentCount > lastCount) {
        lastCount = currentCount;
        noGrowthCount = 0;
      } else {
        noGrowthCount += 1;
      }

      if (allAtTop && noGrowthCount >= 3) {
        break;
      }
    }

    const finalRecords = chatGptAccumulatedRecordsRef.current;
    chatGptPromptRecordsRef.current = finalRecords;
    setQuestions(finalRecords.map((record) => record.text));
  }, [getActiveChatContainer, mergeIntoAccumulatedChatGptRecords]);
  const runChatGPTLazyLoader = React.useCallback(
    async (
      chatContainer: Element,
      force: boolean,
    ): Promise<ChatGPTPromptRecord[]> => {
      const conversationId = getChatGPTConversationId();
      const lazyKey = conversationId
        ? `conversation:${conversationId}`
        : `path:${window.location.pathname}`;

      if (!force && chatGptLazyLoadedKeyRef.current === lazyKey) {
        return extractChatGPTUserPrompts(chatContainer);
      }

      if (!chatGptLazyLoadInFlightRef.current) {
        chatGptLazyLoadInFlightRef.current = loadChatGPTLazyHistoryRecords(
          chatContainer,
        ).finally(() => {
          chatGptLazyLoadInFlightRef.current = null;
        });
      }

      const loadedRecords = await chatGptLazyLoadInFlightRef.current;
      chatGptLazyLoadedKeyRef.current = lazyKey;
      return loadedRecords;
    },
    [],
  );
  React.useEffect(() => {
    // Try different container selectors for different platforms
    let chatContainer = document.querySelector("main");
    if (!chatContainer) {
      // For Claude.ai, try the main content area
      chatContainer = document.querySelector(
        ".flex-1.flex.flex-col.gap-3.px-4.max-w-3xl.mx-auto.w-full.pt-1",
      );
    }
    if (!chatContainer) {
      // Fallback to body if no specific container found
      chatContainer = document.body;
    }
    if (!chatContainer) return;

    let lastQuestions: string[] = [];
    let isUpdating = false;
    let shouldRunAgain = false;

    const getQuestions = async () => {
      let chatgptQuestions: string[] = [];
      if (isChatGPTPage()) {
        const domRecords = extractChatGPTUserPrompts(chatContainer);
        const conversationId = getChatGPTConversationId();

        if (conversationId !== chatGptConversationIdRef.current) {
          chatGptConversationIdRef.current = conversationId;
          chatGptCachedPromptsRef.current = null;
          chatGptLazyLoadedKeyRef.current = null;
          chatGptAccumulatedRecordsRef.current = [];
        }

        if (
          conversationId &&
          !chatGptCachedPromptsRef.current &&
          !chatGptFetchInFlightRef.current
        ) {
          chatGptFetchInFlightRef.current = true;
          const remotePrompts =
            await fetchChatGPTHistoryPrompts(conversationId);
          chatGptCachedPromptsRef.current = remotePrompts;
          chatGptFetchInFlightRef.current = false;
        }

        let mergedRecords = mergePromptRecords(
          chatGptCachedPromptsRef.current || [],
          domRecords,
        );

        const persistedRecords =
          mergeIntoAccumulatedChatGptRecords(mergedRecords);
        chatGptPromptRecordsRef.current = persistedRecords;
        chatgptQuestions = persistedRecords.map((record) => record.text);
      }

      // Perplexity selector: treat each editor div as a single prompt
      const perplexityQuestions = Array.from(
        chatContainer.querySelectorAll(
          'div[data-lexical-editor="true"][role="textbox"][aria-readonly="true"]',
        ),
      ).map((el) =>
        Array.from(el.querySelectorAll("span[data-lexical-text='true']"))
          .map((span) => span.textContent || "")
          .join("\n"),
      );

      // Gemini selector: each user-query element
      const geminiQuestions = Array.from(
        chatContainer.querySelectorAll("user-query"),
      ).map((el) => {
        // Find the prompt text inside div.query-text > p.query-text-line
        const queryTextDiv = el.querySelector("div.query-text");
        if (queryTextDiv) {
          const lines = Array.from(
            queryTextDiv.querySelectorAll("p.query-text-line"),
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
        chatContainer.querySelectorAll(".ds-message.user"),
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

      // Claude.ai selector: user messages with data-testid="user-message"
      const claudeQuestions = Array.from(
        chatContainer.querySelectorAll('div[data-testid="user-message"]'),
      ).map((el) => {
        // Find all p elements with the specific classes and join their content
        const textElements = el.querySelectorAll(
          "p.whitespace-pre-wrap.break-words",
        );
        if (textElements.length > 0) {
          return Array.from(textElements)
            .map((p) => p.textContent?.trim() || "")
            .join("\n")
            .trim();
        }
        // Fallback to getting all text content if the specific selector doesn't work
        return el.textContent?.trim() || "";
      });

      // Combine and deduplicate
      const allQuestions = [
        ...chatgptQuestions,
        ...perplexityQuestions,
        ...geminiQuestions,
        ...deepSeekQuestions,
        ...claudeQuestions,
      ].filter((q) => q.trim() !== "");

      return isChatGPTPage() ? allQuestions : Array.from(new Set(allQuestions));
    };

    let debounceTimer: NodeJS.Timeout | null = null;

    const updateQuestions = async () => {
      if (isUpdating) {
        shouldRunAgain = true;
        return;
      }

      isUpdating = true;
      try {
        do {
          shouldRunAgain = false;
          const newQuestions = await getQuestions();
          // Only update if changed
          if (
            newQuestions.length !== lastQuestions.length ||
            newQuestions.some((q, i) => q !== lastQuestions[i])
          ) {
            setQuestions(newQuestions);
            lastQuestions = newQuestions;
          }
        } while (shouldRunAgain);
      } finally {
        isUpdating = false;
      }
    };

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void updateQuestions();
      }, 250); // 250ms debounce
    });

    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
    });

    // Initial load
    void updateQuestions();

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [mergeIntoAccumulatedChatGptRecords]);

  const handleOnQuestionClick = async (question: string, index?: number) => {
    // Try different container selectors for different platforms
    let chatContainer = document.querySelector("main");
    if (!chatContainer) {
      // For Claude.ai, try the main content area
      chatContainer = document.querySelector(
        ".flex-1.flex.flex-col.gap-3.px-4.max-w-3xl.mx-auto.w-full.pt-1",
      );
    }
    if (!chatContainer) {
      // Fallback to body if no specific container found
      chatContainer = document.body;
    }
    if (!chatContainer) return;
    if (isChatGPTPage()) {
      const records = chatGptPromptRecordsRef.current;
      let targetRecord: ChatGPTPromptRecord | undefined;
      if (
        typeof index === "number" &&
        records[index] &&
        records[index].text === question.trim()
      ) {
        targetRecord = records[index];
      }
      if (!targetRecord) {
        targetRecord = records.find(
          (record) => record.text === question.trim(),
        );
      }

      if (targetRecord?.element?.isConnected) {
        highlightAndScrollToElement(targetRecord.element);
        return;
      }

      // Re-extract in case ChatGPT replaced DOM nodes.
      const refreshed = extractChatGPTUserPrompts(chatContainer);
      chatGptPromptRecordsRef.current = refreshed;

      if (targetRecord) {
        const byId = refreshed.find((record) => record.id === targetRecord?.id);
        if (byId?.element) {
          highlightAndScrollToElement(byId.element);
          return;
        }
      }

      if (typeof index === "number") {
        const matchingByText = refreshed.filter(
          (record) => record.text === question.trim(),
        );
        const byIndex = matchingByText[index] || refreshed[index];
        if (byIndex?.element) {
          highlightAndScrollToElement(byIndex.element);
          return;
        }
      }

      const loadedRecords = await runChatGPTLazyLoader(chatContainer, true);
      const withHistory = mergePromptRecords(
        chatGptCachedPromptsRef.current || [],
        loadedRecords,
      );
      const persistedRecords = mergeIntoAccumulatedChatGptRecords(withHistory);
      chatGptPromptRecordsRef.current = persistedRecords;

      if (typeof index === "number" && persistedRecords[index]) {
        const byIndex = persistedRecords[index];
        if (byIndex.text === question.trim() && byIndex.element?.isConnected) {
          highlightAndScrollToElement(byIndex.element);
          return;
        }
      }

      const byId = targetRecord
        ? persistedRecords.find((record) => record.id === targetRecord?.id)
        : undefined;
      if (byId?.element?.isConnected) {
        highlightAndScrollToElement(byId.element);
        return;
      }

      const byText = persistedRecords.find(
        (record) =>
          record.text === question.trim() && record.element?.isConnected,
      );
      if (byText?.element) {
        highlightAndScrollToElement(byText.element);
        return;
      }

      console.warn(
        "[AI Extension] Prompt exists in history but is not mounted in current DOM yet.",
      );
    } else {
      // Fallback ChatGPT selector for non-ChatGPT page edge cases
      const chatgptElements = Array.from(
        chatContainer.querySelectorAll('div[class*="whitespace-pre-wrap"]'),
      );
      for (const element of chatgptElements) {
        const elementText = element.textContent?.trim();
        if (elementText === question.trim()) {
          highlightAndScrollToElement(element);
          return;
        }
      }
    }
    // Perplexity selector: match joined text and highlight the whole editor div
    const perplexityEditors = Array.from(
      chatContainer.querySelectorAll(
        'div[data-lexical-editor="true"][role="textbox"][aria-readonly="true"]',
      ),
    );
    for (const editor of perplexityEditors) {
      const joinedText = Array.from(
        editor.querySelectorAll("span[data-lexical-text='true']"),
      )
        .map((span) => span.textContent || "")
        .join("\n")
        .trim();
      if (joinedText === question.trim()) {
        highlightAndScrollToElement(editor);
        return;
      }
    }
    // Gemini selector: match joined text and highlight the user-query bubble
    const geminiQueries = Array.from(
      chatContainer.querySelectorAll("user-query"),
    );
    for (const queryEl of geminiQueries) {
      const queryTextDiv = queryEl.querySelector("div.query-text");
      if (queryTextDiv) {
        const lines = Array.from(
          queryTextDiv.querySelectorAll("p.query-text-line"),
        )
          .map((p) => p.textContent || "")
          .filter((t) => t.trim() !== "");
        const joinedText = lines.join("\n").trim();
        if (joinedText === question.trim()) {
          highlightAndScrollToElement(queryEl);
          return;
        }
      }
    }
    // DeepSeek selector: match text and highlight the user prompt element
    const deepSeekUserMessages = Array.from(
      chatContainer.querySelectorAll(".ds-message"),
    );
    for (const msg of deepSeekUserMessages) {
      const promptEl = msg.querySelector('.fbb737a4, [class^="fbb"]');
      if (promptEl) {
        const elText = promptEl.textContent?.trim();
        if (elText === question.trim()) {
          highlightAndScrollToElement(promptEl);
          return;
        }
      }
    }
    // Claude.ai selector: match text and highlight the user message
    const claudeUserMessages = Array.from(
      chatContainer.querySelectorAll('div[data-testid="user-message"]'),
    );
    for (const msg of claudeUserMessages) {
      const textElements = msg.querySelectorAll(
        "p.whitespace-pre-wrap.break-words",
      );
      let messageText = "";
      if (textElements.length > 0) {
        messageText = Array.from(textElements)
          .map((p) => p.textContent?.trim() || "")
          .join("\n")
          .trim();
      } else {
        // Fallback to getting all text content
        messageText = msg.textContent?.trim() || "";
      }
      if (messageText === question.trim()) {
        highlightAndScrollToElement(msg);
        return;
      }
    }
  };
  return (
    <div ref={questionsCardRef} style={{ pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto" }}>
        <QuestionsCard
          questions={questions}
          onQuestionClick={handleOnQuestionClick}
        />
      </div>
    </div>
  );
};

const createAppContainer = () => {
  const existingContainer = document.getElementById(EXTENSION_ROOT_ID);
  if (existingContainer) {
    return existingContainer;
  }
  const appContainer = document.createElement("div");
  appContainer.id = EXTENSION_ROOT_ID;
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

const mountExtensionApp = () => {
  const container = createAppContainer();
  if (!container) {
    console.error("[AI Extension] Failed to create container");
    return;
  }

  if (container.dataset[EXTENSION_MOUNT_FLAG] === "true") {
    return;
  }

  console.log("[AI Extension] Container ready, rendering React app...");
  const root = createRoot(container);
  root.render(<App />);
  container.dataset[EXTENSION_MOUNT_FLAG] = "true";
  console.log("[AI Extension] React app rendered successfully");
};

const startMountWatcher = () => {
  if (mountObserver) {
    return;
  }

  // ChatGPT can replace DOM nodes after initial load; remount if our root is removed.
  mountObserver = new MutationObserver(() => {
    if (!document.getElementById(EXTENSION_ROOT_ID)) {
      console.log("[AI Extension] Extension root removed, remounting...");
      mountExtensionApp();
    }
  });

  mountObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};

// Message listener for downloading chat and copying as markdown
// Set up BEFORE React initialization to ensure it's always available
console.log("[AI Extension] Setting up message listener...");
console.log("[AI Extension] browserAPI:", browserAPI);
console.log("[AI Extension] browserAPI.runtime:", browserAPI?.runtime);

// Verify browser API is available
if (!browserAPI || !browserAPI.runtime) {
  console.error(
    "[AI Extension] CRITICAL: browserAPI or browserAPI.runtime is not available!",
  );
  console.error("[AI Extension] typeof browserAPI:", typeof browserAPI);
  console.error("[AI Extension] typeof chrome:", typeof chrome);
  console.error(
    "[AI Extension] typeof browser:",
    typeof (window as any).browser,
  );
} else {
  console.log("[AI Extension] Browser API verified, setting up listener...");
}

browserAPI.runtime.onMessage.addListener(
  (request: any, sender: any, sendResponse: any) => {
    console.log("[AI Extension] Message received:", request.action, request);
    if (request.action === "copyAsMarkdown") {
      // Handle copy as markdown
      // Use async function to properly handle promises
      (async () => {
        try {
          const markdownContent = extractFullChat("markdown");
          if (!markdownContent) {
            sendResponse({ success: false, error: "No chat content found" });
            return;
          }

          // Try modern clipboard API first
          if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
              await navigator.clipboard.writeText(markdownContent);
              sendResponse({ success: true });
              return;
            } catch (clipboardError) {
              console.warn(
                "Clipboard API failed, trying fallback:",
                clipboardError,
              );
              // Fall through to fallback method
            }
          }

          // Fallback: use textarea method (more reliable in some contexts)
          const textarea = document.createElement("textarea");
          textarea.value = markdownContent;

          // Make textarea invisible but accessible
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "0";
          textarea.style.opacity = "0";
          textarea.style.pointerEvents = "none";
          textarea.setAttribute("readonly", "");
          textarea.setAttribute("aria-hidden", "true");

          document.body.appendChild(textarea);

          // Select and copy
          textarea.focus();
          textarea.select();
          textarea.setSelectionRange(0, markdownContent.length);

          try {
            const successful = document.execCommand("copy");
            document.body.removeChild(textarea);

            if (successful) {
              sendResponse({ success: true });
            } else {
              sendResponse({
                success: false,
                error:
                  "Copy command failed. Please try manually selecting and copying the text.",
              });
            }
          } catch (execError) {
            document.body.removeChild(textarea);
            const errorMessage =
              execError instanceof Error
                ? execError.message
                : execError instanceof DOMException
                  ? execError.name + ": " + execError.message
                  : "Failed to copy to clipboard";
            console.error("Error with execCommand:", execError);
            sendResponse({
              success: false,
              error: errorMessage,
            });
          }
        } catch (error) {
          console.error("Error copying as markdown:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : error instanceof DOMException
                ? error.name + ": " + error.message
                : String(error);
          sendResponse({
            success: false,
            error: errorMessage,
          });
        }
      })();
      return true; // Keep the message channel open for async response
    } else if (request.action === "downloadChat") {
      const format = request.format || "markdown";

      // PDF generation is async and downloads directly (to avoid message size limits)
      if (format.toLowerCase() === "pdf") {
        const pdfFormat = request.pdfFormat || "a4"; // Default to A4
        handlePDFExport(pdfFormat)
          .then(() => {
            sendResponse({ success: true, downloaded: true });
          })
          .catch((error) => {
            console.error("Error exporting PDF:", error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          });
        return true; // Keep the message channel open for async response
      } else if (format.toLowerCase() === "html") {
        // HTML export with image inlining is async on supported platforms.
        extractHTMLForCurrentPlatformAsync()
          .then((chatContent) => {
            if (chatContent) {
              sendResponse({ success: true, content: chatContent });
            } else {
              sendResponse({
                success: false,
                error:
                  "No chat content found. Please make sure you have a conversation open.",
              });
            }
          })
          .catch((error) => {
            console.error("Error extracting HTML:", error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          });
        return true; // Keep the message channel open for async response
      } else {
        // Synchronous formats (markdown, json, etc.)
        try {
          const url = window.location.href;
          console.log("Extracting chat for format:", format, "from URL:", url);

          const chatContent = extractFullChat(format);
          console.log("Extracted content length:", chatContent?.length || 0);

          if (chatContent) {
            sendResponse({ success: true, content: chatContent });
          } else {
            console.warn("No chat content found. URL:", url);
            sendResponse({
              success: false,
              error:
                "No chat content found. Please make sure you have a conversation open.",
            });
          }
        } catch (error) {
          console.error("Error extracting chat:", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
        return true; // Keep the message channel open for async response
      }
    }
    return false;
  },
);

// Extract conversation title from Gemini page
function extractConversationTitle(): string {
  // Try to find the conversation title
  const titleElement = document.querySelector("span.conversation-title");
  if (titleElement) {
    return titleElement.textContent?.trim() || "";
  }

  // Try alternative selectors
  const altTitle = document.querySelector('[class*="conversation-title"]');
  if (altTitle) {
    return altTitle.textContent?.trim() || "";
  }

  return "";
}

// Handle PDF export asynchronously - downloads directly to avoid message size limits
async function handlePDFExport(pdfFormat: string = "a4"): Promise<void> {
  const url = window.location.href;
  let messages: Array<{
    role: "user" | "assistant";
    html: string;
    text: string;
    messageId?: string;
    timestamp?: string;
  }> = [];

  if (url.includes("gemini.google.com")) {
    messages = extractGeminiMessagesForPDF();
  } else if (url.includes("chatgpt.com")) {
    messages = extractChatGPTMessagesForPDF();
  } else if (url.includes("claude.ai")) {
    messages = extractClaudeMessagesForPDF();
  } else {
    throw new Error(
      "Please navigate to a supported AI platform (Gemini, ChatGPT, or Claude)",
    );
  }

  if (messages.length === 0) {
    // Check if page is still loading
    const hasAnyMessages =
      document.querySelector('[data-message-author-role="user"]') ||
      document.querySelector('[data-message-author-role="assistant"]') ||
      document.querySelector("user-query") ||
      document.querySelector("model-response") ||
      document.querySelector('div[class*="whitespace-pre-wrap"]') ||
      document.querySelector('div[class*="markdown"][class*="prose"]');

    if (!hasAnyMessages) {
      throw new Error(
        "No messages found. Please make sure you have a conversation open and try again.",
      );
    }

    throw new Error(
      "No messages found to export. The page structure may have changed.",
    );
  }

  const conversationTitle = extractConversationTitle();

  // Determine platform name for filename
  let platformName = "chat";
  if (url.includes("gemini.google.com")) {
    platformName = "gemini";
  } else if (url.includes("chatgpt.com")) {
    platformName = "chatgpt";
  } else if (url.includes("claude.ai")) {
    platformName = "claude";
  }

  await generatePDFFromMessages(
    messages,
    conversationTitle,
    pdfFormat,
    platformName,
  );
}

function extractFullChat(format: string): string | null {
  const url = window.location.href;

  if (url.includes("gemini.google.com")) {
    return extractGeminiChat(format);
  }

  if (url.includes("chatgpt.com")) {
    return extractChatGPTChat(format);
  }

  if (url.includes("claude.ai")) {
    return extractClaudeChat(format);
  }

  // Add other platforms later
  return null;
}

function extractGeminiChat(format: string): string | null {
  // For PDF format, use the new extraction method (handled separately in message listener)
  if (format.toLowerCase() === "pdf") {
    return null; // PDF is handled asynchronously in handlePDFExport
  }

  // Try different container selectors
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  // Extract all user queries and model responses in order
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Try new selectors first
  const userMessages = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="user"]'),
  );
  const assistantMessages = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="assistant"]'),
  );

  // If new selectors found messages, use them
  if (userMessages.length > 0 || assistantMessages.length > 0) {
    const allMessageElements: Array<{
      element: Element;
      role: "user" | "assistant";
    }> = [
      ...userMessages.map((el) => ({ element: el, role: "user" as const })),
      ...assistantMessages.map((el) => ({
        element: el,
        role: "assistant" as const,
      })),
    ].sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    for (const { element, role } of allMessageElements) {
      const text = element.textContent?.trim() || "";
      if (text) {
        messages.push({ role, content: text });
      }
    }
  } else {
    // Fallback to old selectors (user-query, model-response)
    const allElements = Array.from(
      chatContainer.querySelectorAll("user-query, model-response"),
    );

    for (const element of allElements) {
      if (element.tagName.toLowerCase() === "user-query") {
        const queryTextDiv = element.querySelector("div.query-text");
        if (queryTextDiv) {
          const lines = Array.from(
            queryTextDiv.querySelectorAll("p.query-text-line"),
          )
            .map((p) => p.textContent || "")
            .filter((t) => t.trim() !== "");
          if (lines.length > 0) {
            messages.push({ role: "user", content: lines.join("\n") });
          }
        }
      } else if (element.tagName.toLowerCase() === "model-response") {
        let markdownDiv = element.querySelector(
          "div.markdown.markdown-main-panel",
        );
        if (!markdownDiv) {
          markdownDiv = element.querySelector(
            'div[id^="model-response-message-content"]',
          );
        }
        if (!markdownDiv) {
          markdownDiv = element.querySelector("div.markdown");
        }

        if (markdownDiv) {
          const content = markdownDiv.textContent?.trim() || "";
          if (content) {
            messages.push({ role: "assistant", content });
          }
        } else {
          const content = element.textContent?.trim() || "";
          if (content) {
            messages.push({ role: "assistant", content });
          }
        }
      }
    }
  }

  if (messages.length === 0) {
    return null;
  }

  // Format based on requested format
  if (format.toLowerCase() === "markdown") {
    return formatAsMarkdown(messages);
  } else if (format.toLowerCase() === "json") {
    return formatAsJSON(messages);
  } else if (format.toLowerCase() === "html") {
    return extractGeminiHTML();
  } else if (format.toLowerCase() === "text") {
    return formatAsText(messages);
  }

  // Default to markdown
  return formatAsMarkdown(messages);
}

function extractChatGPTChat(format: string): string | null {
  // Try different container selectors
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  // Extract all user prompts and assistant responses in order
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  // Track extracted elements to avoid duplicates
  const extractedElements = new Set<Element>();

  // Strategy 1: Extract from article elements (most reliable for ChatGPT)
  const articles = Array.from(
    chatContainer.querySelectorAll("article[data-turn-id]"),
  );

  if (articles.length > 0) {
    for (const article of articles) {
      const turnRole = article.getAttribute("data-turn") || "";

      // Extract user message
      if (turnRole === "user" || !turnRole) {
        const userMessage = article.querySelector(
          'div[class*="whitespace-pre-wrap"], [data-message-author-role="user"]',
        );
        if (userMessage && !extractedElements.has(userMessage)) {
          const userClasses = userMessage.className || "";
          if (
            !userClasses.includes("markdown") &&
            !userClasses.includes("prose")
          ) {
            const userText = userMessage.textContent?.trim() || "";
            if (userText) {
              messages.push({ role: "user", content: userText });
              extractedElements.add(userMessage);
            }
          }
        }
      }

      // Extract assistant message
      if (turnRole === "assistant" || !turnRole) {
        const assistantMessage = article.querySelector(
          'div[class*="markdown"][class*="prose"], [data-message-author-role="assistant"]',
        );
        if (assistantMessage && !extractedElements.has(assistantMessage)) {
          const assistantText = assistantMessage.textContent?.trim() || "";
          if (assistantText) {
            // Check if it's a duplicate of a user message
            const isDuplicateOfUser = messages.some(
              (msg) => msg.role === "user" && msg.content === assistantText,
            );
            if (!isDuplicateOfUser) {
              messages.push({ role: "assistant", content: assistantText });
              extractedElements.add(assistantMessage);
            }
          }
        }
      }
    }
  }

  // Strategy 2: Extract from message groups (fallback)
  // Look for top-level message containers - be more specific to avoid nested groups
  if (messages.length === 0) {
    const messageGroups = Array.from(
      chatContainer.querySelectorAll("[data-message-id]"),
    ).filter((el) => {
      // Only take top-level message groups, not nested ones
      const parent = el.parentElement;
      return !parent || !parent.hasAttribute("data-message-id");
    });

    if (messageGroups.length > 0) {
      for (const group of messageGroups) {
        // Extract user message - ChatGPT user messages have whitespace-pre-wrap class
        // Make sure we're not picking up assistant messages
        const userMessage = group.querySelector(
          'div[class*="whitespace-pre-wrap"]',
        );
        if (userMessage && !extractedElements.has(userMessage)) {
          // Double-check: user messages should NOT have markdown/prose classes
          const userClasses = userMessage.className || "";
          if (
            !userClasses.includes("markdown") &&
            !userClasses.includes("prose")
          ) {
            const userText = userMessage.textContent?.trim() || "";
            if (userText) {
              messages.push({ role: "user", content: userText });
              extractedElements.add(userMessage);
            }
          }
        }

        // Extract assistant response
        // IMPORTANT: Exclude any divs that contain user messages
        // Assistant responses are in markdown containers, NOT in whitespace-pre-wrap divs
        const assistantContainers = Array.from(
          group.querySelectorAll("div"),
        ).filter((div) => {
          const classes = div.className || "";
          // Must have flex, w-full, flex-col, gap-1
          const hasRequiredClasses =
            classes.includes("flex") &&
            classes.includes("w-full") &&
            classes.includes("flex-col") &&
            classes.includes("gap-1");

          // Must NOT be a user message (no whitespace-pre-wrap)
          const isNotUserMessage = !classes.includes("whitespace-pre-wrap");

          // Must NOT contain a user message
          const hasNoUserMessage = !div.querySelector(
            'div[class*="whitespace-pre-wrap"]',
          );

          return hasRequiredClasses && isNotUserMessage && hasNoUserMessage;
        });

        for (const assistantContainer of assistantContainers) {
          // Find the markdown content div - look for div with markdown and prose classes
          const markdownDivs = Array.from(
            assistantContainer.querySelectorAll("div"),
          ).filter((div) => {
            const classes = div.className || "";
            // Must have both markdown and prose classes
            const hasMarkdownProse =
              classes.includes("markdown") && classes.includes("prose");
            // Must NOT be a user message
            const isNotUserMessage = !classes.includes("whitespace-pre-wrap");
            // Must NOT be inside a user message container
            const notInUserMessage = !div.closest(
              'div[class*="whitespace-pre-wrap"]',
            );

            return hasMarkdownProse && isNotUserMessage && notInUserMessage;
          });

          if (markdownDivs.length > 0) {
            const markdownDiv = markdownDivs[0];
            if (!extractedElements.has(markdownDiv)) {
              const assistantText = markdownDiv.textContent?.trim() || "";
              // Make sure this text is different from any user message we've already extracted
              const isDuplicateOfUser = messages.some(
                (msg) => msg.role === "user" && msg.content === assistantText,
              );
              if (assistantText && !isDuplicateOfUser) {
                messages.push({ role: "assistant", content: assistantText });
                extractedElements.add(markdownDiv);
                break; // Only take the first one per group
              }
            }
          } else {
            // Fallback: get text from the container itself, but verify it's not a user message
            if (!extractedElements.has(assistantContainer)) {
              const assistantText =
                assistantContainer.textContent?.trim() || "";
              // Verify this is not a duplicate of a user message
              const isDuplicateOfUser = messages.some(
                (msg) => msg.role === "user" && msg.content === assistantText,
              );
              if (
                assistantText &&
                assistantText.length > 10 &&
                !isDuplicateOfUser
              ) {
                messages.push({ role: "assistant", content: assistantText });
                extractedElements.add(assistantContainer);
                break;
              }
            }
          }
        }
      }
    }
  }

  // Strategy 3: If no messages found via articles or groups, extract separately
  // But only extract elements we haven't already extracted
  if (messages.length === 0) {
    // Extract user messages that haven't been extracted yet
    // Make sure they're actually user messages (no markdown/prose classes)
    const allUserMessages = Array.from(
      chatContainer.querySelectorAll('div[class*="whitespace-pre-wrap"]'),
    ).filter((el) => {
      if (extractedElements.has(el)) return false;
      const classes = el.className || "";
      // User messages should NOT have markdown/prose classes
      return !classes.includes("markdown") && !classes.includes("prose");
    });

    // Extract assistant responses that haven't been extracted yet
    // Make sure they're NOT user messages
    const allAssistantMarkdownDivs = Array.from(
      chatContainer.querySelectorAll('div[class*="markdown"][class*="prose"]'),
    ).filter((el) => {
      if (extractedElements.has(el)) return false;
      const classes = el.className || "";
      // Must NOT be a user message
      const isNotUserMessage = !classes.includes("whitespace-pre-wrap");
      // Must NOT be inside a user message container
      const notInUserMessage = !el.closest('div[class*="whitespace-pre-wrap"]');
      return isNotUserMessage && notInUserMessage;
    });

    // If no markdown divs found, try looking for the flex container structure
    if (allAssistantMarkdownDivs.length === 0) {
      const flexContainers = Array.from(
        chatContainer.querySelectorAll("div"),
      ).filter((div) => {
        const classes = div.className || "";
        return (
          classes.includes("flex") &&
          classes.includes("w-full") &&
          classes.includes("flex-col") &&
          !extractedElements.has(div)
        );
      });

      for (const container of flexContainers) {
        const markdownDiv = container.querySelector('div[class*="markdown"]');
        if (markdownDiv && !extractedElements.has(markdownDiv)) {
          allAssistantMarkdownDivs.push(markdownDiv);
        }
      }
    }

    // Combine and sort by DOM position
    const allMessageElements: Array<{
      element: Element;
      role: "user" | "assistant";
    }> = [
      ...allUserMessages.map((el) => ({ element: el, role: "user" as const })),
      ...allAssistantMarkdownDivs.map((el) => ({
        element: el,
        role: "assistant" as const,
      })),
    ].sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    for (const { element, role } of allMessageElements) {
      if (!extractedElements.has(element)) {
        const text = element.textContent?.trim() || "";
        if (text) {
          // Additional check: if this is an assistant message, make sure it's not a duplicate of a user message
          if (role === "assistant") {
            const isDuplicateOfUser = messages.some(
              (msg) => msg.role === "user" && msg.content === text,
            );
            if (isDuplicateOfUser) {
              continue; // Skip this assistant message if it's a duplicate of a user message
            }
          }
          messages.push({ role, content: text });
          extractedElements.add(element);
        }
      }
    }
  }

  // Remove duplicates based on content (in case same content appears multiple times)
  const seenContent = new Set<string>();
  const uniqueMessages = messages.filter((msg) => {
    const key = `${msg.role}:${msg.content}`;
    if (seenContent.has(key)) {
      return false;
    }
    seenContent.add(key);
    return true;
  });

  if (uniqueMessages.length === 0) {
    return null;
  }

  // Format based on requested format
  if (format.toLowerCase() === "markdown") {
    return formatAsMarkdown(uniqueMessages);
  } else if (format.toLowerCase() === "json") {
    return formatAsJSON(uniqueMessages);
  } else if (format.toLowerCase() === "html") {
    return extractChatGPTHTML();
  } else if (format.toLowerCase() === "text") {
    return formatAsText(uniqueMessages);
  }

  // Default to markdown
  return formatAsMarkdown(uniqueMessages);
}

function extractClaudeChat(format: string): string | null {
  // Try different container selectors
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  // Extract all user prompts and assistant responses in order
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  // Track extracted elements to avoid duplicates
  const extractedElements = new Set<Element>();

  // Strategy 1: Extract user messages
  // Claude user messages are in containers with data-testid="user-message"
  const userMessages = Array.from(
    chatContainer.querySelectorAll(
      '[data-testid="user-message"], div[data-testid*="user-message"]',
    ),
  );

  // Strategy 2: Extract assistant messages
  // Assistant messages are in div.standard-markdown containers
  const assistantContainers = Array.from(
    chatContainer.querySelectorAll(
      'div.standard-markdown, div[class*="standard-markdown"]',
    ),
  );

  // Combine and sort all messages by DOM position
  const allMessageElements: Array<{
    element: Element;
    role: "user" | "assistant";
  }> = [
    ...userMessages.map((el) => ({ element: el, role: "user" as const })),
    ...assistantContainers.map((el) => ({
      element: el,
      role: "assistant" as const,
    })),
  ].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  // Extract text content from each message
  for (const { element, role } of allMessageElements) {
    if (!extractedElements.has(element)) {
      let text = "";

      if (role === "assistant") {
        // For assistant messages, extract from p.font-claude-response-body elements
        const contentElements = element.querySelectorAll(
          'p.font-claude-response-body, p[class*="font-claude-response-body"], div[class*="standard-markdown"] p',
        );

        if (contentElements.length > 0) {
          // Extract text from paragraphs, preserving inline code
          const paragraphs: string[] = [];
          contentElements.forEach((p) => {
            let paraText = "";
            // Process child nodes to preserve code formatting
            const nodes = Array.from(p.childNodes);
            nodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                paraText += node.textContent || "";
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                if (el.tagName.toLowerCase() === "code") {
                  const codeText = el.textContent || "";
                  paraText += `\`${codeText}\``;
                } else {
                  paraText += el.textContent || "";
                }
              }
            });
            if (paraText.trim()) {
              paragraphs.push(paraText.trim());
            }
          });

          text = paragraphs.join("\n\n");

          // Extract code blocks
          const codeBlocks = element.querySelectorAll(
            'pre.code-block__code, pre[class*="code-block"]',
          );
          codeBlocks.forEach((pre) => {
            const codeText = pre.textContent?.trim() || "";
            if (codeText) {
              // Try to detect language from class or data attribute
              const codeElement = pre.querySelector("code");
              const language =
                codeElement?.className.match(/language-(\w+)/)?.[1] ||
                pre.className.match(/language-(\w+)/)?.[1] ||
                "javascript";
              text += `\n\n\`\`\`${language}\n${codeText}\n\`\`\``;
            }
          });

          // Extract lists (ol and ul)
          const lists = element.querySelectorAll("ol, ul");
          lists.forEach((list) => {
            const items = Array.from(list.querySelectorAll("li"));
            const listItems = items
              .map((li, index) => {
                const itemText = li.textContent?.trim() || "";
                if (!itemText) return "";
                const prefix = list.tagName === "OL" ? `${index + 1}.` : "-";
                return `${prefix} ${itemText}`;
              })
              .filter((item) => item.length > 0);

            if (listItems.length > 0) {
              text += `\n\n${listItems.join("\n")}`;
            }
          });
        } else {
          // Fallback: get all text content, but clean it up
          text = element.textContent?.trim() || "";
        }
      } else {
        // For user messages, extract text content directly
        text = element.textContent?.trim() || "";
      }

      if (text && text.length > 0) {
        // Check for duplicates
        const isDuplicate = messages.some(
          (msg) => msg.role === role && msg.content === text,
        );
        if (!isDuplicate) {
          messages.push({ role, content: text });
          extractedElements.add(element);
        }
      }
    }
  }

  // If no messages found with specific selectors, try a more general approach
  if (messages.length === 0) {
    // Look for message-like containers
    const allMessageBlocks = Array.from(
      chatContainer.querySelectorAll('article, section, div[class*="message"]'),
    );

    for (const block of allMessageBlocks) {
      if (extractedElements.has(block)) continue;

      const text = block.textContent?.trim() || "";
      if (text.length < 10) continue;

      // Check if it looks like an assistant message (has markdown structure)
      const hasMarkdownStructure = block.querySelector(
        "div.standard-markdown, p.font-claude-response-body, pre.code-block__code",
      );
      const role = hasMarkdownStructure ? "assistant" : "user";

      // Avoid duplicates
      const isDuplicate = messages.some(
        (msg) => msg.role === role && msg.content === text,
      );
      if (!isDuplicate) {
        messages.push({ role, content: text });
        extractedElements.add(block);
      }
    }
  }

  // Remove duplicates based on content
  const seenContent = new Set<string>();
  const uniqueMessages = messages.filter((msg) => {
    const key = `${msg.role}:${msg.content}`;
    if (seenContent.has(key)) {
      return false;
    }
    seenContent.add(key);
    return true;
  });

  if (uniqueMessages.length === 0) {
    return null;
  }

  // Format based on requested format
  if (format.toLowerCase() === "markdown") {
    return formatAsMarkdown(uniqueMessages);
  } else if (format.toLowerCase() === "json") {
    return formatAsJSON(uniqueMessages);
  } else if (format.toLowerCase() === "html") {
    return extractClaudeHTML();
  } else if (format.toLowerCase() === "text") {
    return formatAsText(uniqueMessages);
  }

  // Default to markdown
  return formatAsMarkdown(uniqueMessages);
}

// Extract Claude conversation as HTML
function extractClaudeHTML(): string | null {
  // Find the main container
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  // Find all message elements - need to get the full parent containers
  // For user messages, find the parent container that includes file thumbnails
  const userMessageElements = Array.from(
    chatContainer.querySelectorAll('[data-testid="user-message"]'),
  );

  // Get the parent containers for user messages (includes file thumbnails, etc.)
  const userMessages = userMessageElements.map((el) => {
    // Find the parent container that has the full message structure
    // Look for parent with class containing "group" and "relative" and "inline-flex"
    let parent = el.parentElement;
    while (parent && parent !== chatContainer) {
      const classes = parent.className || "";
      if (
        classes.includes("group") &&
        classes.includes("relative") &&
        (classes.includes("inline-flex") || classes.includes("flex"))
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
    // If no specific parent found, get the immediate parent or the element itself
    return el.parentElement || el;
  });

  // For assistant messages, get the full response container
  const assistantMessageElements = Array.from(
    chatContainer.querySelectorAll(
      'div.standard-markdown, div[class*="standard-markdown"]',
    ),
  );

  // Get the parent containers for assistant messages
  const assistantContainers = assistantMessageElements.map((el) => {
    // Find the parent container with class "font-claude-response" or similar
    let parent = el.parentElement;
    while (parent && parent !== chatContainer) {
      const classes = parent.className || "";
      if (
        classes.includes("font-claude-response") ||
        classes.includes("group")
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
    // If no specific parent found, get the immediate parent or the element itself
    return el.parentElement || el;
  });

  if (userMessages.length === 0 && assistantContainers.length === 0) {
    return null;
  }

  // Combine and sort messages by DOM position
  const allMessages: Array<{ element: Element; role: "user" | "assistant" }> = [
    ...userMessages.map((el) => ({ element: el, role: "user" as const })),
    ...assistantContainers.map((el) => ({
      element: el,
      role: "assistant" as const,
    })),
  ].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  const messages: Array<{ role: "user" | "assistant"; html: string }> = [];
  for (const { element, role } of allMessages) {
    const cloned = element.cloneNode(true) as HTMLElement;

    // Only remove UI buttons and action bars, but keep all content
    const unwantedSelectors = [
      'button[aria-label*="Copy"]',
      'button[aria-label*="copy"]',
      'button[aria-label*="Edit"]',
      'button[aria-label*="Retry"]',
      'button[aria-label*="Give positive feedback"]',
      'button[aria-label*="Give negative feedback"]',
      'button[aria-label*="Show less"]',
      'button[aria-label*="Show more"]',
      '[data-testid*="copy"]',
      '[data-testid*="action-bar"]',
      '[class*="action-bar"]',
      '[class*="copy-button"]',
      '[class*="sticky"]', // Remove sticky copy buttons
    ];

    unwantedSelectors.forEach((selector) => {
      cloned.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // Keep all other content - don't use cleanHTMLForExport
    messages.push({ role, html: cloned.outerHTML });
  }

  return createHTMLDocumentFromMessages(messages);
}

function formatAsMarkdown(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  let markdown = "# Chat Conversation\n\n";
  markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`;
  markdown += "---\n\n";

  messages.forEach((msg, index) => {
    const roleLabel = msg.role === "user" ? "User" : "Assistant";
    markdown += `## ${roleLabel}\n\n`;
    markdown += msg.content;
    markdown += "\n\n";

    // Add separator between messages (but not after the last one)
    if (index < messages.length - 1) {
      markdown += "---\n\n";
    }
  });

  return markdown;
}

function formatAsJSON(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  // Pair user and assistant messages together
  const conversationPairs: Array<{ user?: string; assistant?: string }> = [];
  let currentPair: { user?: string; assistant?: string } = {};

  messages.forEach((msg) => {
    if (msg.role === "user") {
      // If we have an incomplete pair (assistant without user), save it first
      if (currentPair.assistant) {
        conversationPairs.push({ ...currentPair });
        currentPair = {};
      }
      currentPair.user = msg.content;
    } else if (msg.role === "assistant") {
      currentPair.assistant = msg.content;
      // Save the complete pair
      conversationPairs.push({ ...currentPair });
      currentPair = {};
    }
  });

  // If there's a remaining user message without an assistant response
  if (currentPair.user) {
    conversationPairs.push({ ...currentPair });
  }

  // Format as JSON with proper indentation
  return JSON.stringify(conversationPairs, null, 2);
}

// Format messages as plain text
function formatAsText(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  return messages
    .map((msg) => {
      const roleLabel = msg.role === "user" ? "User" : "Assistant";
      return `${roleLabel}:\n${msg.content}\n\n---\n\n`;
    })
    .join("");
}

// Extract ChatGPT conversation as HTML (full DOM structure)
function extractChatGPTHTML(): string | null {
  return extractChatGPTHTMLFromTurns(getChatGPTExportTurns());
}

async function extractHTMLForCurrentPlatformAsync(): Promise<string | null> {
  const url = window.location.href;

  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) {
    return extractChatGPTHTMLAsync();
  }
  if (url.includes("gemini.google.com")) {
    return extractGeminiHTMLAsync();
  }
  if (url.includes("claude.ai")) {
    return extractClaudeHTMLAsync();
  }

  return extractFullChat("html");
}

async function extractChatGPTHTMLAsync(): Promise<string | null> {
  const turns = getChatGPTExportTurns();
  if (turns.length === 0) {
    return null;
  }

  for (const turn of turns) {
    await inlineImagesAsDataUrls(turn);
  }

  return createHTMLDocument(turns);
}

async function extractClaudeHTMLAsync(): Promise<string | null> {
  // Find the main container
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  const userMessageElements = Array.from(
    chatContainer.querySelectorAll('[data-testid="user-message"]'),
  );
  const userMessages = userMessageElements.map((el) => {
    let parent = el.parentElement;
    while (parent && parent !== chatContainer) {
      const classes = parent.className || "";
      if (
        classes.includes("group") &&
        classes.includes("relative") &&
        (classes.includes("inline-flex") || classes.includes("flex"))
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return el.parentElement || el;
  });

  const assistantMessageElements = Array.from(
    chatContainer.querySelectorAll(
      'div.standard-markdown, div[class*="standard-markdown"]',
    ),
  );
  const assistantContainers = assistantMessageElements.map((el) => {
    let parent = el.parentElement;
    while (parent && parent !== chatContainer) {
      const classes = parent.className || "";
      if (
        classes.includes("font-claude-response") ||
        classes.includes("group")
      ) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return el.parentElement || el;
  });

  if (userMessages.length === 0 && assistantContainers.length === 0) {
    return null;
  }

  const allMessages: Array<{ element: Element; role: "user" | "assistant" }> = [
    ...userMessages.map((el) => ({ element: el, role: "user" as const })),
    ...assistantContainers.map((el) => ({
      element: el,
      role: "assistant" as const,
    })),
  ].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  const messages: Array<{ role: "user" | "assistant"; html: string }> = [];
  for (const { element, role } of allMessages) {
    const cloned = element.cloneNode(true) as HTMLElement;

    const unwantedSelectors = [
      'button[aria-label*="Copy"]',
      'button[aria-label*="copy"]',
      'button[aria-label*="Edit"]',
      'button[aria-label*="Retry"]',
      'button[aria-label*="Give positive feedback"]',
      'button[aria-label*="Give negative feedback"]',
      'button[aria-label*="Show less"]',
      'button[aria-label*="Show more"]',
      '[data-testid*="copy"]',
      '[data-testid*="action-bar"]',
      '[class*="action-bar"]',
      '[class*="copy-button"]',
      '[class*="sticky"]',
    ];
    unwantedSelectors.forEach((selector) => {
      cloned.querySelectorAll(selector).forEach((el) => el.remove());
    });

    await inlineImagesAsDataUrls(cloned);
    messages.push({ role, html: cloned.outerHTML });
  }

  return createHTMLDocumentFromMessages(messages);
}

async function extractGeminiHTMLAsync(): Promise<string | null> {
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  const messages: Array<{ role: "user" | "assistant"; html: string }> = [];

  // Gemini user uploads are contained in user-query blocks; prefer these first.
  const userQueries = Array.from(chatContainer.querySelectorAll("user-query"));
  const modelResponses = Array.from(
    chatContainer.querySelectorAll("model-response"),
  );

  const allMessages: Array<{ element: Element; role: "user" | "assistant" }> = (
    userQueries.length > 0 || modelResponses.length > 0
      ? [
          ...userQueries.map((el) => ({ element: el, role: "user" as const })),
          ...modelResponses.map((el) => ({
            element: el,
            role: "assistant" as const,
          })),
        ]
      : [
          ...Array.from(
            chatContainer.querySelectorAll('[data-message-author-role="user"]'),
          ).map((el) => ({ element: el, role: "user" as const })),
          ...Array.from(
            chatContainer.querySelectorAll(
              '[data-message-author-role="assistant"]',
            ),
          ).map((el) => ({
            element: el,
            role: "assistant" as const,
          })),
        ]
  ).sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  if (allMessages.length === 0) {
    return null;
  }

  for (const { element, role } of allMessages) {
    const cloned = element.cloneNode(true) as HTMLElement;
    cleanHTMLForExport(cloned);
    await inlineImagesAsDataUrls(cloned);
    messages.push({ role, html: cloned.outerHTML });
  }

  return createHTMLDocumentFromMessages(messages);
}

function getChatGPTExportTurns(): Element[] {
  const getChatGPTTurnElements = (container: ParentNode): Element[] => {
    // New ChatGPT layout uses section[data-testid="conversation-turn-*"].
    // Keep legacy article[data-turn-id] as fallback for older pages.
    const turns = Array.from(
      container.querySelectorAll(
        '[data-testid^="conversation-turn-"][data-turn-id], article[data-turn-id]',
      ),
    );
    return turns.sort(compareDomOrder);
  };

  // Find the main conversation container
  const mainContainer = document.querySelector("div.flex.flex-col.text-sm");

  // Fallback: try to find any main container
  const baseContainer =
    mainContainer || document.querySelector("main") || document.body;
  if (!baseContainer) return [];

  // Clone the container to avoid modifying the original
  const clonedContainer = baseContainer.cloneNode(true) as HTMLElement;

  // Clean up unnecessary elements
  cleanHTMLForExport(clonedContainer);

  // Get all conversation turn elements
  return getChatGPTTurnElements(clonedContainer);
}

function extractChatGPTHTMLFromTurns(turns: Element[]): string | null {
  if (turns.length === 0) {
    return null;
  }
  return createHTMLDocument(turns);
}

async function inlineImagesAsDataUrls(container: Element): Promise<void> {
  const images = Array.from(container.querySelectorAll("img[src]"));
  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) {
        return;
      }

      try {
        const response = await fetch(src, {
          credentials: "include",
          mode: "cors",
        });
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataURL(blob);
        img.setAttribute("src", dataUrl);
        img.removeAttribute("srcset");
      } catch (error) {
        // Non-blocking fallback: keep original image URL if inlining fails.
        console.warn("Failed to inline image for HTML export:", error);
      }
    }),
  );
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to data URL"));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error("Failed to read blob"));
    };
    reader.readAsDataURL(blob);
  });
}

// Extract Gemini conversation as HTML
function extractGeminiHTML(): string | null {
  // Find the main container
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return null;

  // Find all message elements
  const userMessages = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="user"]'),
  );
  const assistantMessages = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="assistant"]'),
  );

  if (userMessages.length === 0 && assistantMessages.length === 0) {
    // Fallback to old selectors
    const userQueries = Array.from(
      chatContainer.querySelectorAll("user-query"),
    );
    const modelResponses = Array.from(
      chatContainer.querySelectorAll("model-response"),
    );

    if (userQueries.length === 0 && modelResponses.length === 0) {
      return null;
    }

    // Create a simple HTML structure from the old selectors
    const messages: Array<{ role: "user" | "assistant"; html: string }> = [];

    [...userQueries, ...modelResponses]
      .sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      })
      .forEach((el) => {
        const role =
          el.tagName.toLowerCase() === "user-query" ? "user" : "assistant";
        const cloned = el.cloneNode(true) as HTMLElement;
        cleanHTMLForExport(cloned);
        messages.push({ role, html: cloned.outerHTML });
      });

    return createHTMLDocumentFromMessages(messages);
  }

  // Combine and sort messages
  const allMessages: Array<{ element: Element; role: "user" | "assistant" }> = [
    ...userMessages.map((el) => ({ element: el, role: "user" as const })),
    ...assistantMessages.map((el) => ({
      element: el,
      role: "assistant" as const,
    })),
  ].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  const messages: Array<{ role: "user" | "assistant"; html: string }> = [];
  for (const { element, role } of allMessages) {
    const cloned = element.cloneNode(true) as HTMLElement;
    cleanHTMLForExport(cloned);
    messages.push({ role, html: cloned.outerHTML });
  }

  return createHTMLDocumentFromMessages(messages);
}

// Clean HTML elements for export - remove buttons, toolbars, etc.
function cleanHTMLForExport(element: HTMLElement): void {
  // Remove action buttons (copy, edit, like, dislike, share, etc.)
  const buttonsToRemove = element.querySelectorAll(
    'button[aria-label="Copy"], ' +
      'button[aria-label="Edit message"], ' +
      'button[aria-label="Good response"], ' +
      'button[aria-label="Bad response"], ' +
      'button[aria-label="Share"], ' +
      'button[aria-label="Switch model"], ' +
      'button[aria-label="More actions"], ' +
      'button[data-testid*="action-button"], ' +
      'div[class*="z-0"].flex, ' + // Action button containers
      'div[class*="touch:-me-2"]', // Action button wrappers
  );
  buttonsToRemove.forEach((btn) => btn.remove());

  // Remove hidden elements
  const hiddenElements = element.querySelectorAll(
    '[aria-hidden="true"], .sr-only',
  );
  hiddenElements.forEach((el) => el.remove());

  // Remove scroll buttons and other UI elements
  const scrollButtons = element.querySelectorAll(
    'button[class*="scroll"], button[class*="rounded-full"]',
  );
  scrollButtons.forEach((btn) => {
    const parent = btn.parentElement;
    if (parent && parent.classList.contains("pointer-events-none")) {
      parent.remove();
    } else {
      btn.remove();
    }
  });

  // Remove edge markers and separators
  const edgeMarkers = element.querySelectorAll(
    '[data-edge="true"], div[style*="opacity"]',
  );
  edgeMarkers.forEach((el) => el.remove());

  // Remove Gemini avatar-gutter and bard-avatar elements
  const avatarGutters = element.querySelectorAll(
    '[class*="avatar-gutter"], ' +
      "bard-avatar, " +
      '[class*="bard-avatar"], ' +
      '[class*="avatar-component"], ' +
      '[class*="avatar-container"], ' +
      '[class*="avatar_primary"], ' +
      '[class*="avatar_primary_model"], ' +
      '[class*="avatar_primary_animation"], ' +
      '[class*="avatar_spinner_animation"]',
  );
  avatarGutters.forEach((el) => el.remove());

  // Remove Gemini TTS (text-to-speech) containers that are empty or have large heights
  const ttsContainers = element.querySelectorAll(
    '[class*="response-tts-container"], ' +
      '[class*="tts-button-container"], ' +
      '[class*="tts-button"]',
  );
  ttsContainers.forEach((el) => {
    // Check if it's mostly empty or has a large height (indicating it's taking up space)
    const style = window.getComputedStyle(el);
    const height = parseInt(style.height) || 0;
    const hasLargeHeight = height > 200; // Remove if height is more than 200px
    const isEmpty =
      !el.textContent?.trim() || el.textContent.trim().length < 10;

    if (hasLargeHeight || isEmpty) {
      el.remove();
    }
  });

  // Remove Lottie animation elements (complex SVG animations)
  const lottieElements = element.querySelectorAll(
    "[lottie-animation], " + "svg[lottie-animation], " + '[class*="lottie"]',
  );
  lottieElements.forEach((el) => {
    // Remove Lottie animations and their parent containers if they're just wrappers
    const parent = el.parentElement;
    if (
      parent &&
      (parent.classList.contains("avatar_primary_animation") ||
        parent.classList.contains("avatar_spinner_animation") ||
        parent.hasAttribute("lottie-animation"))
    ) {
      parent.remove();
    } else {
      el.remove();
    }
  });

  // Remove empty containers with large heights (common in Gemini)
  const largeEmptyContainers = Array.from(
    element.querySelectorAll("div"),
  ).filter((div) => {
    const style = window.getComputedStyle(div);
    const height = parseInt(style.height) || 0;
    const isEmpty = !div.textContent?.trim() && div.children.length === 0;
    const hasLargeHeight = height > 500; // Remove if height > 500px and empty
    return isEmpty && hasLargeHeight;
  });
  largeEmptyContainers.forEach((div) => div.remove());

  // Clean up empty containers
  const emptyContainers = Array.from(element.querySelectorAll("div")).filter(
    (div) => !div.textContent?.trim() && div.children.length === 0,
  );
  emptyContainers.forEach((div) => div.remove());
}

// Create a complete HTML document from article elements (ChatGPT)
function createHTMLDocument(articles: Element[]): string {
  const articlesHTML = articles
    .map((article) => {
      const cloned = article.cloneNode(true) as HTMLElement;
      cleanHTMLForExport(cloned);
      return cloned.outerHTML;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatGPT Conversation Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    article, section[data-turn-id] {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
    }
    article[data-turn="user"], section[data-turn="user"] {
      background: #f9fafb;
    }
    article[data-turn="assistant"], section[data-turn="assistant"] {
      background: #ffffff;
    }
    /* Minimal utility classes used by exported ChatGPT DOM */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-row { flex-direction: row; }
    .items-end { align-items: flex-end; }
    .items-start { align-items: flex-start; }
    .justify-end { justify-content: flex-end; }
    .justify-start { justify-content: flex-start; }
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .min-w-0 { min-width: 0; }
    .max-w-full { max-width: 100%; }
    .overflow-hidden { overflow: hidden; }
    .whitespace-normal { white-space: normal; }
    .whitespace-pre-wrap {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .break-words { overflow-wrap: anywhere; }
    .rounded-\[1\.75rem\], .rounded-\[22px\], .rounded-se-lg {
      border-radius: 1.75rem;
    }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .leading-6 { line-height: 1.5rem; }
    .max-h-96 { max-height: 24rem; }
    .max-w-64 { max-width: 16rem; }
    .object-cover { object-fit: cover; }
    .object-center { object-position: center; }
    img {
      display: block;
      max-width: 100%;
      height: auto;
    }
    /* Keep user messages on right and assistant on left */
    section[data-turn="user"] [data-message-author-role="user"] {
      align-items: flex-end;
    }
    section[data-turn="assistant"] [data-message-author-role="assistant"] {
      align-items: flex-start;
    }
    section[data-turn="user"] .user-message-bubble-color {
      margin-left: auto;
      max-width: 70%;
      background: #f1f5f9;
      color: #111827;
    }
    section[data-turn="assistant"] .markdown {
      margin-right: auto;
      max-width: 100%;
    }
    .markdown {
      max-width: 100%;
    }
    .markdown p {
      margin: 0.5rem 0;
    }
    .markdown ul, .markdown ol {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    .markdown pre {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .markdown code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="flex flex-col text-sm">
    ${articlesHTML}
  </div>
</body>
</html>`;

  return html;
}

// Create a complete HTML document from message elements (Gemini)
function createHTMLDocumentFromMessages(
  messages: Array<{ role: "user" | "assistant"; html: string }>,
): string {
  const messagesHTML = messages
    .map((msg) => {
      return `<div class="message ${msg.role}" data-role="${msg.role}">
      ${msg.html}
    </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Conversation Export</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .message {
      margin-bottom: 2rem;
      padding: 1rem;
      border-radius: 8px;
    }
    .message.user {
      background: #f1f1f1;
    }
    .message.assistant {
      background: #ffffff;
      border: 1px solid #e5e7eb;
    }
    .markdown {
      max-width: 100%;
    }
    .markdown p {
      margin: 0.5rem 0;
    }
    .markdown ul, .markdown ol {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    .markdown pre {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .markdown code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="conversation">
    ${messagesHTML}
  </div>
</body>
</html>`;

  return html;
}

// Extract ChatGPT messages for PDF generation (with HTML content)
function extractChatGPTMessagesForPDF(): Array<{
  role: "user" | "assistant";
  html: string;
  text: string;
  messageId?: string;
  timestamp?: string;
}> {
  const messages: Array<{
    role: "user" | "assistant";
    html: string;
    text: string;
    messageId?: string;
    timestamp?: string;
  }> = [];

  // Try different container selectors
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return messages;

  // Track extracted elements to avoid duplicates
  const extractedElements = new Set<Element>();

  // Find all message groups
  const messageGroups = Array.from(
    chatContainer.querySelectorAll("[data-message-id]"),
  ).filter((el) => {
    const parent = el.parentElement;
    return !parent || !parent.hasAttribute("data-message-id");
  });

  if (messageGroups.length > 0) {
    for (const group of messageGroups) {
      // Extract user message
      const userMessage = group.querySelector(
        'div[class*="whitespace-pre-wrap"]',
      );
      if (userMessage && !extractedElements.has(userMessage)) {
        const userClasses = userMessage.className || "";
        if (
          !userClasses.includes("markdown") &&
          !userClasses.includes("prose")
        ) {
          const userText = userMessage.textContent?.trim() || "";
          const userHTML = userMessage.innerHTML || userText;
          if (userText) {
            messages.push({
              role: "user",
              html: cleanHTMLForPDF(userHTML),
              text: userText,
            });
            extractedElements.add(userMessage);
          }
        }
      }

      // Extract assistant response
      const assistantContainers = Array.from(
        group.querySelectorAll("div"),
      ).filter((div) => {
        const classes = div.className || "";
        return (
          classes.includes("flex") &&
          classes.includes("w-full") &&
          classes.includes("flex-col") &&
          classes.includes("gap-1") &&
          !classes.includes("whitespace-pre-wrap") &&
          !div.querySelector('div[class*="whitespace-pre-wrap"]')
        );
      });

      for (const assistantContainer of assistantContainers) {
        const markdownDivs = Array.from(
          assistantContainer.querySelectorAll("div"),
        ).filter((div) => {
          const classes = div.className || "";
          return (
            classes.includes("markdown") &&
            classes.includes("prose") &&
            !classes.includes("whitespace-pre-wrap") &&
            !div.closest('div[class*="whitespace-pre-wrap"]')
          );
        });

        if (markdownDivs.length > 0) {
          const markdownDiv = markdownDivs[0];
          if (!extractedElements.has(markdownDiv)) {
            const assistantText = markdownDiv.textContent?.trim() || "";
            const assistantHTML = markdownDiv.innerHTML || assistantText;
            // Check if it's a duplicate of a user message
            const isDuplicateOfUser = messages.some(
              (msg) => msg.role === "user" && msg.text === assistantText,
            );
            if (assistantText && !isDuplicateOfUser) {
              messages.push({
                role: "assistant",
                html: cleanHTMLForPDF(assistantHTML),
                text: assistantText,
              });
              extractedElements.add(markdownDiv);
              break;
            }
          }
        }
      }
    }
  }

  // Fallback: extract separately if needed
  if (messages.length === 0) {
    const allUserMessages = Array.from(
      chatContainer.querySelectorAll('div[class*="whitespace-pre-wrap"]'),
    ).filter((el) => {
      if (extractedElements.has(el)) return false;
      const classes = el.className || "";
      return !classes.includes("markdown") && !classes.includes("prose");
    });

    const allAssistantMarkdownDivs = Array.from(
      chatContainer.querySelectorAll('div[class*="markdown"][class*="prose"]'),
    ).filter((el) => {
      if (extractedElements.has(el)) return false;
      const classes = el.className || "";
      return (
        !classes.includes("whitespace-pre-wrap") &&
        !el.closest('div[class*="whitespace-pre-wrap"]')
      );
    });

    const allMessageElements: Array<{
      element: Element;
      role: "user" | "assistant";
    }> = [
      ...allUserMessages.map((el) => ({ element: el, role: "user" as const })),
      ...allAssistantMarkdownDivs.map((el) => ({
        element: el,
        role: "assistant" as const,
      })),
    ].sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    for (const { element, role } of allMessageElements) {
      if (!extractedElements.has(element)) {
        const text = element.textContent?.trim() || "";
        const html = element.innerHTML || text;
        if (text) {
          if (role === "assistant") {
            const isDuplicateOfUser = messages.some(
              (msg) => msg.role === "user" && msg.text === text,
            );
            if (isDuplicateOfUser) continue;
          }
          messages.push({
            role,
            html: cleanHTMLForPDF(html),
            text,
          });
          extractedElements.add(element);
        }
      }
    }
  }

  return messages;
}

// Clean HTML content for PDF - remove excessive spacing and normalize
function cleanHTMLForPDF(html: string): string {
  // Create a temporary div to parse and clean the HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Remove excessive line breaks and normalize spacing
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Normalize whitespace in text nodes - replace multiple spaces/newlines with single space
      const text = node.textContent || "";
      node.textContent = text.replace(/[\s\n\r]+/g, " ").trim();
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // Process child nodes
      Array.from(element.childNodes).forEach(processNode);

      // Remove empty elements (except br, img, etc.)
      if (
        element.children.length === 0 &&
        !element.textContent?.trim() &&
        !["br", "img", "hr"].includes(element.tagName.toLowerCase())
      ) {
        element.remove();
      }
    }
  };

  Array.from(tempDiv.childNodes).forEach(processNode);

  // Get cleaned HTML
  let cleanedHTML = tempDiv.innerHTML;

  // Remove excessive <br> tags (more than 2 consecutive)
  cleanedHTML = cleanedHTML.replace(/(<br\s*\/?>){3,}/gi, "<br><br>");

  // Normalize paragraph spacing
  cleanedHTML = cleanedHTML.replace(/<\/p>\s*<p>/gi, "</p><p>");

  return cleanedHTML;
}

// Extract Claude messages for PDF generation (with HTML content)
function extractClaudeMessagesForPDF(): Array<{
  role: "user" | "assistant";
  html: string;
  text: string;
  messageId?: string;
  timestamp?: string;
}> {
  const messages: Array<{
    role: "user" | "assistant";
    html: string;
    text: string;
    messageId?: string;
    timestamp?: string;
  }> = [];

  // Try different container selectors
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return messages;

  // Extract user messages
  const userMessages = Array.from(
    chatContainer.querySelectorAll(
      '[data-testid="user-message"], div[data-testid*="user-message"]',
    ),
  );

  // Extract assistant messages
  const assistantContainers = Array.from(
    chatContainer.querySelectorAll(
      'div.standard-markdown, div[class*="standard-markdown"]',
    ),
  );

  // Combine and sort all messages by DOM position
  const allMessageElements: Array<{
    element: Element;
    role: "user" | "assistant";
  }> = [
    ...userMessages.map((el) => ({ element: el, role: "user" as const })),
    ...assistantContainers.map((el) => ({
      element: el,
      role: "assistant" as const,
    })),
  ].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  // Extract HTML and text content from each message
  for (const { element, role } of allMessageElements) {
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Only remove UI buttons and action bars, but keep all content
    const unwantedSelectors = [
      'button[aria-label*="Copy"]',
      'button[aria-label*="copy"]',
      'button[aria-label*="Edit"]',
      'button[aria-label*="Retry"]',
      'button[aria-label*="Give positive feedback"]',
      'button[aria-label*="Give negative feedback"]',
      '[data-testid*="copy"]',
      '[data-testid*="action-bar"]',
      '[class*="action-bar"]',
      '[class*="copy-button"]',
      '[class*="sticky"]', // Remove sticky copy buttons
    ];

    unwantedSelectors.forEach((selector) => {
      clonedElement.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // Get the full HTML content - don't filter or remove anything else
    let html = clonedElement.innerHTML;
    let text = clonedElement.textContent?.trim() || "";

    // Get message ID if available
    const messageId =
      element.getAttribute("data-message-id") ||
      element.getAttribute("id") ||
      element.getAttribute("data-testid") ||
      undefined;

    // Try to extract timestamp (Claude may not have timestamps visible)
    let timestamp: string | undefined;
    const timeElement = element.querySelector("time");
    if (timeElement) {
      timestamp =
        timeElement.getAttribute("datetime") ||
        timeElement.textContent ||
        undefined;
    }

    if (text && text.length > 0) {
      // Don't use cleanHTMLForPDF - keep all content as-is
      messages.push({
        role,
        html: html, // Use raw HTML without cleaning
        text,
        messageId,
        timestamp: timestamp || new Date().toISOString(),
      });
    }
  }

  return messages;
}

// Extract Gemini messages using the new DOM selectors with fallback
function extractGeminiMessagesForPDF(): Array<{
  role: "user" | "assistant";
  html: string;
  text: string;
  messageId?: string;
  timestamp?: string;
}> {
  const messages: Array<{
    role: "user" | "assistant";
    html: string;
    text: string;
    messageId?: string;
    timestamp?: string;
  }> = [];

  // Try different container selectors
  let chatContainer = document.querySelector("main");
  if (!chatContainer) {
    chatContainer = document.body;
  }
  if (!chatContainer) return messages;

  // Find all messages using the new selectors first
  const userMessages = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="user"]'),
  );
  const assistantMessages = Array.from(
    chatContainer.querySelectorAll('[data-message-author-role="assistant"]'),
  );

  let allMessageElements: Array<{
    element: Element;
    role: "user" | "assistant";
  }> = [];

  // If new selectors found messages, use them
  if (userMessages.length > 0 || assistantMessages.length > 0) {
    allMessageElements = [
      ...userMessages.map((el) => ({ element: el, role: "user" as const })),
      ...assistantMessages.map((el) => ({
        element: el,
        role: "assistant" as const,
      })),
    ];
  } else {
    // Fallback to old selectors (user-query, model-response)
    const userQueries = Array.from(
      chatContainer.querySelectorAll("user-query"),
    );
    const modelResponses = Array.from(
      chatContainer.querySelectorAll("model-response"),
    );

    allMessageElements = [
      ...userQueries.map((el) => ({ element: el, role: "user" as const })),
      ...modelResponses.map((el) => ({
        element: el,
        role: "assistant" as const,
      })),
    ];
  }

  // Sort by DOM position
  allMessageElements.sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  for (const { element, role } of allMessageElements) {
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as Element;

    // Remove unwanted elements
    const unwantedSelectors = [
      'button[aria-label*="Copy"]',
      'button[aria-label*="copy"]',
      '[data-testid*="copy"]',
      '[class*="copy-button"]',
      '[class*="toolbar"]',
      '[class*="overflow"]',
      '[class*="shadow"]',
      "[data-model-version]",
      '[class*="badge"]',
    ];

    unwantedSelectors.forEach((selector) => {
      clonedElement.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // For old selectors (user-query, model-response), extract content differently
    let html = "";
    let text = "";

    if (element.tagName.toLowerCase() === "user-query") {
      // Extract from user-query
      const queryTextDiv = clonedElement.querySelector("div.query-text");
      if (queryTextDiv) {
        html = queryTextDiv.innerHTML;
        text = queryTextDiv.textContent?.trim() || "";
      } else {
        html = clonedElement.innerHTML;
        text = clonedElement.textContent?.trim() || "";
      }
    } else if (element.tagName.toLowerCase() === "model-response") {
      // Extract from model-response
      let markdownDiv = clonedElement.querySelector(
        "div.markdown.markdown-main-panel",
      );
      if (!markdownDiv) {
        markdownDiv = clonedElement.querySelector(
          'div[id^="model-response-message-content"]',
        );
      }
      if (!markdownDiv) {
        markdownDiv = clonedElement.querySelector("div.markdown");
      }
      if (markdownDiv) {
        html = markdownDiv.innerHTML;
        text = markdownDiv.textContent?.trim() || "";
      } else {
        html = clonedElement.innerHTML;
        text = clonedElement.textContent?.trim() || "";
      }
    } else {
      // For new selectors, use the element directly
      html = clonedElement.innerHTML;
      text = clonedElement.textContent?.trim() || "";
    }

    // Get message ID if available
    const messageId =
      element.getAttribute("data-message-id") ||
      element.getAttribute("id") ||
      undefined;

    // Try to extract timestamp
    let timestamp: string | undefined;
    const timeElement = element.querySelector("time");
    if (timeElement) {
      timestamp =
        timeElement.getAttribute("datetime") ||
        timeElement.textContent ||
        undefined;
    }

    if (text) {
      messages.push({
        role,
        html,
        text,
        messageId,
        timestamp: timestamp || new Date().toISOString(),
      });
    }
  }

  return messages;
}

// Generate PDF from messages using HTML template + html2canvas + jsPDF
async function generatePDFFromMessages(
  messages: Array<{
    role: "user" | "assistant";
    html: string;
    text: string;
    messageId?: string;
    timestamp?: string;
  }>,
  conversationTitle: string = "",
  pdfFormat: string = "a4",
  platform: string = "chat",
): Promise<void> {
  // Create HTML template (body content only)
  const { styles, bodyContent } = createHTMLTemplate(
    messages,
    conversationTitle,
  );

  // Create a hidden container for rendering
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.backgroundColor = "#ffffff";

  // Create style element
  const styleElement = document.createElement("style");
  styleElement.setAttribute("data-pdf-export", "true");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  // Set container content
  container.innerHTML = bodyContent;
  document.body.appendChild(container);

  // Wait a bit for styles to apply
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    // Remove any script references from the container before rendering
    // This prevents html2canvas from trying to load external scripts
    container.querySelectorAll("script").forEach((script) => script.remove());

    // Remove all event handlers
    const eventHandlers = [
      "onload",
      "onerror",
      "onclick",
      "onmouseover",
      "onmouseout",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
      "onreset",
      "onkeydown",
      "onkeyup",
      "onkeypress",
      "onmousedown",
      "onmouseup",
    ];
    eventHandlers.forEach((handler) => {
      container.querySelectorAll(`[${handler}]`).forEach((el) => {
        el.removeAttribute(handler);
      });
    });

    // Remove any data attributes that might trigger script loading
    // Also remove src attributes pointing to external scripts
    container.querySelectorAll("*").forEach((el) => {
      const htmlEl = el as HTMLElement;

      // Remove script-related attributes
      const scriptAttrs = [
        "src",
        "data-src",
        "data-script",
        "data-js",
        "data-module",
        "data-wli",
        "data-js-module",
        "data-js-component",
      ];
      scriptAttrs.forEach((attr) => {
        if (htmlEl.hasAttribute(attr)) {
          htmlEl.removeAttribute(attr);
        }
      });

      // Remove data attributes containing script references
      // Only match actual URLs or script file references, not plain text
      Array.from(htmlEl.attributes).forEach((attr) => {
        const value = attr.value.toLowerCase();
        if (
          attr.name.startsWith("data-") &&
          (value.includes("script") ||
            // Only match URLs (http/https) or src-related attributes
            (value.includes("gstatic.com") &&
              (value.startsWith("http") || attr.name.includes("src"))) ||
            (value.includes("cdnjs.cloudflare.com") &&
              (value.startsWith("http") || attr.name.includes("src"))) ||
            (value.includes("unpkg.com") &&
              (value.startsWith("http") || attr.name.includes("src"))) ||
            (value.includes("jsdelivr.net") &&
              (value.startsWith("http") || attr.name.includes("src"))) ||
            // Only match pdfobject if it's a URL or script reference
            (value.includes("pdfobject") &&
              (value.startsWith("http") ||
                value.includes(".js") ||
                attr.name.includes("src"))) ||
            (value.includes("js/") &&
              (value.startsWith("http") || attr.name.includes("src"))) ||
            (value.includes(".js") &&
              (value.startsWith("http") || attr.name.includes("src"))) ||
            (value.includes("boq-bard-web") &&
              (value.startsWith("http") ||
                value.includes(".js") ||
                attr.name.includes("src"))))
        ) {
          htmlEl.removeAttribute(attr.name);
        }
      });
    });

    // Additional aggressive sanitization: Remove any elements that might trigger script loading
    // Do this after innerHTML is set to catch any that might have been missed
    const allElements = container.querySelectorAll("*");
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;

      // Remove any element that has script-related attributes we might have missed
      // Only match actual URLs, not plain text content
      const hasScriptAttr = Array.from(htmlEl.attributes).some((attr) => {
        const value = attr.value.toLowerCase();
        const attrName = attr.name.toLowerCase();
        return (
          attrName.includes("script") ||
          attrName.includes("wli") ||
          // Only match if it's a URL (starts with http/https) or is a src/data-src attribute
          (value.includes("gstatic.com") &&
            (value.startsWith("http") || attrName.includes("src"))) ||
          (value.includes("cdnjs.cloudflare.com") &&
            (value.startsWith("http") || attrName.includes("src"))) ||
          (value.includes("unpkg.com") &&
            (value.startsWith("http") || attrName.includes("src"))) ||
          (value.includes("jsdelivr.net") &&
            (value.startsWith("http") || attrName.includes("src"))) ||
          // Only match pdfobject if it's in a URL context
          (value.includes("pdfobject") &&
            (value.startsWith("http") ||
              value.includes(".js") ||
              attrName.includes("src"))) ||
          (value.includes("boq-bard") &&
            (value.startsWith("http") ||
              value.includes(".js") ||
              attrName.includes("src"))) ||
          (value.includes("bardchatu") &&
            (value.startsWith("http") ||
              value.includes(".js") ||
              attrName.includes("src"))) ||
          // Only match .js if it's in a URL or src attribute
          (value.includes(".js") &&
            (value.startsWith("http") || attrName.includes("src")))
        );
      });

      if (hasScriptAttr) {
        // Remove the element entirely if it has script references
        htmlEl.remove();
      }
    });

    // Render to canvas using html2canvas with higher scale for better quality
    // Use proxy option to prevent external resource loading
    const canvas = await html2canvas(container, {
      scale: 3, // Increased from 2 to 3 for better text quality
      useCORS: false, // Disable CORS to prevent external resource loading
      allowTaint: true, // Allow tainted canvas (we're not loading external images anyway)
      logging: false,
      width: 700,
      backgroundColor: "#ffffff",
      windowWidth: 700,
      foreignObjectRendering: false, // Disable foreignObject rendering which can load external scripts
      removeContainer: false, // Keep container for cleanup
      proxy: undefined, // Don't use proxy (prevents external requests)
      ignoreElements: (element) => {
        // Ignore script, iframe, embed, object elements
        const tagName = element.tagName?.toLowerCase();
        const hasScriptRef = Array.from(element.attributes).some((attr) => {
          const value = attr.value.toLowerCase();
          return (
            value.includes("gstatic.com") ||
            value.includes("boq-bard") ||
            value.includes("bardchatu") ||
            value.includes(".js") ||
            attr.name.toLowerCase().includes("script") ||
            attr.name.toLowerCase().includes("wli")
          );
        });
        return (
          tagName === "script" ||
          tagName === "iframe" ||
          tagName === "embed" ||
          tagName === "object" ||
          hasScriptRef
        );
      },
    });

    // Create PDF with selected format
    let pdfFormatOption: string | number[] = "a4";
    if (pdfFormat === "letter") {
      pdfFormatOption = "letter"; // US Letter size (8.5" x 11")
    } else if (pdfFormat === "single") {
      // Single page - use A4 width but calculate height to fit all content
      // First, calculate how tall the page needs to be
      const margin = 5; // 5mm margins
      const topBottomSpacing = 15; // 15mm spacing on top and bottom
      const a4Width = 210; // A4 width in mm
      const maxWidth = a4Width - 2 * margin;

      // Scale to fit width (like A4 does)
      const scale = maxWidth / canvas.width;
      const scaledHeight = canvas.height * scale;

      // Calculate required page height
      const requiredHeight = scaledHeight + 2 * margin + 2 * topBottomSpacing;

      // Use A4 width and calculated height
      pdfFormatOption = [a4Width, requiredHeight];
    } else {
      pdfFormatOption = "a4"; // Default to A4
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: pdfFormatOption,
    });

    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Handle single page format differently
    if (pdfFormat === "single") {
      // Single page - use full width like A4, fit all content on one tall page
      const imgData = canvas.toDataURL("image/png");

      // Use margins for single page
      const margin = 5; // 5mm margins
      const topBottomSpacing = 15; // 15mm spacing on top and bottom
      const maxWidth = pdfPageWidth - 2 * margin;

      // Scale to fit width (same as A4 format)
      const scale = maxWidth / imgWidth;
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      // Position at top with margins
      const x = margin;
      const y = margin + topBottomSpacing;

      pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight);

      // Add page number
      pdf.setFontSize(10);
      pdf.setTextColor(128);
      pdf.text("1/1", pdfPageWidth - margin, pdfPageHeight - 10, {
        align: "right",
      });
    } else {
      // A4 or Letter - use pagination
      // Calculate the width to fit on page (with minimal margins and top/bottom spacing)
      const margin = 5; // 5mm side margins
      const topBottomSpacing = 15; // 15mm spacing on top and bottom
      const maxWidth = pdfPageWidth - 2 * margin;
      const maxHeight = pdfPageHeight - 2 * margin - 2 * topBottomSpacing;

      // Calculate scaling to fit width
      const scale = maxWidth / imgWidth;
      const scaledHeight = imgHeight * scale;

      // Calculate how many pages we need
      const pagesNeeded = Math.ceil(scaledHeight / maxHeight);

      if (pagesNeeded === 1) {
        // Single page - fit the image with top/bottom spacing
        const finalWidth = imgWidth * scale;
        const finalHeight = imgHeight * scale;
        const imgData = canvas.toDataURL("image/png");

        pdf.addImage(
          imgData,
          "PNG",
          margin,
          margin + topBottomSpacing,
          finalWidth,
          finalHeight,
        );
      } else {
        // Multiple pages - split the canvas without overlap to prevent duplication
        const pageHeight = maxHeight / scale; // Height in pixels per page

        for (let pageNum = 0; pageNum < pagesNeeded; pageNum++) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          // Calculate source position - no overlap to prevent duplication
          const sourceY = pageNum * pageHeight;
          const sourceHeight = Math.min(pageHeight, imgHeight - sourceY);

          // Ensure we don't go beyond canvas bounds
          if (sourceY >= imgHeight) break;

          // Create a temporary canvas for this page slice
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext("2d");

          if (ctx) {
            // Draw the slice of the original canvas
            ctx.drawImage(
              canvas,
              0,
              sourceY,
              imgWidth,
              sourceHeight,
              0,
              0,
              imgWidth,
              sourceHeight,
            );

            const pageImgData = pageCanvas.toDataURL("image/png");
            const finalWidth = imgWidth * scale;
            const finalHeight = sourceHeight * scale;

            // Add image with top spacing
            pdf.addImage(
              pageImgData,
              "PNG",
              margin,
              margin + topBottomSpacing,
              finalWidth,
              finalHeight,
            );
          }
        }

        // Add page numbers in right bottom corner (format: 1/9)
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(10);
          pdf.setTextColor(128);
          pdf.text(
            `${i}/${totalPages}`,
            pdfPageWidth - margin, // Right side
            pdfPageHeight - 10, // Bottom
            { align: "right" },
          );
        }
      }
    }

    // Download PDF directly using chrome.downloads API to avoid message size limits
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    // Generate filename with platform name and application name
    const appName = "AI-Chat-Export";
    const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
    const filename = `${appName}-${platformLabel}-${timestamp}.pdf`;

    // Use browser downloads API to download the file
    if (browserAPI.downloads) {
      downloadsDownload({
        url: blobUrl,
        filename: filename,
        saveAs: false,
      })
        .then((downloadId: number) => {
          // Clean up blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        })
        .catch((error: any) => {
          console.error("Download error:", error);
          // Fallback to manual download if browser downloads API fails
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        });
    } else {
      // Fallback to manual download if browser downloads API is not available
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    }
  } finally {
    // Clean up
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    // Remove style element
    const styleEl = document.querySelector("style[data-pdf-export]");
    if (styleEl) {
      document.head.removeChild(styleEl);
    }
  }
}

// Create HTML template with specified styling
function createHTMLTemplate(
  messages: Array<{
    role: "user" | "assistant";
    html: string;
    text: string;
    messageId?: string;
    timestamp?: string;
  }>,
  conversationTitle: string = "",
): { styles: string; bodyContent: string } {
  const styles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    .pdf-container {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 30px 15px;
      max-width: 700px;
      margin: 0 auto;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header .conversation-title {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 0;
    }
    .messages {
      display: flex;
      flex-direction: column;
      gap: 20px;
      align-items: center;
    }
    .message {
      padding: 16px;
      border-radius: 12px;
      max-width: 100%;
      word-wrap: break-word;
    }
    .message.user {
      background-color: #f1f1f1;
      max-width: 90%;
    }
    .message.assistant {
      background-color: #ffffff;
      max-width: 90%;
    }
    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .message-content p {
      margin: 0 0 8px 0;
      line-height: 1.5;
    }
    .message-content p:last-child {
      margin-bottom: 0;
    }
    .message-content br {
      line-height: 1.5;
    }
    .message-content code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    .message-content pre {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
    }
    .message-content pre code {
      background: transparent;
      padding: 0;
    }
    .message-content h1,
    .message-content h2,
    .message-content h3 {
      margin: 12px 0 8px 0;
      font-weight: 600;
    }
    .message-content p {
      margin: 8px 0;
    }
    .message-content ul,
    .message-content ol {
      margin: 8px 0;
      padding-left: 24px;
    }
    .message-content blockquote {
      border-left: 4px solid #d1d5db;
      padding-left: 16px;
      margin: 12px 0;
      color: #4b5563;
    }
    .timestamp {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 8px;
      text-align: right;
    }
  `;

  // Only show conversation title, remove "Gemini Conversation Export" and timestamp
  const header = conversationTitle
    ? `
    <div class="header">
      <div class="conversation-title">${conversationTitle}</div>
    </div>
  `
    : "";

  const messagesHTML = messages
    .map((msg) => {
      // Clean and process HTML content
      let processedHTML = msg.html;

      // Remove all images and image-related elements to avoid CORS and CSP issues
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = processedHTML;

      // Remove all image elements
      tempDiv.querySelectorAll("img").forEach((img) => img.remove());
      tempDiv
        .querySelectorAll("picture")
        .forEach((picture) => picture.remove());
      tempDiv.querySelectorAll("figure").forEach((figure) => {
        // Only remove if it contains images, otherwise keep it
        if (figure.querySelector("img")) {
          figure.remove();
        }
      });

      // Remove script tags to avoid CSP issues
      tempDiv.querySelectorAll("script").forEach((script) => script.remove());
      tempDiv.querySelectorAll("iframe").forEach((iframe) => iframe.remove());
      tempDiv.querySelectorAll("embed").forEach((embed) => embed.remove());
      tempDiv.querySelectorAll("object").forEach((obj) => obj.remove());

      // Remove problematic CSS from inline styles (modern color functions, background images, etc.)
      // Also remove all script-related attributes to prevent CSP violations
      tempDiv.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;

        // Remove all script-related attributes
        const scriptRelatedAttrs = [
          "src",
          "data-src",
          "data-script",
          "data-js",
          "data-module",
          "onload",
          "onerror",
          "onclick",
          "onmouseover",
          "onmouseout",
          "onfocus",
          "onblur",
          "onchange",
          "onsubmit",
          "onreset",
          "onkeydown",
          "onkeyup",
          "onkeypress",
          "onmousedown",
          "onmouseup",
          "data-wli",
          "data-js-module",
          "data-js-component",
        ];

        scriptRelatedAttrs.forEach((attr) => {
          if (htmlEl.hasAttribute(attr)) {
            htmlEl.removeAttribute(attr);
          }
        });

        // Remove data attributes that contain script references
        Array.from(htmlEl.attributes).forEach((attr) => {
          if (
            attr.name.startsWith("data-") &&
            (attr.value.includes("script") ||
              attr.value.includes("gstatic.com") ||
              attr.value.includes("js/") ||
              attr.value.includes(".js") ||
              attr.value.includes("boq-bard-web"))
          ) {
            htmlEl.removeAttribute(attr.name);
          }
        });

        if (htmlEl.style) {
          // Remove background-image
          if (
            htmlEl.style.backgroundImage &&
            htmlEl.style.backgroundImage !== "none"
          ) {
            htmlEl.style.backgroundImage = "none";
          }

          // Remove problematic color functions (html2canvas doesn't support modern CSS color functions)
          const styleText = htmlEl.getAttribute("style") || "";
          if (
            styleText.includes("color(") ||
            styleText.includes("color-mix(")
          ) {
            // Remove color-related properties that use modern functions
            const cleanedStyle = styleText
              .split(";")
              .filter((prop) => {
                const lowerProp = prop.toLowerCase().trim();
                return (
                  !lowerProp.includes("color(") &&
                  !lowerProp.includes("color-mix(")
                );
              })
              .join(";");
            htmlEl.setAttribute("style", cleanedStyle);
          }
        }
      });

      processedHTML = tempDiv.innerHTML;

      // AGGRESSIVE sanitization: Remove ALL script-related content from HTML string
      // This must be done at the string level before html2canvas processes it

      // Remove all script tags (including those with attributes)
      processedHTML = processedHTML.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );

      // Remove all event handlers (onclick, onload, etc.)
      processedHTML = processedHTML.replace(
        /\s+on\w+\s*=\s*["'][^"']*["']/gi,
        "",
      );

      // Remove all src attributes pointing to scripts, CDNs, or external URLs
      // Only match actual URLs or script file patterns
      processedHTML = processedHTML.replace(
        /\s+src\s*=\s*["'](?:https?:\/\/[^"']*(?:gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net|pdfobject)[^"']*|.*\.js[^"']*|.*script[^"']*|.*boq-bard[^"']*)["']/gi,
        "",
      );

      // Remove all data-src attributes with script references or CDN URLs
      // Only match actual URLs or script file patterns
      processedHTML = processedHTML.replace(
        /\s+data-src\s*=\s*["'](?:https?:\/\/[^"']*(?:gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net|pdfobject)[^"']*|.*\.js[^"']*|.*script[^"']*|.*boq-bard[^"']*)["']/gi,
        "",
      );

      // Remove data-wli attributes (Gemini script loading mechanism)
      processedHTML = processedHTML.replace(
        /\s+data-wli\s*=\s*["'][^"']*["']/gi,
        "",
      );

      // Remove ALL data attributes that contain script references or CDN URLs
      // Only match URLs (http/https) or script file patterns, not plain text
      processedHTML = processedHTML.replace(
        /\s+data-[^=]*\s*=\s*["'](?:https?:\/\/[^"']*(?:gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net|pdfobject)[^"']*|.*\.js[^"']*|.*script[^"']*|.*boq-bard[^"']*|.*BardChatUi[^"']*|.*wli[^"']*)["']/gi,
        "",
      );

      // Remove data-js, data-module, data-script, data-js-module, data-js-component attributes
      processedHTML = processedHTML.replace(
        /\s+data-(?:js|module|script|js-module|js-component)[^=]*\s*=\s*["'][^"']*["']/gi,
        "",
      );

      // Remove any attributes containing "boq-bard-web" or "BardChatUi"
      processedHTML = processedHTML.replace(
        /\s+[^=]*\s*=\s*["'][^"']*(?:boq-bard-web|BardChatUi)[^"']*["']/gi,
        "",
      );

      // Remove iframe, embed, object tags completely
      processedHTML = processedHTML.replace(
        /<(?:iframe|embed|object)\b[^<]*(?:(?!<\/(?:iframe|embed|object)>)<[^<]*)*<\/(?:iframe|embed|object)>/gi,
        "",
      );

      // Final pass: Remove any remaining script-like patterns and CDN URLs
      processedHTML = processedHTML.replace(
        /https?:\/\/[^"'\s]*(?:gstatic\.com|cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net)[^"'\s]*/gi,
        "",
      );

      // Remove pdfobject URLs specifically (only actual URLs, not text mentions)
      processedHTML = processedHTML.replace(
        /https?:\/\/[^"'\s]*pdfobject[^"'\s]*\.js[^"'\s]*/gi,
        "",
      );

      // Preserve markdown formatting
      // Convert code blocks if needed
      processedHTML = processedHTML.replace(/<pre><code>/g, "<pre><code>");

      // Timestamps removed as per user request
      return `
        <div class="message ${msg.role}">
          <div class="message-content">${processedHTML}</div>
        </div>
      `;
    })
    .join("");

  const bodyContent = `
    <div class="pdf-container">
      ${header}
      <div class="messages">
        ${messagesHTML}
      </div>
    </div>
  `;

  return { styles, bodyContent };
}

function formatAsPdf(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Add title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Chat Conversation", margin, yPosition);
  yPosition += 10;

  // Add export date
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Exported on ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 15;

  // Add messages
  doc.setFont("helvetica", "normal");
  messages.forEach((msg, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Add separator line (except before first message)
    if (index > 0) {
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
      yPosition += 10;
    }

    // Add role label
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const roleLabel = msg.role === "user" ? "User" : "Assistant";
    doc.text(roleLabel, margin, yPosition);
    yPosition += 8;

    // Add message content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Split content into lines that fit the page width
    const lines = doc.splitTextToSize(msg.content, maxWidth);

    lines.forEach((line: string) => {
      // Check if we need a new page for this line
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 5; // Add spacing after each message
  });

  // Return PDF as base64 string
  return doc.output("datauristring");
}

// Initialize React app (after message listener is set up)
const init = () => {
  try {
    console.log("[AI Extension] Initializing content script...");
    console.log("[AI Extension] Browser API available:", !!browserAPI);
    console.log("[AI Extension] Browser API runtime:", !!browserAPI?.runtime);
    mountExtensionApp();
    startMountWatcher();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error("[AI Extension] Error initializing extension:", errorMessage);
    if (errorStack) {
      console.error("[AI Extension] Error details:", errorStack);
    }
  }
};

// Additional logging after imports
console.log("[AI Extension] All imports completed");
console.log("[AI Extension] browserAPI available:", !!browserAPI);
console.log("[AI Extension] browserAPI.runtime:", !!browserAPI?.runtime);

if (document.readyState === "loading") {
  console.log("[AI Extension] Waiting for DOMContentLoaded...");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[AI Extension] DOMContentLoaded fired, initializing...");
    init();
  });
} else {
  console.log("[AI Extension] DOM already loaded, initializing with delay...");
  setTimeout(() => {
    init();
  }, 500);
}
