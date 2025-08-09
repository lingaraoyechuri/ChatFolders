import React from "react";
import styled from "styled-components";
import { useSubscriptionStore } from "../store/subscriptionStore";

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

const ProBadge = styled.span`
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  color: white;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const QuestionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const QuestionItem = styled.li<{ isDisabled?: boolean }>`
  color: ${(props) => (props.isDisabled ? "#666666" : "#e0e0e0")};
  font-size: 14px;
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

const UpgradePrompt = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  padding: 12px;
  margin-top: 12px;
  text-align: center;
`;

const UpgradeText = styled.p`
  color: #3b82f6;
  font-size: 12px;
  margin: 0 0 8px 0;
`;

const UpgradeButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: #2563eb;
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
  const { checkFeatureAccess } = useSubscriptionStore();
  const hasProAccess = checkFeatureAccess("prioritySupport");

  const handleQuestionClick = (question: string) => {
    if (onQuestionClick) {
      onQuestionClick(question);
    }
  };

  const handleUpgradeClick = () => {
    // Dispatch event to show subscription modal
    window.dispatchEvent(
      new CustomEvent("showSubscriptionModal", {
        detail: { trigger: "feature-gated" },
      })
    );
  };

  return (
    <Card>
      <Header>
        <Title>Questions</Title>
        <ProBadge>PRO</ProBadge>
      </Header>

      <QuestionList>
        {questions.map((question, index) => (
          <QuestionItem
            key={index}
            isDisabled={!hasProAccess}
            onClick={() => hasProAccess && handleQuestionClick(question)}
          >
            {question}
          </QuestionItem>
        ))}
      </QuestionList>

      {!hasProAccess && (
        <UpgradePrompt>
          <UpgradeText>
            Upgrade to Pro to navigate through questions
          </UpgradeText>
          <UpgradeButton onClick={handleUpgradeClick}>
            Upgrade to Pro
          </UpgradeButton>
        </UpgradePrompt>
      )}
    </Card>
  );
};
