interface StatCellProps {
  label: string;
  value: string | number | undefined;
}

export default function StatCell({ label, value }: StatCellProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-800">
      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="text-lg font-bold text-gray-900 dark:text-white">
        {value !== undefined && value !== null ? value : "—"}
      </span>
    </div>
  );
}
