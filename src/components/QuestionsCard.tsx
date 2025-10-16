import React, { useState } from "react";
import styled, { keyframes, css } from "styled-components";

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const Card = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 80px;
  right: 20px;
  width: 300px;
  background: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 10002;
  transition: box-shadow 0.3s;
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
  ${(props) =>
    props.$visible
      ? css`
          animation: ${slideIn} 0.4s cubic-bezier(0.77, 0, 0.175, 1) forwards;
        `
      : css`
          animation: ${slideOut} 0.3s cubic-bezier(0.77, 0, 0.175, 1) forwards;
        `}
`;

const PromptsNavButton = styled.button`
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 10003;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 10px 24px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  letter-spacing: 0.5px;
  outline: none;
  pointer-events: auto;
  &:hover {
    transform: scale(1.07);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
    background: linear-gradient(90deg, #2563eb 60%, #1e40af 100%);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 16px;
`;

const QuestionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 260px;
  overflow-y: auto;
  /* Hide scrollbar for Webkit browsers */
  &::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for Firefox */
  scrollbar-width: none;
`;

const QuestionItem = styled.li<{ isDisabled?: boolean }>`
  color: ${(props) => (props.isDisabled ? "#666666" : "#e0e0e0")};
  font-size: 13px;
  font-family: ui-sans-serif, sans-serif;
  margin: 4px 0;
  border-bottom: 1px solid #333;
  padding: 6px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: ${(props) => (props.isDisabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  opacity: ${(props) => (props.isDisabled ? 0.5 : 1)};
  position: relative;
  min-height: 32px;

  &:hover {
    background-color: ${(props) =>
      props.isDisabled ? "transparent" : "rgba(255, 255, 255, 0.1)"};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const QuestionText = styled.div`
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
`;

const CopyButton = styled.button<{ $copied?: boolean }>`
  background: ${(props) =>
    props.$copied ? "#10b981" : "rgba(255, 255, 255, 0.1)"};
  border: 1px solid
    ${(props) => (props.$copied ? "#10b981" : "rgba(255, 255, 255, 0.2)")};
  color: ${(props) => (props.$copied ? "#ffffff" : "#e0e0e0")};
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  font-size: 11px;
  opacity: 0;
  transform: scale(0.8);

  ${QuestionItem}:hover & {
    opacity: 1;
    transform: scale(1);
  }

  &:hover {
    background: ${(props) =>
      props.$copied ? "#059669" : "rgba(255, 255, 255, 0.2)"};
    border-color: ${(props) =>
      props.$copied ? "#059669" : "rgba(255, 255, 255, 0.3)"};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const CopyIcon = styled.svg<{ $copied?: boolean }>`
  width: 12px;
  height: 12px;
  transition: all 0.2s ease;
  opacity: ${(props) => (props.$copied ? 0 : 1)};
  transform: ${(props) => (props.$copied ? "scale(0)" : "scale(1)")};
`;

const CheckIcon = styled.svg<{ $copied?: boolean }>`
  width: 12px;
  height: 12px;
  position: absolute;
  transition: all 0.2s ease;
  opacity: ${(props) => (props.$copied ? 1 : 0)};
  transform: ${(props) => (props.$copied ? "scale(1)" : "scale(0)")};
`;

interface QuestionsCardProps {
  questions: string[];
  onQuestionClick?: (question: string) => void;
}

export const QuestionsCard: React.FC<QuestionsCardProps> = ({
  questions,
  onQuestionClick,
}) => {
  const [visible, setVisible] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleQuestionClick = (question: string) => {
    if (onQuestionClick) {
      onQuestionClick(question);
    }
  };

  const handleCopyClick = async (
    question: string,
    index: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent triggering the question click

    try {
      await navigator.clipboard.writeText(question);
      setCopiedIndex(index);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = question;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    }
  };

  return (
    <>
      {!visible && (
        <PromptsNavButton onClick={() => setVisible(true)}>
          Prompts Nav
        </PromptsNavButton>
      )}
      {visible && (
        <Card id="questions-card" $visible={visible}>
          <Header>
            <Title>Prompts</Title>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
                marginLeft: 8,
                padding: 0,
              }}
              aria-label="Close"
              onClick={() => setVisible(false)}
            >
              ×
            </button>
          </Header>
          <QuestionList>
            {questions.map((question, index) => (
              <QuestionItem
                key={index}
                onClick={() => handleQuestionClick(question)}
              >
                <QuestionText>{question}</QuestionText>
                <CopyButton
                  $copied={copiedIndex === index}
                  onClick={(e) => handleCopyClick(question, index, e)}
                  title="Copy question"
                >
                  <CopyIcon
                    $copied={copiedIndex === index}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </CopyIcon>
                  <CheckIcon
                    $copied={copiedIndex === index}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </CheckIcon>
                </CopyButton>
              </QuestionItem>
            ))}
          </QuestionList>
        </Card>
      )}
    </>
  );
};
