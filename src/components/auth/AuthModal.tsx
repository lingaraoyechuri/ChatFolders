import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { useAuthStore } from "../../store/authStore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = "login" | "register" | "reset";

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
`;

const ModalContent = styled.div`
  background-color: #ffffff;
  border-radius: 8px;
  padding: 32px;
  width: 100%;
  max-width: 448px;
  margin: 0 16px;
  position: relative;
  z-index: 1000000;
  pointer-events: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: bold;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: #6b7280;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  background-color: #3b82f6;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
`;

const ModalFooter = styled.div`
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FooterButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #3b82f6;
  transition: color 0.2s ease;

  &:hover {
    color: #1d4ed8;
  }

  &.secondary {
    color: #6b7280;

    &:hover {
      color: #374151;
    }
  }
`;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, resetPassword, error, clearError } = useAuthStore();

  console.log("AuthModal: Component rendered", { isOpen, mode });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      clearError();
    }
  }, [isOpen, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await register(email, password);
      } else if (mode === "reset") {
        await resetPassword(email);
        alert("Password reset email sent! Check your inbox.");
        setMode("login");
        return;
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Auth error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Authentication failed. Please try again.";

      if (error.code) {
        switch (error.code) {
          case "auth/network-request-failed":
            errorMessage =
              "Network error. Please check your internet connection and try again.";
            break;
          case "auth/email-already-in-use":
            errorMessage =
              "An account with this email already exists. Please sign in instead.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/weak-password":
            errorMessage = "Password should be at least 6 characters long.";
            break;
          case "auth/user-not-found":
            errorMessage =
              "No account found with this email. Please check your email or create a new account.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case "auth/user-disabled":
            errorMessage =
              "This account has been disabled. Please contact support.";
            break;
          default:
            errorMessage =
              error.message || "Authentication failed. Please try again.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Set the error in the auth store
      useAuthStore.getState().setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    clearError();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    console.log("AuthModal: Overlay clicked");
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    console.log("AuthModal: Content clicked");
    e.stopPropagation();
  };

  if (!isOpen) return null;

  const modalContent = (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent onClick={handleContentClick}>
        <ModalHeader>
          <ModalTitle>
            {mode === "login" && "Sign In"}
            {mode === "register" && "Create Account"}
            {mode === "reset" && "Reset Password"}
          </ModalTitle>
          <CloseButton
            onClick={() => {
              console.log("AuthModal: Close button clicked");
              onClose();
            }}
          >
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
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </FormGroup>

          {mode !== "reset" && (
            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </FormGroup>
          )}

          {mode === "register" && (
            <FormGroup>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </FormGroup>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  style={{
                    animation: "spin 1s linear infinite",
                    marginRight: "12px",
                  }}
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {mode === "login" && "Signing In..."}
                {mode === "register" && "Creating Account..."}
                {mode === "reset" && "Sending Reset Email..."}
              </div>
            ) : (
              <>
                {mode === "login" && "Sign In"}
                {mode === "register" && "Create Account"}
                {mode === "reset" && "Send Reset Email"}
              </>
            )}
          </SubmitButton>
        </Form>

        <ModalFooter>
          {mode === "login" && (
            <>
              <FooterButton onClick={() => switchMode("register")}>
                Don't have an account? Sign up
              </FooterButton>
              <FooterButton
                className="secondary"
                onClick={() => switchMode("reset")}
              >
                Forgot your password?
              </FooterButton>
            </>
          )}

          {mode === "register" && (
            <FooterButton onClick={() => switchMode("login")}>
              Already have an account? Sign in
            </FooterButton>
          )}

          {mode === "reset" && (
            <FooterButton onClick={() => switchMode("login")}>
              Back to sign in
            </FooterButton>
          )}
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );

  // Render the modal directly to document.body to avoid pointer-events issues
  return createPortal(modalContent, document.body);
};
