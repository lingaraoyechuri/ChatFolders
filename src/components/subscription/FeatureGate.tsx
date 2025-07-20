import React from "react";
import styled from "styled-components";
import { useSubscriptionStore } from "../../store/subscriptionStore";

interface FeatureGateProps {
  feature:
    | "cloudStorage"
    | "exportFeatures"
    | "advancedAnalytics"
    | "prioritySupport";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

const UpgradePrompt = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 16px;
  color: white;
  text-align: center;
  margin: 8px 0;
`;

const UpgradeTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const UpgradeText = styled.p`
  font-size: 14px;
  margin: 0 0 12px 0;
  opacity: 0.9;
`;

const UpgradeButton = styled.button`
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const FeatureLocked = styled.div`
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  color: #6b7280;
`;

const LockIcon = styled.div`
  font-size: 24px;
  margin-bottom: 8px;
`;

const LockedTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
`;

const LockedText = styled.p`
  font-size: 14px;
  margin: 0 0 12px 0;
`;

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}) => {
  const { checkFeatureAccess, isFeatureGated } = useSubscriptionStore();

  const hasAccess = checkFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePrompt>
        <UpgradeTitle>Upgrade Required</UpgradeTitle>
        <UpgradeText>
          This feature is available with premium plans. Upgrade to unlock{" "}
          {feature.replace(/([A-Z])/g, " $1").toLowerCase()}.
        </UpgradeText>
        <UpgradeButton
          onClick={() => {
            // This will be handled by the parent component
            // You can emit a custom event or use a callback
            window.dispatchEvent(
              new CustomEvent("showSubscriptionModal", {
                detail: { trigger: "feature-gated" },
              })
            );
          }}
        >
          View Plans
        </UpgradeButton>
      </UpgradePrompt>
    );
  }

  return (
    <FeatureLocked>
      <LockIcon>🔒</LockIcon>
      <LockedTitle>Feature Locked</LockedTitle>
      <LockedText>This feature requires a premium subscription.</LockedText>
    </FeatureLocked>
  );
};
