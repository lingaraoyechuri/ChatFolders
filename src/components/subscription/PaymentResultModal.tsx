import React from "react";
import styled from "styled-components";

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const Icon = styled.div<{ type: "success" | "error" | "loading" }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.5rem;
  background: ${({ type }) => {
    switch (type) {
      case "success":
        return "#4ade80";
      case "error":
        return "#f87171";
      case "loading":
        return "#3b82f6";
    }
  }};
  color: white;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
`;

const Message = styled.p`
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const Button = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }

  &.secondary {
    background: #6b7280;
    margin-left: 0.5rem;

    &:hover {
      background: #4b5563;
    }
  }
`;

const LoadingSpinner = styled.div`
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  margin: 0 auto;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

interface PaymentResultModalProps {
  type: "success" | "error" | "loading";
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  planType?: "free" | "paid";
  checkoutUrl?: string; // Add checkout URL for manual opening
}

const PaymentResultModal: React.FC<PaymentResultModalProps> = ({
  type,
  title,
  message,
  onClose,
  onRetry,
  planType,
  checkoutUrl,
}) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "loading":
        return <LoadingSpinner />;
    }
  };

  const handleManualOpen = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Icon type={type}>{getIcon()}</Icon>

        <Title>{title}</Title>
        <Message>{message}</Message>

        <div>
          <Button onClick={onClose}>
            {type === "loading" ? "Cancel" : "Continue"}
          </Button>
          {type === "error" && onRetry && (
            <Button className="secondary" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {type === "success" && checkoutUrl && (
            <Button className="secondary" onClick={handleManualOpen}>
              Open Checkout
            </Button>
          )}
        </div>
      </ModalContent>
    </ModalOverlay>
  );
};

export default PaymentResultModal;
