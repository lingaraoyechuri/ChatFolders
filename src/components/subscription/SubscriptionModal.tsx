import React, { useState } from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { useAuthStore } from "../../store/authStore";
import { SUBSCRIPTION_PLANS } from "../../config/subscriptionPlans";
import { SubscriptionPlan } from "../../types/subscription";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "upgrade" | "limit-reached" | "feature-gated";
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999999;
  pointer-events: auto;
  padding: 20px;
`;

const ModalContent = styled.div`
  background-color: #ffffff;
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 1000000;
  pointer-events: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const ModalTitle = styled.h2`
  font-size: 28px;
  font-weight: bold;
  color: #111827;
  margin: 0 0 8px 0;
`;

const ModalSubtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: color 0.2s ease;

  &:hover {
    color: #6b7280;
  }
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const PlanCard = styled.div<{ isPopular?: boolean; isCurrent?: boolean }>`
  border: 2px solid
    ${(props) =>
      props.isPopular ? "#3b82f6" : props.isCurrent ? "#10b981" : "#e5e7eb"};
  border-radius: 12px;
  padding: 24px;
  position: relative;
  background-color: ${(props) => (props.isPopular ? "#f8fafc" : "#ffffff")};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }
`;

const PopularBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const CurrentBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #10b981;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const PlanName = styled.h3`
  font-size: 20px;
  font-weight: bold;
  color: #111827;
  margin: 0 0 8px 0;
  text-align: center;
`;

const PlanPrice = styled.div`
  text-align: center;
  margin-bottom: 16px;
`;

const PriceAmount = styled.span`
  font-size: 32px;
  font-weight: bold;
  color: #111827;
`;

const PriceInterval = styled.span`
  font-size: 16px;
  color: #6b7280;
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #374151;

  &:before {
    content: "✓";
    color: #10b981;
    font-weight: bold;
    margin-right: 8px;
  }
`;

const PlanButton = styled.button<{ isCurrent?: boolean; isLoading?: boolean }>`
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: ${(props) =>
    props.isCurrent || props.isLoading ? "not-allowed" : "pointer"};
  transition: all 0.2s ease;
  background-color: ${(props) => {
    if (props.isCurrent) return "#10b981";
    if (props.isLoading) return "#9ca3af";
    return "#3b82f6";
  }};
  color: white;

  &:hover:not(:disabled) {
    background-color: ${(props) => {
      if (props.isCurrent) return "#059669";
      return "#2563eb";
    }};
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const UsageInfo = styled.div`
  background-color: #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const UsageTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
`;

const UsageText = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin-right: 8px;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  trigger = "upgrade",
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentPlan,
    usageMetrics,
    createCheckoutSession,
    checkUsageLimits,
    error,
  } = useSubscriptionStore();

  const { user } = useAuthStore();

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan || !user) return;

    try {
      setIsLoading(true);
      const checkoutUrl = await createCheckoutSession(selectedPlan);

      // Open Stripe checkout in new window
      window.open(checkoutUrl, "_blank");

      // Close modal after successful checkout session creation
      onClose();
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case "limit-reached":
        return "You've reached your plan limits. Upgrade to continue creating folders and adding chats.";
      case "feature-gated":
        return "This feature requires a premium plan. Upgrade to unlock advanced features.";
      default:
        return "Choose the perfect plan for your needs and unlock powerful features.";
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrent = currentPlan?.id === plan.id;
    const isPopular = plan.id === "paid"; // Changed from "pro" to "paid"
    const { canCreateFolder, canAddChat } = checkUsageLimits();

    return (
      <PlanCard key={plan.id} isPopular={isPopular} isCurrent={isCurrent}>
        {isPopular && <PopularBadge>Most Popular</PopularBadge>}
        {isCurrent && <CurrentBadge>Current Plan</CurrentBadge>}

        <PlanName>{plan.name}</PlanName>

        <PlanPrice>
          <PriceAmount>${plan.price}</PriceAmount>
          <PriceInterval>/{plan.interval}</PriceInterval>
        </PlanPrice>

        <PlanFeatures>
          {plan.features.map((feature, index) => (
            <FeatureItem key={index}>{feature}</FeatureItem>
          ))}
        </PlanFeatures>

        <PlanButton
          isCurrent={isCurrent}
          isLoading={isLoading && selectedPlan === plan.id}
          disabled={isCurrent || (isLoading && selectedPlan === plan.id)}
          onClick={() => {
            if (!isCurrent) {
              handlePlanSelect(plan.id);
              handleUpgrade();
            }
          }}
        >
          {isLoading && selectedPlan === plan.id ? (
            <>
              <LoadingSpinner />
              Processing...
            </>
          ) : isCurrent ? (
            "Current Plan"
          ) : plan.price === 0 ? (
            "Get Started"
          ) : (
            "Upgrade"
          )}
        </PlanButton>
      </PlanCard>
    );
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <CloseButton onClick={onClose}>
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </CloseButton>

        <ModalHeader>
          <ModalTitle>Choose Your Plan</ModalTitle>
          <ModalSubtitle>{getTriggerMessage()}</ModalSubtitle>
        </ModalHeader>

        {usageMetrics && (
          <UsageInfo>
            <UsageTitle>Current Usage</UsageTitle>
            <UsageText>
              {usageMetrics.foldersCount} folders •{" "}
              {usageMetrics.totalChatsCount} total chats
            </UsageText>
          </UsageInfo>
        )}

        <PlansGrid>
          {Object.values(SUBSCRIPTION_PLANS).map(renderPlanCard)}
        </PlansGrid>

        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "12px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              marginTop: "16px",
            }}
          >
            {error}
          </div>
        )}
      </ModalContent>
    </ModalOverlay>
  );

  return createPortal(modalContent, document.body);
};
