import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import styled from "styled-components";
import browserAPI, { tabsQuery, tabsSendMessage } from "../utils/browser";
import { PRODUCT_INDEX_SHOWCASE_URL } from "../utils/constants";

// Styled Components
const PopupContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 420px;
  min-height: 500px;
  background: #ffffff;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Logo = styled.div`
  width: 32px;
  height: 32px;
  border: 2px dashed #fbbf24;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef3c7;
  color: #1a1a1a;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const AppName = styled.h1`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;
  margin: 0;
`;

const SignInButton = styled.button`
  padding: 8px 16px;
  border: none;
  background: #1a1a1a;
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    background: linear-gradient(90deg, #2563eb 60%, #1e40af 100%);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 24px 20px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f5f5f5;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;

    &:hover {
      background: #9ca3af;
    }
  }
`;

const Section = styled.section`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionLabel = styled.h2`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  margin: 0 0 16px 0;
`;

const ContentCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
`;

const PlatformIcon = styled.div<{ $platform?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  color: #ffffff;

  ${(props) => {
    switch (props.$platform) {
      case "gemini":
        return "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);";
      case "chatgpt":
        return "background: linear-gradient(135deg, #10a37f 0%, #1a7f64 100%);";
      case "claude":
        return "background: linear-gradient(135deg, #d97706 0%, #b45309 100%);";
      case "perplexity":
        return "background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);";
      default:
        return "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);";
    }
  }}

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ContentTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  flex: 1;
  margin: 0;
`;

const ContentLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #2563eb;
  }
`;

const OperateButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    background: linear-gradient(90deg, #2563eb 60%, #1e40af 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    background: linear-gradient(90deg, #2563eb 60%, #1e40af 100%);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PremiumButton = styled(PrimaryButton)<{ disabled?: boolean }>`
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Notification = styled.div<{ $show: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1a1a1a;
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  font-size: 14px;
  font-weight: 500;
  opacity: ${(props) => (props.$show ? 1 : 0)};
  transform: ${(props) => (props.$show ? "translateX(0)" : "translateX(100%)")};
  transition: all 0.3s ease;
  pointer-events: ${(props) => (props.$show ? "auto" : "none")};
  max-width: 300px;
  text-align: center;
`;

const WarningBanner = styled.div`
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #92400e;
`;

const WarningIcon = styled.div`
  flex-shrink: 0;
  margin-top: 2px;
  svg {
    width: 16px;
    height: 16px;
    stroke: #f59e0b;
    fill: #fef3c7;
  }
`;

const WarningText = styled.span`
  flex: 1;
`;

const Footer = styled.footer`
  padding: 14px 20px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 10px;
  background: #fafafa;
`;

const FooterCaption = styled.p`
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  letter-spacing: 0.01em;
`;

const FooterActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
`;

const ShowcaseFooterLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-decoration: none;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #111827;
  }

  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
`;

const BuyMeCoffeeButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #ffdd00;
  color: #000000;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(255, 221, 0, 0.3);
  border: 1px solid #ffd700;

  &:hover {
    background: #ffd700;
    box-shadow: 0 4px 12px rgba(255, 221, 0, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const DropdownWrapper = styled.div`
  position: relative;
  flex: 1;
`;

const DropdownButton = styled(SecondaryButton)<{ $isOpen: boolean }>`
  background: ${(props) =>
    props.$isOpen
      ? "linear-gradient(90deg, #2563eb 60%, #1e40af 100%)"
      : "#1a1a1a"};
  box-shadow: ${(props) =>
    props.$isOpen
      ? "0 4px 12px rgba(37, 99, 235, 0.3)"
      : "0 2px 8px rgba(0, 0, 0, 0.15)"};
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  transform: ${(props) =>
    props.$isOpen ? "translateY(0)" : "translateY(10px)"};
  visibility: ${(props) => (props.$isOpen ? "visible" : "hidden")};
  transition: all 0.2s ease;
  max-height: ${(props) => (props.$isOpen ? "300px" : "0")};
`;

const DropdownItem = styled.button<{ $isSelected?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  background: ${(props) => (props.$isSelected ? "#f0f7ff" : "#ffffff")};
  color: ${(props) => (props.$isSelected ? "#2563eb" : "#1a1a1a")};
  border: none;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  font-weight: ${(props) => (props.$isSelected ? "600" : "500")};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(props) => (props.$isSelected ? "#e0f2fe" : "#f9fafb")};
    color: ${(props) => (props.$isSelected ? "#1d4ed8" : "#2563eb")};
  }

  &:active {
    background: #f0f7ff;
  }
`;

