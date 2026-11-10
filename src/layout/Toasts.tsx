import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useUI } from "../store/ui";

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          {toast.kind === "success" ? (
            <CheckCircle2 size={16} />
          ) : toast.kind === "error" ? (
            <XCircle size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>{toast.message}</span>
          <button aria-label="close" onClick={() => dismiss(toast.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
