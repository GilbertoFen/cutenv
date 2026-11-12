'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
};

const modalRootId = "app-modal-root";

function ensureModalRoot() {
  let root = document.getElementById(modalRootId);
  if (!root) {
    root = document.createElement("div");
    root.id = modalRootId;
    document.body.appendChild(root);
  }
  return root;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-6xl",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const root = ensureModalRoot();

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${maxWidthClass} max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-soft-xl border border-slate-200/80 flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {title ?? "Detalle"}
          </h2>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-colors active:scale-95 border border-transparent hover:border-slate-200"
            aria-label="Cerrar modal"
            title="Cerrar modal"
          >
            <span className="text-base leading-none">✕</span>
            <span>Cerrar</span>
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    root
  );
}
