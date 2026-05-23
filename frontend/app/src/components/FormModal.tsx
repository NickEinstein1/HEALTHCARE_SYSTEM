import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
  ariaLabel?: string;
};

/** Dark-themed modal shell — use for all dashboard create/edit forms. */
export function FormModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 760,
  ariaLabel,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        style={{ maxWidth, width: "min(95vw, 100%)" }}
      >
        <div className="modal-hd">
          <div>
            <div className="modal-ti">{title}</div>
            {subtitle ? <div className="modal-su">{subtitle}</div> : null}
          </div>
          <button className="btn-s btn-sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-bd">{children}</div>
        {footer ? <div className="modal-ft">{footer}</div> : null}
      </div>
    </>
  );
}
