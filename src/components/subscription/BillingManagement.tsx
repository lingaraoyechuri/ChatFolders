import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { useAuthStore } from "../../store/authStore";
import { subscriptionAPI } from "../../services/api";
import { formatCurrency } from "../../services/stripe";

interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  date: string;
  description: string;
  invoiceUrl?: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BillingContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const BillingHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BillingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
`;

const BillingItemLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BillingItemTitle = styled.div`
  font-weight: 500;
  color: #111827;
`;

const BillingItemDate = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const BillingItemRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BillingAmount = styled.div<{ status: string }>`
  font-weight: 600;
  color: ${(props) => {
    switch (props.status) {
      case "paid":
        return "#059669";
      case "pending":
        return "#d97706";
      case "failed":
        return "#dc2626";
      default:
        return "#111827";
    }
  }};
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  background-color: ${(props) => {
    switch (props.status) {
      case "paid":
        return "#d1fae5";
      case "pending":
        return "#fed7aa";
      case "failed":
        return "#fee2e2";
      default:
        return "#f3f4f6";
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case "paid":
        return "#065f46";
      case "pending":
        return "#92400e";
      case "failed":
        return "#991b1b";
      default:
        return "#374151";
    }
  }};
`;

const PaymentMethodsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PaymentMethodItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
`;

const PaymentMethodInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 24px;
  background-color: #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
`;

const PaymentMethodDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PaymentMethodTitle = styled.div`
  font-weight: 500;
  color: #111827;
`;

const PaymentMethodSubtitle = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const DefaultBadge = styled.span`
  background-color: #dbeafe;
  color: #1e40af;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
`;

const Button = styled.button<{ variant?: "primary" | "secondary" | "danger" }>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  background-color: ${(props) => {
    switch (props.variant) {
      case "primary":
        return "#3b82f6";
      case "secondary":
        return "#6b7280";
      case "danger":
        return "#dc2626";
      default:
        return "#f3f4f6";
    }
  }};
  color: ${(props) => (props.variant ? "white" : "#374151")};

  &:hover {
    background-color: ${(props) => {
      switch (props.variant) {
        case "primary":
          return "#2563eb";
        case "secondary":
          return "#4b5563";
        case "danger":
          return "#b91c1c";
        default:
          return "#e5e7eb";
      }
    }};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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

const ErrorMessage = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
`;

export const BillingManagement: React.FC = () => {
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>(
    []
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { userSubscription, currentPlan } = useSubscriptionStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const [history, methods] = await Promise.all([
        subscriptionAPI.getBillingHistory(),
        subscriptionAPI.getSubscriptionPlans(), // This would need to be updated to get payment methods
      ]);

      setBillingHistory(history as BillingHistoryItem[]);
      setPaymentMethods(methods as PaymentMethod[]);
    } catch (error) {
      console.error("Error loading billing data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load billing data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // This would call your backend API to generate and download the invoice
      console.log("Downloading invoice:", invoiceId);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      setError("Failed to download invoice");
    }
  };

  const handleUpdatePaymentMethod = async (paymentMethodId: string) => {
    try {
      await subscriptionAPI.updatePaymentMethod(paymentMethodId);
      await loadBillingData(); // Refresh data
    } catch (error) {
      console.error("Error updating payment method:", error);
      setError("Failed to update payment method");
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period."
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      // This would be handled by the subscription store
      console.log("Canceling subscription...");
    } catch (error) {
      console.error("Error canceling subscription:", error);
      setError("Failed to cancel subscription");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <BillingContainer>
        <SectionTitle>Billing Management</SectionTitle>
        <p>Please sign in to view your billing information.</p>
      </BillingContainer>
    );
  }

  return (
    <BillingContainer>
      <SectionTitle>Billing Management</SectionTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {/* Current Subscription */}
      <Section>
        <SectionTitle>Current Subscription</SectionTitle>
        {currentPlan && (
          <div>
            <p>
              <strong>Plan:</strong> {currentPlan.name}
            </p>
            <p>
              <strong>Price:</strong>{" "}
              {formatCurrency(currentPlan.price * 100, currentPlan.currency)}/
              {currentPlan.interval}
            </p>
            {userSubscription && (
              <>
                <p>
                  <strong>Status:</strong> {userSubscription.status}
                </p>
                <p>
                  <strong>Next billing:</strong>{" "}
                  {new Date(
                    userSubscription.currentPeriodEnd
                  ).toLocaleDateString()}
                </p>
                {userSubscription.cancelAtPeriodEnd && (
                  <p style={{ color: "#dc2626" }}>
                    <strong>
                      ⚠️ Subscription will be canceled at the end of the current
                      period
                    </strong>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Section>

      {/* Billing History */}
      <Section>
        <SectionTitle>Billing History</SectionTitle>
        {isLoading ? (
          <div>Loading billing history...</div>
        ) : billingHistory.length > 0 ? (
          <BillingHistoryList>
            {billingHistory.map((item) => (
              <BillingItem key={item.id}>
                <BillingItemLeft>
                  <BillingItemTitle>{item.description}</BillingItemTitle>
                  <BillingItemDate>
                    {new Date(item.date).toLocaleDateString()}
                  </BillingItemDate>
                </BillingItemLeft>
                <BillingItemRight>
                  <BillingAmount status={item.status}>
                    {formatCurrency(item.amount, item.currency)}
                  </BillingAmount>
                  <StatusBadge status={item.status}>{item.status}</StatusBadge>
                  {item.invoiceUrl && (
                    <Button onClick={() => handleDownloadInvoice(item.id)}>
                      Download
                    </Button>
                  )}
                </BillingItemRight>
              </BillingItem>
            ))}
          </BillingHistoryList>
        ) : (
          <p>No billing history available.</p>
        )}
      </Section>

      {/* Payment Methods */}
      <Section>
        <SectionTitle>Payment Methods</SectionTitle>
        {isLoading ? (
          <div>Loading payment methods...</div>
        ) : paymentMethods.length > 0 ? (
          <PaymentMethodsList>
            {paymentMethods.map((method) => (
              <PaymentMethodItem key={method.id}>
                <PaymentMethodInfo>
                  <CardIcon>{method.brand}</CardIcon>
                  <PaymentMethodDetails>
                    <PaymentMethodTitle>
                      {method.brand} •••• {method.last4}
                    </PaymentMethodTitle>
                    <PaymentMethodSubtitle>
                      Expires {method.expMonth}/{method.expYear}
                    </PaymentMethodSubtitle>
                  </PaymentMethodDetails>
                  {method.isDefault && <DefaultBadge>Default</DefaultBadge>}
                </PaymentMethodInfo>
                <Button
                  variant="secondary"
                  onClick={() => handleUpdatePaymentMethod(method.id)}
                >
                  Update
                </Button>
              </PaymentMethodItem>
            ))}
          </PaymentMethodsList>
        ) : (
          <p>No payment methods on file.</p>
        )}
      </Section>

      {/* Subscription Actions */}
      <Section>
        <SectionTitle>Subscription Actions</SectionTitle>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button
            variant="danger"
            onClick={handleCancelSubscription}
            disabled={isLoading || !userSubscription}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Processing...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        </div>
      </Section>
    </BillingContainer>
  );
};
