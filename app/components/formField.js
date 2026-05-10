
export function FormField({ label, children, htmlFor, className = '' }) {
    return (
        <label htmlFor={htmlFor} className={`space-y-2 ${className}`}>
            <span className="text-[0.95em] font-semibold text-primary mb-[8px]">{label}</span>
            {children}
        </label>
    );
}

