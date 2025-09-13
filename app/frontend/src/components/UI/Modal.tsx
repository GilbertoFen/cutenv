import { useEffect } from "react";
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const root = ensureModalRoot();

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
       <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
       <div
        className={`relative w-[95vw] ${maxWidthClass} max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
         <div className="flex items-center justify-between p-3 border-b">
          <h2 className="text-lg font-bold text-[#14144f]">
            {title ?? "Detalle de mesa"}
          </h2>
          <button
            onClick={onClose}
            className="rounded px-3 py-1 text-white bg-[#14144f] hover:opacity-90"
          >
            Cerrar
          </button>
        </div>
         <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    root
  );
}
