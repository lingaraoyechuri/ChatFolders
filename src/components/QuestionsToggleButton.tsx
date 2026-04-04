import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

const Button = styled.button<{
  isActive: boolean;
  $top: number;
  $left: number;
  $isDragging: boolean;
}>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  background: ${(props) => (props.isActive ? "#3b82f6" : "#1a1a1a")};
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: ${(props) => (props.$isDragging ? "grabbing" : "grab")};
  font-size: 14px;
  z-index: 10000;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: ${(props) =>
    props.$isDragging ? "none" : "background-color 0.2s"};
  user-select: none;
  box-shadow: ${(props) =>
    props.$isDragging
      ? "0 4px 12px rgba(0, 0, 0, 0.3)"
      : "0 2px 8px rgba(0, 0, 0, 0.2)"};
  transform: ${(props) => (props.$isDragging ? "scale(1.05)" : "scale(1)")};

  &:hover {
    background: ${(props) => (props.isActive ? "#2563eb" : "#2a2a2a")};
  }

  &:active {
    cursor: grabbing;
  }
`;

interface QuestionsToggleButtonProps {
  showQuestions: boolean;
  onToggle: () => void;
}

const STORAGE_KEY = "questions-toggle-button-position";

export const QuestionsToggleButton: React.FC<QuestionsToggleButtonProps> = ({
  showQuestions,
  onToggle,
}) => {
  const [position, setPosition] = useState({
    top: 100,
    left: window.innerWidth - 120,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem(STORAGE_KEY);
    if (savedPosition) {
      try {
        const { top, left } = JSON.parse(savedPosition);
        setPosition({ top, left });
      } catch (error) {
        console.error("Failed to load saved position:", error);
      }
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only start dragging if clicking on the button itself, not on a child element
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).tagName === "BUTTON"
    ) {
      setIsDragging(true);
      setHasMoved(false);
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setHasMoved(true);
        const newLeft = e.clientX - dragOffset.x;
        const newTop = e.clientY - dragOffset.y;

        // Constrain to viewport bounds
        const maxLeft =
          window.innerWidth - (buttonRef.current?.offsetWidth || 120);
        const maxTop =
          window.innerHeight - (buttonRef.current?.offsetHeight || 40);

        setPosition({
          left: Math.max(0, Math.min(newLeft, maxLeft)),
          top: Math.max(0, Math.min(newTop, maxTop)),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Small delay to prevent accidental click after drag
        setTimeout(() => setHasMoved(false), 100);
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // Prevent text selection while dragging
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging, dragOffset]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only trigger toggle if we didn't just finish dragging
    if (!isDragging && !hasMoved) {
      onToggle();
    }
  };

  return (
    <Button
      ref={buttonRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className="questions-toggle-button"
      isActive={showQuestions}
      $top={position.top}
      $left={position.left}
      $isDragging={isDragging}
      title="Drag to move, click to toggle prompts"
    >
      Prompts
    </Button>
  );
};
