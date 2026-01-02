"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

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

export { ModalProvider };
