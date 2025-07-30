import React from "react";
import styled from "styled-components";

const Button = styled.button<{ isActive: boolean }>`
  position: fixed;
  top: 100px;
  right: 20px;
  background: ${(props) => (props.isActive ? "#3b82f6" : "#1a1a1a")};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  z-index: 10000;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;

  &:hover {
    background: ${(props) => (props.isActive ? "#2563eb" : "#2a2a2a")};
  }
`;

interface QuestionsToggleButtonProps {
  showQuestions: boolean;
  onToggle: () => void;
}

export const QuestionsToggleButton: React.FC<QuestionsToggleButtonProps> = ({
  showQuestions,
  onToggle,
}) => {
  return (
    <Button
      onClick={onToggle}
      className="questions-toggle-button"
      isActive={showQuestions}
    >
      Prompts
    </Button>
  );
};
