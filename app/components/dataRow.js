
export function DataRow({ label, value, full }) {
    return (
        <div className={full ? 'sm:col-span-2' : ''}>
            <div className="text-sm font-semibold text-primary">{label}</div>
            <p className="mt-1 text-sm text-slate-700">{value}</p>
        </div>
    );
}

