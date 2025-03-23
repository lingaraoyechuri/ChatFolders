import React from "react";
import styled from "styled-components";

const Button = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1a1a1a;
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
    background: #2a2a2a;
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
    <Button onClick={onToggle}>
      {showQuestions ? "Hide Questions" : "Show Questions"}
    </Button>
  );
};
