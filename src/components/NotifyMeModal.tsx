"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/Button";

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
}

export function NotifyMeModal({
  isOpen,
  onClose,
  moduleName,
}: NotifyMeModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual submission logic
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setEmail("");
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* Modal Content */}
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#3b9fc2] rounded"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {!submitted ? (
          <>
            <h2
              id="modal-title"
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Get Notified
            </h2>
            <p className="text-gray-600 mb-6">
              We'll let you know when <strong>{moduleName}</strong> launches.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b9fc2] focus:border-transparent"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>

              <Button variant="primary" className="w-full">
                Notify Me
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              You're on the list!
            </h3>
            <p className="text-gray-600">
              We'll notify you when {moduleName} is ready.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
