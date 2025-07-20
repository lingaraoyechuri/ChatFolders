import React, { useState } from "react";
import styled from "styled-components";
import { useAuthStore } from "../../store/authStore";
import { useSidePanelStore } from "../../store/sidePanelStore";

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
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
  user-select: none;
  position: relative;
  z-index: 2;
  min-width: 120px;
  min-height: 40px;

  &:hover {
    background-color: #f9fafb;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
`;

const Avatar = styled.div`
  width: 24px;
  height: 24px;
  background-color: #dbeafe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AvatarText = styled.span`
  color: #2563eb;
  font-size: 12px;
  font-weight: 500;
`;

const UserInfo = styled.div`
  text-align: left;
`;

const UserName = styled.p`
  font-size: 12px;
  font-weight: 500;
  color: #111827;
  margin: 0;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const UserStatus = styled.p`
  font-size: 12px;
  color: #6b7280;
  margin: 0;
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

const DropdownIconSmall = styled.svg`
  width: 16px;
  height: 16px;
`;

export const AuthButton: React.FC<AuthButtonProps> = ({ onShowAuthModal }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    isCloudEnabled,
    syncStatus,
    isOnline,
    enableCloudStorage,
    disableCloudStorage,
  } = useSidePanelStore();

  console.log("AuthButton: Component rendered", { isAuthenticated, user });

  const getStatusColor = () => {
    if (!isAuthenticated) return "#6B7280"; // gray-500

    switch (syncStatus) {
      case "synced":
        return "#10B981"; // green-500
      case "syncing":
        return "#F59E0B"; // yellow-500
      case "error":
        return "#EF4444"; // red-500
      case "offline":
        return "#6B7280"; // gray-500
      default:
        return "#6B7280"; // gray-500
    }
  };

  const getStatusTooltip = () => {
    if (!isAuthenticated) return "Sign in to enable cloud storage";

    switch (syncStatus) {
      case "synced":
        return "Cloud storage synced";
      case "syncing":
        return "Syncing to cloud...";
      case "error":
        return "Sync error - click to retry";
      case "offline":
        return "Offline - changes will sync when online";
      default:
        return "Cloud storage status";
    }
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

  const handleToggleCloud = async () => {
    try {
      if (isCloudEnabled) {
        disableCloudStorage();
      } else {
        await enableCloudStorage();
      }
    } catch (error) {
      console.error("Failed to toggle cloud storage:", error);
    }
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
          title={
            isAuthenticated
              ? `Signed in as ${user?.email}`
              : "Sign in to enable cloud storage"
          }
        >
          {isAuthenticated ? (
            <>
              <Avatar>
                <AvatarText>{user?.email?.charAt(0).toUpperCase()}</AvatarText>
              </Avatar>
              <UserInfo>
                <UserName>{user?.email?.split("@")[0]}</UserName>
                <UserStatus>
                  {isCloudEnabled ? "Cloud enabled" : "Local only"}
                </UserStatus>
              </UserInfo>
              <DropdownIcon
                isOpen={showDropdown}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </DropdownIcon>
            </>
          ) : (
            <>
              <SignInIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </SignInIcon>
              <SignInText>Sign In</SignInText>
            </>
          )}
        </AuthButtonElement>

        {showDropdown && isAuthenticated && (
          <Dropdown>
            <DropdownHeader>
              <DropdownTitle>{user?.email}</DropdownTitle>
              <DropdownSubtitle>
                {isCloudEnabled
                  ? "Cloud storage enabled"
                  : "Local storage only"}
              </DropdownSubtitle>
            </DropdownHeader>

            <DropdownContent>
              <DropdownItem onClick={handleToggleCloud} disabled={!isOnline}>
                <DropdownIconSmall
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </DropdownIconSmall>
                <span>
                  {isCloudEnabled
                    ? "Disable Cloud Storage"
                    : "Enable Cloud Storage"}
                </span>
              </DropdownItem>

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
