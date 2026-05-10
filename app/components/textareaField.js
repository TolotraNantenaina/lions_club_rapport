export function TextareaField({ label, placeholder, htmlFor, value, onChange }) {
    return (
        <label htmlFor={htmlFor} className="space-y-2 block">
            <span className="text-[0.95em] font-semibold text-primary mb-[8px]">{label}</span>
            <textarea
                id={htmlFor}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                className="form-textarea"
                readOnly={!onChange}
            />
        </label>
    );
}