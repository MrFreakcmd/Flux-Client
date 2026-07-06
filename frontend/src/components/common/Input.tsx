import type { InputProps } from '@types/index'

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input
        className={`input ${className}`}
        {...props}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  )
}
