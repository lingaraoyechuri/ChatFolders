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
  font-size: 14px;
  font-family: ui-sans-serif, sans-serif;
  margin: 8px 0;
  border-bottom: 1px solid #333;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* Limit to 2 lines */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: ${(props) => (props.isDisabled ? "not-allowed" : "pointer")};
  transition: background-color 0.2s ease;
  opacity: ${(props) => (props.isDisabled ? 0.5 : 1)};

  &:hover {
    background-color: ${(props) =>
      props.isDisabled ? "transparent" : "rgba(255, 255, 255, 0.1)"};
  }

  &:last-child {
    border-bottom: none;
  }
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

  const handleQuestionClick = (question: string) => {
    if (onQuestionClick) {
      onQuestionClick(question);
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
                {question}
              </QuestionItem>
            ))}
          </QuestionList>
        </Card>
      )}
    </>
  );
};
