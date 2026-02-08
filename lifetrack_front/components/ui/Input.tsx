import React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helperText?: string
  as?: 'input'
  rows?: never
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  helperText?: string
  as: 'textarea'
}

type Props = InputProps | TextAreaProps

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
  ({ label, error, helperText, className = '', as = 'input', ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = props.id || generatedId
    
    const baseStyles = `
      px-3 py-2 rounded-[var(--radius)] 
      bg-[hsl(var(--background))] 
      border border-[hsl(var(--border))]
      text-[hsl(var(--foreground))]
      placeholder:text-[hsl(var(--muted-foreground))]
      transition-all duration-[var(--transition-fast)]
      focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
      ${error ? 'border-[hsl(var(--danger))] focus:ring-[hsl(var(--danger))]' : ''}
      ${className}
    `
    
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-sm font-medium text-[hsl(var(--foreground))]"
          >
            {label}
          </label>
        )}
        {as === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            className={baseStyles}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            className={baseStyles}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {error && (
          <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
