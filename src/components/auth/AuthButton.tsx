import React, { useState } from "react";
import styled from "styled-components";
import { useAuthStore } from "../../store/authStore";
import { useSidePanelStore } from "../../store/sidePanelStore";
import { useSubscriptionStore } from "../../store/subscriptionStore";

interface AuthButtonProps {
  onShowAuthModal: () => void;
}

const Container = styled.div`
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 99999;
  pointer-events: auto;
  user-select: none;
  isolation: isolate;
`;

const ButtonWrapper = styled.div`
  position: relative;
`;

const StatusIndicator = styled.div<{ color: string }>`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => props.color};
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`;

const AuthButtonElement = styled.button`
  background-color: #ffffff;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 6px 12px; /* Reduced padding for smaller button */
  display: flex;
  align-items: center;
  gap: 6px; /* Reduced gap */
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
  user-select: none;
  position: relative;
  z-index: 2;
  min-width: 80px; /* Reduced width for smaller button */
  min-height: 32px; /* Reduced height for smaller button */

  &:hover {
    background-color: #f9fafb;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
`;

const Avatar = styled.div`
  width: 20px; /* Reduced from 24px */
  height: 20px; /* Reduced from 24px */
  background-color: #dbeafe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AuthenticatedAvatar = styled.div`
  width: 32px;
  height: 32px;
  background-color: #dbeafe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const AvatarText = styled.span`
  color: #2563eb;
  font-size: 10px; /* Reduced from 12px */
  font-weight: 500;
`;

const AuthenticatedAvatarText = styled.span`
  color: #2563eb;
  font-size: 14px;
  font-weight: 500;
`;

const DropdownIcon = styled.svg<{ isOpen: boolean }>`
  width: 16px;
  height: 16px;
  color: #9ca3af;
  transition: transform 0.2s ease;
  transform: ${(props) => (props.isOpen ? "rotate(180deg)" : "rotate(0deg)")};
`;

const SignInIcon = styled.svg`
  width: 20px;
  height: 20px;
  color: #4b5563;
`;

const SignInText = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

const Dropdown = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  width: 256px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const DropdownHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
`;

const DropdownTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin: 0;
`;

const DropdownSubtitle = styled.p`
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0 0;
`;

const DropdownContent = styled.div`
  padding: 8px;
`;

const DropdownItem = styled.button<{ disabled?: boolean }>`
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 14px;
  color: #374151;
  background-color: transparent;
  border: none;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #f9fafb;
  }
`;

const LogoutButton = styled(DropdownItem)`
  color: #dc2626;

  &:hover:not(:disabled) {
    background-color: #fef2f2;
  }
`;

const UpgradeButton = styled(DropdownItem)`
  background-color: #3b82f6;
  color: white;
  border-radius: 6px;
  margin-top: 8px;

  &:hover {
    background-color: #2563eb;
  }
`;

const DropdownIconSmall = styled.svg`
  width: 16px;
  height: 16px;
`;

export const AuthButton: React.FC<AuthButtonProps> = ({ onShowAuthModal }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { currentPlan } = useSubscriptionStore();

  console.log("AuthButton: Component rendered", { isAuthenticated, user });

  const getStatusColor = () => {
    if (!isAuthenticated) return "#6B7280"; // gray-500
    return "#10B981"; // green-500 - always synced when authenticated
  };

  const getStatusTooltip = () => {
    if (!isAuthenticated) return "Sign in to enable cloud storage";
    return "Cloud storage synced";
  };

  const handleAuthClick = () => {
    console.log("AuthButton: handleAuthClick called", { isAuthenticated });
    if (isAuthenticated) {
      setShowDropdown(!showDropdown);
    } else {
      onShowAuthModal();
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element;
        if (!target.closest(".auth-button-container")) {
          setShowDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // Debug: Check button visibility and positioning
  React.useEffect(() => {
    const buttonElement = document.querySelector(".auth-button-main");
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      console.log("AuthButton: Button element found", {
        visible: rect.width > 0 && rect.height > 0,
        position: { x: rect.x, y: rect.y },
        size: { width: rect.width, height: rect.height },
        zIndex: window.getComputedStyle(buttonElement).zIndex,
        computedStyle: window.getComputedStyle(buttonElement),
      });
    } else {
      console.log("AuthButton: Button element not found");
    }
  }, []);

  return (
    <Container className="auth-button-container">
      <ButtonWrapper>
        <StatusIndicator color={getStatusColor()} title={getStatusTooltip()} />

        {isAuthenticated ? (
          <AuthenticatedAvatar
            onClick={handleAuthClick}
            title={`Signed in as ${user?.email} - Click for options`}
          >
            <AuthenticatedAvatarText>
              {user?.email?.charAt(0).toUpperCase()}
            </AuthenticatedAvatarText>
          </AuthenticatedAvatar>
        ) : (
          <AuthButtonElement
            className="auth-button-main"
            onClick={handleAuthClick}
            onMouseDown={(e) => {
              console.log("AuthButton: mouseDown event fired");
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              console.log("AuthButton: mouseUp event fired");
              e.stopPropagation();
            }}
            title="Sign in to enable cloud storage"
          >
            <SignInIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </SignInIcon>
            <SignInText>Sign In</SignInText>
          </AuthButtonElement>
        )}

        {showDropdown && isAuthenticated && (
          <Dropdown>
            <DropdownHeader>
              <DropdownTitle>{user?.email}</DropdownTitle>
              <DropdownSubtitle>Cloud storage enabled</DropdownSubtitle>
            </DropdownHeader>

            <DropdownContent>
              {currentPlan?.priority === "free" && (
                <UpgradeButton
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("showSubscriptionModal", {
                        detail: { trigger: "upgrade" },
                      })
                    );
                    setShowDropdown(false);
                  }}
                >
                  <DropdownIconSmall
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </DropdownIconSmall>
                  <span>Upgrade Plan</span>
                </UpgradeButton>
              )}

              <LogoutButton onClick={handleLogout}>
                <DropdownIconSmall
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </DropdownIconSmall>
                <span>Sign Out</span>
              </LogoutButton>
            </DropdownContent>
          </Dropdown>
        )}
      </ButtonWrapper>
    </Container>
  );
};
