import React, { useState } from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { useAuthStore } from "../../store/authStore";
import { SUBSCRIPTION_PLANS } from "../../config/subscriptionPlans";
import { SubscriptionPlan } from "../../types/subscription";
import PaymentResultModal from "./PaymentResultModal";

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
  max-width: 600px; /* Reduced from 800px for 2 plans */
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
  font-size: 24px; /* Reduced from 28px */
  font-weight: bold;
  color: #111827;
  margin: 0 0 8px 0;
`;

const ModalSubtitle = styled.p`
  font-size: 14px; /* Reduced from 16px */
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
  grid-template-columns: 1fr 1fr; /* Fixed 2-column layout */
  gap: 20px; /* Reduced from 24px */
  margin-bottom: 32px;
`;

const PlanCard = styled.div<{ isPopular?: boolean; isCurrent?: boolean }>`
  border: 2px solid
    ${(props) =>
      props.isPopular ? "#3b82f6" : props.isCurrent ? "#10b981" : "#e5e7eb"};
  border-radius: 12px;
  padding: 20px; /* Reduced from 24px */
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
  trigger = "manual",
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    type: "success" | "error" | "loading";
    title: string;
    message: string;
    checkoutUrl?: string;
  } | null>(null);

  const {
    currentPlan,
    userSubscription,
    usageMetrics,
    createCheckoutSession,
    checkUsageLimits,
    error,
    isLoading,
    initializeSubscription,
  } = useSubscriptionStore();

  const { user } = useAuthStore();

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleManualRefresh = async () => {
    try {
      await initializeSubscription();
      console.log("Manual subscription refresh completed");
    } catch (error) {
      console.error("Manual refresh failed:", error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setPaymentResult({
        type: "loading",
        title: "Processing Payment...",
        message: "Please wait while we set up your subscription.",
      });
      setShowPaymentResult(true);

      const result = await createCheckoutSession(planId);

      if (result === "free_activated") {
        setPaymentResult({
          type: "success",
          title: "Free Plan Activated!",
          message:
            "Your free plan has been activated successfully. You can now use all free features.",
        });
      } else {
        // For paid plans, Stripe checkout opened in new tab
        setPaymentResult({
          type: "success",
          title: "Checkout Opened",
          message:
            "Stripe checkout has been opened in a new tab. Please complete your payment there. If the tab didn't open, please check your popup blocker settings.",
          checkoutUrl: result, // Pass the checkout URL
        });
      }
    } catch (error) {
      let errorMessage = "Failed to process payment. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("Popup blocked")) {
          errorMessage =
            "Popup was blocked. Please allow popups for this site and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setPaymentResult({
        type: "error",
        title: "Payment Failed",
        message: errorMessage,
      });
    }
  };

  const handleClosePaymentResult = () => {
    setShowPaymentResult(false);
    setPaymentResult(null);
    if (paymentResult?.type === "success") {
      onClose(); // Close subscription modal on success
    }
  };

  const handleRetry = () => {
    setShowPaymentResult(false);
    setPaymentResult(null);
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case "limit-reached":
        return "You've reached your free plan limits. Upgrade to Pro for unlimited folders and chats.";
      case "feature-gated":
        return "This feature requires a Pro plan. Upgrade to unlock advanced features.";
      default:
        return "Upgrade to Pro for unlimited folders, chats, and advanced features.";
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrent = currentPlan?.id === plan.id;
    const isPopular = plan.id === "paid";
    const { canCreateFolder, canAddChat } = checkUsageLimits();

    return (
      <PlanCard key={plan.id} isPopular={isPopular} isCurrent={isCurrent}>
        {isPopular && <PopularBadge>Recommended</PopularBadge>}
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
              handleUpgrade(plan.id);
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
            "Free Plan"
          ) : (
            "Upgrade to Pro"
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
      <ModalContent onClick={(e) => e.stopPropagation()}>
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
          <ModalTitle>Upgrade to Pro</ModalTitle>
          <ModalSubtitle>{getTriggerMessage()}</ModalSubtitle>
          <button
            onClick={handleManualRefresh}
            style={{
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            🔄 Refresh Subscription Status
          </button>
        </ModalHeader>

        {usageMetrics && (
          <UsageInfo>
            <UsageTitle>Your Current Usage</UsageTitle>
            <UsageText>
              {usageMetrics.foldersCount} folders •{" "}
              {usageMetrics.totalChatsCount} total chats
              {currentPlan?.priority === "free" && (
                <span style={{ color: "#dc2626", fontWeight: "500" }}>
                  {" "}
                  • Free plan limits reached
                </span>
              )}
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

  return (
    <>
      {createPortal(modalContent, document.body)}

      {/* Payment result modal */}
      {showPaymentResult && paymentResult && (
        <PaymentResultModal
          type={paymentResult.type}
          title={paymentResult.title}
          message={paymentResult.message}
          onClose={handleClosePaymentResult}
          onRetry={paymentResult.type === "error" ? handleRetry : undefined}
          checkoutUrl={paymentResult.checkoutUrl}
        />
      )}
    </>
  );
};