// New styled components for the revamped section
const InfoCard = styled(ContentCard)`
  padding: 14px;
`;

const SupportedPlatforms = styled.div`
  margin-bottom: 14px;
`;

const PlatformsTitle = styled.h3`
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
`;

const PlatformsList = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const PlatformBadge = styled.div<{ $platform: string }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  background: #1a1a1a;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  cursor: default;

  &:hover {
    background: linear-gradient(90deg, #2563eb 60%, #1e40af 100%);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  }

  svg {
    width: 14px;
    height: 14px;
    color: #ffffff;
  }
`;

const Description = styled.div`
  margin-top: 14px;
`;

const DescriptionText = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
  margin: 0 0 12px 0;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: #374151;
`;

const FeatureIcon = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: #f0f7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: #1a1a1a;

  svg {
    width: 11px;
    height: 11px;
  }
`;

const FeatureText = styled.span`
  flex: 1;
`;

// Types
interface PlatformInfo {
  name: string;
  url: string;
  platform: "gemini" | "chatgpt" | "claude" | "perplexity" | "default";
}

// Icons
const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const LoadingSpinner = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ animation: "spin 1s linear infinite" }}
  >
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

const WarningIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const BuyMeCoffeeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PlatformIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
  </svg>
);

// Feature icons for the info section
const NavigateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

const ExportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ContinueIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// Main Component
const Popup: React.FC = () => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    name: "AI Prompt Navigator",
    url: "",
    platform: "default",
  });
  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("markdown");
  const [pdfFormatDropdownOpen, setPdfFormatDropdownOpen] = useState(false);
  const [selectedPdfFormat, setSelectedPdfFormat] = useState("a4");
  const [isDownloading, setIsDownloading] = useState(false);

  // Format options for the dropdown
  const formatOptions = [
    { value: "markdown", label: "Markdown" },
    { value: "pdf", label: "PDF" },
    { value: "json", label: "JSON" },
    { value: "html", label: "HTML" },
    { value: "text", label: "Text" },
  ];

  // PDF format options
  const pdfFormatOptions = [
    { value: "a4", label: "A4" },
    { value: "letter", label: "Letter" },
    { value: "single", label: "Single Page" },
  ];

  useEffect(() => {
    // Get current tab URL to detect platform
    if (browserAPI?.tabs) {
      tabsQuery({ active: true, currentWindow: true })
        .then((tabs) => {
          if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            updatePlatformInfo(url);
          }
        })
        .catch((error) => {
          console.error("Error querying tabs:", error);
        });
    }
  }, []);

  const updatePlatformInfo = (url: string) => {
    let info: PlatformInfo = {
      name: "AI Prompt Navigator",
      url: url,
      platform: "default",
    };

    if (url.includes("chatgpt.com")) {
      info = {
        name: "ChatGPT - AI Conversation Assistant",
        url: "https://chatgpt.com",
        platform: "chatgpt",
      };
    } else if (url.includes("gemini.google.com")) {
      info = {
        name: "Gemini - Bridging LLM Chat Context Limits",
        url: "https://gemini.google.com",
        platform: "gemini",
      };
    } else if (url.includes("claude.ai")) {
      info = {
        name: "Claude - AI Assistant by Anthropic",
        url: "https://claude.ai",
        platform: "claude",
      };
    } else if (url.includes("perplexity.ai")) {
      info = {
        name: "Perplexity - AI-Powered Search",
        url: "https://www.perplexity.ai",
        platform: "perplexity",
      };
    }

    setPlatformInfo(info);
  };

  const showNotification = (message: string, duration: number = 2000) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: "" });
    }, duration);
  };

  const handleCopyMarkdown = async () => {
    try {
      if (browserAPI?.tabs) {
        const tabs = await tabsQuery({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].id) {
          try {
            const response = await tabsSendMessage(tabs[0].id, {
              action: "copyAsMarkdown",
            });
            if (response && response.success) {
              showNotification("Copied as Markdown!");
            } else {
              const errorMsg =
                response?.error ||
                "Failed to copy. Please try again or reload the page.";
              showNotification(`Error: ${errorMsg}`, 4000);
            }
          } catch (error) {
            console.error("[Popup] Error sending message:", error);
            console.error(
              "[Popup] Error details:",
              error instanceof Error ? error.message : error,
            );
            // Check if it's a "receiving end does not exist" error (content script not loaded)
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              errorMessage.includes("receiving end") ||
              errorMessage.includes("Could not establish connection")
            ) {
              showNotification(
                "Error: Content script not loaded. Please reload the page and try again.",
                5000,
              );
            } else {
              showNotification(
                "Error: Please reload the application and try again",
                4000,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error copying as markdown:", error);
      showNotification(
        "Error: Please reload the application and try again",
        4000,
      );
    }
  };

  const handleDownload = async () => {
    const format = selectedFormat;
    const pdfFormat = selectedPdfFormat; // Include PDF format if PDF is selected

    if (browserAPI?.tabs) {
      setIsDownloading(true);
      try {
        const tabs = await tabsQuery({ active: true, currentWindow: true });

        if (tabs[0] && tabs[0].id) {
          try {
            const response = await tabsSendMessage(tabs[0].id, {
              action: "downloadChat",
              format,
              pdfFormat: format === "pdf" ? pdfFormat : undefined,
            });

            if (response && response.success) {
              // For PDF, the download happens in the content script
              if (format.toLowerCase() === "pdf") {
                showNotification(`Downloaded as ${format.toUpperCase()}!`);
              } else if (response.content) {
                // Download other formats
                downloadFile(response.content, format);
                showNotification(`Downloaded as ${format.toUpperCase()}!`);
              } else {
                showNotification(`Downloaded as ${format.toUpperCase()}!`);
              }
            } else if (response && response.error) {
              showNotification(
                "Error: Please reload the application and try again",
                4000,
              );
            } else {
              showNotification(
                "Error: Please reload the application and try again",
                4000,
              );
            }
          } catch (error) {
            console.error("[Popup] Error sending message:", error);
            console.error(
              "[Popup] Error details:",
              error instanceof Error ? error.message : error,
            );
            // Check if it's a "receiving end does not exist" error (content script not loaded)
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              errorMessage.includes("receiving end") ||
              errorMessage.includes("Could not establish connection")
            ) {
              showNotification(
                "Error: Content script not loaded. Please reload the page and try again.",
                5000,
              );
            } else {
              showNotification(
                "Error: Please reload the application and try again",
                4000,
              );
            }
          }
        }
      } catch (error) {
        console.error("Error downloading:", error);
        showNotification(
          "Error: Please reload the application and try again",
          4000,
        );
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const downloadFile = (content: string, format: string) => {
    let blob: Blob;
    let url: string;

    // Handle PDF format (data URI)
    if (format.toLowerCase() === "pdf" && content.startsWith("data:")) {
      // Convert data URI to blob
      const byteString = atob(content.split(",")[1]);
      const mimeString = content.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: mimeString });
      url = URL.createObjectURL(blob);
    } else {
      // Handle text formats (markdown, json, html, text)
      const mimeType =
        format === "markdown"
          ? "text/markdown"
          : format === "json"
            ? "application/json"
            : format === "html"
              ? "text/html"
              : "text/plain";
      blob = new Blob([content], { type: mimeType });
      url = URL.createObjectURL(blob);
    }

    const a = document.createElement("a");
    a.href = url;

    // Set filename based on format
    const extension = format === "markdown" ? "md" : format;
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    a.download = `chat-export-${timestamp}.${extension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleDropdownClose = () => {
    setDropdownOpen(false);
  };

  const handleFormatSelect = (format: string) => {
    setSelectedFormat(format);
    handleDropdownClose();
  };

  const getSelectedLabel = () => {
    const option = formatOptions.find((opt) => opt.value === selectedFormat);
    return option ? option.label : "Export";
  };

  const getSelectedPdfFormatLabel = () => {
    const option = pdfFormatOptions.find(
      (opt) => opt.value === selectedPdfFormat,
    );
    return option ? option.label : "A4";
  };

  const handlePdfFormatSelect = (format: string) => {
    setSelectedPdfFormat(format);
    setPdfFormatDropdownOpen(false);
  };

  const handlePdfFormatToggle = () => {
    setPdfFormatDropdownOpen(!pdfFormatDropdownOpen);
  };

  const handlePdfFormatClose = () => {
    setPdfFormatDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen && !pdfFormatDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("[data-dropdown-wrapper]") &&
        !target.closest("[data-pdf-format-dropdown-wrapper]")
      ) {
        setDropdownOpen(false);
        setPdfFormatDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen, pdfFormatDropdownOpen]);

  return (
    <PopupContainer>
      <Header>
        <HeaderLeft>
          <AppName>AI Chat Export & Navigator</AppName>
        </HeaderLeft>
      </Header>

      <MainContent>
        <Section>
          <InfoCard>
            <SupportedPlatforms>
              <PlatformsTitle>Supported Platforms</PlatformsTitle>
              <PlatformsList>
                <PlatformBadge $platform="gemini">
                  <span>Gemini</span>
                </PlatformBadge>
                <PlatformBadge $platform="chatgpt">
                  <span>ChatGPT</span>
                </PlatformBadge>
                <PlatformBadge $platform="claude">
                  <span>Claude</span>
                </PlatformBadge>
              </PlatformsList>
            </SupportedPlatforms>

            <Description>
              <FeaturesList>
                <FeatureItem>
                  <FeatureIcon>
                    <NavigateIcon />
                  </FeatureIcon>
                  <FeatureText>Navigate between chats</FeatureText>
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon>
                    <ExportIcon />
                  </FeatureIcon>
                  <FeatureText>
                    Export in Markdown, PDF, JSON, HTML, Text
                  </FeatureText>
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon>
                    <ContinueIcon />
                  </FeatureIcon>
                  <FeatureText>
                    Copy as Markdown to continue context
                  </FeatureText>
                </FeatureItem>
              </FeaturesList>
            </Description>
          </InfoCard>
        </Section>

        <Section>
          {(selectedFormat === "pdf" || selectedFormat === "html") && (
            <WarningBanner>
              <WarningIcon>
                <WarningIconSvg />
              </WarningIcon>
              <WarningText>
                Note: Images are not currently supported in{" "}
                {selectedFormat.toUpperCase()} format exports.
              </WarningText>
            </WarningBanner>
          )}
          <OperateButtons>
            <PrimaryButton type="button" onClick={handleCopyMarkdown}>
              <CopyIcon />
              Copy as Markdown
            </PrimaryButton>

            <ButtonRow>
              <DropdownWrapper data-dropdown-wrapper>
                <DropdownButton
                  type="button"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Export format"
                  $isOpen={dropdownOpen}
                  onClick={handleDropdownToggle}
                >
                  {getSelectedLabel()}
                  <ChevronDownIcon />
                </DropdownButton>
                <DropdownMenu $isOpen={dropdownOpen}>
                  {formatOptions.map((option) => (
                    <DropdownItem
                      key={option.value}
                      $isSelected={selectedFormat === option.value}
                      onClick={() => handleFormatSelect(option.value)}
                    >
                      {option.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </DropdownWrapper>
              {selectedFormat === "pdf" && (
                <DropdownWrapper data-pdf-format-dropdown-wrapper>
                  <DropdownButton
                    type="button"
                    aria-expanded={pdfFormatDropdownOpen}
                    aria-haspopup="listbox"
                    aria-label="PDF page size"
                    $isOpen={pdfFormatDropdownOpen}
                    onClick={handlePdfFormatToggle}
                  >
                    {getSelectedPdfFormatLabel()}
                    <ChevronDownIcon />
                  </DropdownButton>
                  <DropdownMenu $isOpen={pdfFormatDropdownOpen}>
                    {pdfFormatOptions.map((option) => (
                      <DropdownItem
                        key={option.value}
                        $isSelected={selectedPdfFormat === option.value}
                        onClick={() => handlePdfFormatSelect(option.value)}
                      >
                        {option.label}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </DropdownWrapper>
              )}
              <PremiumButton
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? <LoadingSpinner /> : <DownloadIcon />}
              </PremiumButton>
            </ButtonRow>
          </OperateButtons>
        </Section>
      </MainContent>

      <Footer>
        <FooterCaption>Enjoying it?</FooterCaption>
        <FooterActions>
          <BuyMeCoffeeButton
            href="https://buymeacoffee.com/aipromptnavigator"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BuyMeCoffeeIcon />
            Buy me a coffee
          </BuyMeCoffeeButton>
          <ShowcaseFooterLink
            href={PRODUCT_INDEX_SHOWCASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Product Index — my extensions and what’s next"
            aria-label="Open Product Index: more extensions and roadmap"
          >
            All extensions
          </ShowcaseFooterLink>
        </FooterActions>
      </Footer>

      <Notification $show={notification.show}>
        {notification.message}
      </Notification>
    </PopupContainer>
  );
};

// Initialize React app
const init = () => {
  const container = document.getElementById("popup-root");
  if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export default Popup;
