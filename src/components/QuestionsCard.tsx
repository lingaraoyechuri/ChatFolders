import React from "react";
import styled from "styled-components";

const Card = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  width: 300px;
  max-height: 400px;
  background: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 10000;
  overflow-y: auto;
  pointer-events: auto;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  color: #ffffff;
  font-size: 16px;
`;

const QuestionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const QuestionItem = styled.li`
  color: #e0e0e0;
  font-size: 14px;
  padding: 8px 0;
  border-bottom: 1px solid #333;

  &:last-child {
    border-bottom: none;
  }
`;

interface QuestionsCardProps {
  questions: string[];
}

export const QuestionsCard: React.FC<QuestionsCardProps> = ({ questions }) => {
  return (
    <Card>
      <Title>Questions</Title>
      <QuestionList>
        {questions.map((question, index) => (
          <QuestionItem key={index}>{question}</QuestionItem>
        ))}
      </QuestionList>
    </Card>
  );
};
