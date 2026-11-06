import { cloneElement, forwardRef, isValidElement, useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const buttonStyles = {
  primary: 'bg-crimson text-white shadow-sm hover:bg-crimson/90',
  secondary: 'border border-border bg-white text-ink hover:bg-neutral-soft',
  danger: 'bg-critical text-white shadow-sm hover:bg-critical/90',
  ghost: 'text-muted hover:bg-neutral-soft hover:text-ink',
  quiet: 'text-muted hover:bg-neutral-soft hover:text-ink',
  outline: 'border border-crimson/30 bg-white text-crimson hover:bg-crimson-soft',
  'icon-only': 'size-10 p-0 text-muted hover:bg-neutral-soft hover:text-ink',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...props },
  ref,
) {
  const sizes = {
    sm: 'min-h-9 px-3 text-sm',
    md: 'min-h-10 px-4 text-sm',
    lg: 'min-h-12 px-5 text-base',
    icon: 'size-10 p-0',
  }

  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson disabled:pointer-events-none disabled:opacity-50 ${buttonStyles[variant] ?? buttonStyles.primary} ${sizes[size] ?? sizes.md} ${className}`}
      {...props}
    />
  )
})

export function Card({ as: Element = 'section', className = '', children, ...props }) {
  return (
    <Element className={`rounded-card border border-border bg-white shadow-card ${className}`} {...props}>
      {children}
    </Element>
  )
}

const badgeToneStyles = {
  neutral: 'bg-neutral-soft text-neutral-strong ring-neutral-strong/10',
  success: 'bg-success-soft text-success-strong ring-success/15',
  info: 'bg-info-soft text-info-strong ring-info/15',
  warning: 'bg-warning-soft text-warning-strong ring-warning/15',
  danger: 'bg-critical-soft text-critical ring-critical/15',
  violet: 'bg-violet-soft text-violet ring-violet/15',
}

export function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeToneStyles[tone] ?? badgeToneStyles.neutral} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

const statusTone = {
  Available: 'success', Successful: 'success', Accepted: 'success', Fulfilled: 'success',
  Approved: 'info', Screening: 'neutral', 'Not assessed': 'neutral', Unavailable: 'neutral',
  'Partially fulfilled': 'warning', Pending: 'warning', 'Expiring soon': 'warning', Quarantined: 'warning',
  Critical: 'danger', Rejected: 'danger', Expired: 'danger',
}

export function StatusBadge({ children, className = '', ...props }) {
  return <Badge tone={statusTone[children] ?? 'neutral'} className={className} {...props}>{children}</Badge>
}

export function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-label font-semibold tracking-[0.14em] text-muted uppercase">{eyebrow}</p>}
        <h1 className="text-page-title font-semibold tracking-tight text-ink sm:text-page-title-lg">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-body leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

const Field = forwardRef(function Field({ as: Element, label, id, hint, error, className = '', children, ...props }, ref) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId, props['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <div className="block">
      {label && <label className="block text-label font-medium text-ink" htmlFor={id}>{label}</label>}
      <Element
        ref={ref}
        id={id}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        className={`mt-2 block min-h-10 w-full rounded-control border border-border bg-white px-3 text-body text-ink shadow-sm outline-none placeholder:text-muted focus:border-crimson focus:ring-3 focus:ring-crimson/15 disabled:cursor-not-allowed disabled:bg-neutral-soft disabled:text-muted ${error ? 'border-critical focus:border-critical focus:ring-critical/15' : ''} ${className}`}
        {...props}
      >
        {children}
      </Element>
      {hint && <p className="mt-1.5 text-supporting text-muted" id={hintId}>{hint}</p>}
      {error && <p className="mt-1.5 text-supporting font-medium text-critical" id={errorId}>{error}</p>}
    </div>
  )
})

export const Input = forwardRef(function Input(props, ref) {
  return <Field as="input" {...props} ref={ref} />
})

export const Select = forwardRef(function Select(props, ref) {
  return <Field as="select" {...props} ref={ref} />
})

// Keep the existing field API working while pages migrate to the shared Input.
export const TextField = Input

function OverlayPanel({ open, onClose, title, description, children, footer, className = '', drawer = false }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose?.() }}
      onClick={(event) => { if (event.target === dialogRef.current) onClose?.() }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(560px,calc(100vw-2rem))] overflow-y-auto rounded-card border border-border bg-white p-0 text-ink shadow-xl backdrop:bg-navy/50 ${drawer ? 'inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-[min(440px,100vw)] rounded-none rounded-l-card' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 className="text-card-heading font-semibold text-ink" id={titleId}>{title}</h2>
          {description && <p className="mt-1 text-supporting leading-5 text-muted" id={descriptionId}>{description}</p>}
        </div>
        <Button aria-label="Close dialog" className="shrink-0" size="icon" variant="ghost" onClick={onClose}><X size={17} /></Button>
      </div>
      <div className="p-5">{children}</div>
      {footer && <div className="border-t border-border p-5">{footer}</div>}
    </dialog>
  )
}

export function Modal(props) { return <OverlayPanel {...props} /> }
export function Drawer(props) { return <OverlayPanel {...props} drawer /> }

export function Toast({ tone = 'info', message, onDismiss, className = '' }) {
  if (!message) return null
  const role = tone === 'danger' ? 'alert' : 'status'
  const toneClass = {
    success: 'border-success/20 bg-success-soft text-success-strong',
    info: 'border-info/20 bg-info-soft text-info-strong',
    warning: 'border-warning/20 bg-warning-soft text-warning-strong',
    danger: 'border-critical/20 bg-critical-soft text-critical',
  }[tone] ?? 'border-info/20 bg-info-soft text-info-strong'
  return (
    <div className={`flex items-start justify-between gap-3 rounded-control border px-4 py-3 text-body ${toneClass} ${className}`} role={role}>
      <span>{message}</span>
      {onDismiss && <Button aria-label="Dismiss message" className="-mr-2 -mt-1 shrink-0" size="icon" variant="ghost" onClick={onDismiss}><X size={16} /></Button>}
    </div>
  )
}

export function Tooltip({ content, children, placement = 'top' }) {
  const tooltipId = useId()
  const describedBy = isValidElement(children)
    ? [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
    : tooltipId
  const trigger = isValidElement(children)
    ? cloneElement(children, { 'aria-describedby': describedBy })
    : <span tabIndex={0} aria-describedby={tooltipId}>{children}</span>
  const position = placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
  return (
    <span className="group relative inline-flex">
      {trigger}
      <span className={`pointer-events-none invisible absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-control bg-navy px-2.5 py-1.5 text-meta font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${position}`} id={tooltipId} role="tooltip">
        {content}
      </span>
    </span>
  )
}

export function Table({ className = '', children, ...props }) {
  return <div className="w-full overflow-x-auto"><table className={`w-full border-collapse text-left text-table ${className}`} {...props}>{children}</table></div>
}
export function TableHead({ className = '', ...props }) { return <thead className={`bg-neutral-soft text-label font-medium text-muted ${className}`} {...props} /> }
export function TableBody({ className = '', ...props }) { return <tbody className={`divide-y divide-border ${className}`} {...props} /> }
export function TableRow({ className = '', ...props }) { return <tr className={className} {...props} /> }
export function TableHeader({ className = '', scope = 'col', ...props }) { return <th scope={scope} className={`px-4 py-3 font-medium ${className}`} {...props} /> }
export function TableCell({ className = '', ...props }) { return <td className={`px-4 py-3 ${className}`} {...props} /> }

export function Skeleton({ className = '', ...props }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-neutral-soft motion-reduce:animate-none ${className}`} {...props} />
}
