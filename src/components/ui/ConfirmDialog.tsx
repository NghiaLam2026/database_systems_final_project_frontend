import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils/cn'

export type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  /** Short heading (e.g. "Delete chat?") */
  title: string
  /** Main message; use JSX for bold names, etc. */
  description: ReactNode
  /** Primary action label (default: "Delete" for danger, "Confirm" otherwise) */
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` uses a red primary button (destructive actions). */
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
}

/**
 * App-wide replacement for `window.confirm`. Use for delete and other destructive
 * confirmations so styling matches the rest of the UI.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const resolvedConfirm =
    confirmLabel ?? (variant === 'danger' ? 'Delete' : 'Confirm')

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={handleClose} size="md">
      <div className="p-7">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-ink-950">
          {title}
        </h2>
        <div
          id="confirm-dialog-description"
          className="mt-2 text-sm leading-relaxed text-ink-800"
        >
          {description}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            onClick={onConfirm}
            className={cn(
              variant === 'danger' && 'bg-red-600 hover:bg-red-500 disabled:bg-red-400',
            )}
          >
            {resolvedConfirm}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
