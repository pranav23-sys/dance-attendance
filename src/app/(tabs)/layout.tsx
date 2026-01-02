"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ErrorBoundary from "../../components/ErrorBoundary";

const tabs = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/classes", label: "Classes", icon: "📋" },
  { href: "/students", label: "Students", icon: "👥" },
];

// Modal Context
import { createContext, useContext, useState, ReactNode } from "react";

type ModalType = "alert" | "confirm";

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ModalContext = createContext<{
  showModal: (type: ModalType, title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => void;
  hideModal: () => void;
} | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
}

function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
  });

  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const hideModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    modal.onConfirm?.();
    hideModal();
  };

  const handleCancel = () => {
    modal.onCancel?.();
    hideModal();
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-neutral-900 p-6 ring-1 ring-neutral-700">
            <h3 className="text-lg font-semibold text-white">{modal.title}</h3>
            <p className="mt-2 text-sm text-neutral-300">{modal.message}</p>

            <div className="mt-6 flex gap-3">
              {modal.type === "confirm" && (
                <button
                  onClick={handleCancel}
                  className="flex-1 rounded-xl bg-neutral-700 py-3 text-sm font-medium text-white transition active:scale-[0.98]"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-medium text-white transition active:scale-[0.98]"
              >
                {modal.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ModalProvider>
      <ErrorBoundary>
        {/* Skip Link for Accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div className="min-h-screen bg-black text-white pb-20">
          {children}

          {/* Bottom Tab Bar */}
          <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur ring-1 ring-neutral-800">
            <div className="flex justify-around py-2">
              {tabs.map((tab) => {
                const active = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex flex-col items-center gap-1 text-xs transition ${
                      active
                        ? "text-[var(--color-accent)]"
                        : "text-neutral-400"
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </ErrorBoundary>
    </ModalProvider>
  );
}
