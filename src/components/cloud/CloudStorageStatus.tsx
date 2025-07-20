import React from "react";
import { useAuthStore } from "../../store/authStore";
import { useSidePanelStore } from "../../store/sidePanelStore";

export const CloudStorageStatus: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    isCloudEnabled,
    syncStatus,
    lastSync,
    isOnline,
    enableCloudStorage,
    disableCloudStorage,
    syncToCloud,
    syncFromCloud,
  } = useSidePanelStore();

  const getStatusColor = () => {
    switch (syncStatus) {
      case "synced":
        return "text-green-600";
      case "syncing":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      case "offline":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "synced":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "syncing":
        return (
          <svg
            className="w-4 h-4 animate-spin"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "error":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "offline":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.707 2.293a1 1 0 00-1.414 1.414l6.921 6.922a1 1 0 00.756.293 1 1 0 00.756-.293l6.921-6.922a1 1 0 00-1.414-1.414L10 8.586 3.707 2.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return "Never";
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  const handleEnableCloud = async () => {
    try {
      await enableCloudStorage();
    } catch (error) {
      console.error("Failed to enable cloud storage:", error);
    }
  };

  const handleDisableCloud = () => {
    disableCloudStorage();
  };

  const handleManualSync = async () => {
    try {
      await syncToCloud();
    } catch (error) {
      console.error("Failed to sync:", error);
    }
  };

  // Only show for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="space-y-3">
        {/* User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-gray-600"
            title="Sign out"
          >
            <svg
              className="w-5 h-5"
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
            </svg>
          </button>
        </div>

        {/* Cloud Storage Status */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`${getStatusColor()}`}>{getStatusIcon()}</span>
              <span className="text-sm font-medium text-gray-900">
                Cloud Storage
              </span>
            </div>
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {syncStatus.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            Last sync: {formatLastSync()}
          </div>

          {/* Cloud Storage Controls */}
          <div className="space-y-2">
            {!isCloudEnabled ? (
              <button
                onClick={handleEnableCloud}
                disabled={!isOnline}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enable Cloud Storage
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleManualSync}
                  disabled={syncStatus === "syncing" || !isOnline}
                  className="w-full bg-green-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={handleDisableCloud}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Disable Cloud Storage
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-yellow-800">
                You're offline. Changes will sync when you're back online.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
