import { AlertTriangle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  return (
    <div
      className={`flex items-start gap-2 bg-err/[0.06] border border-err/25 rounded-md text-fg-2 text-xs leading-[1.45] px-3 py-2 ${className}`}
    >
      <AlertTriangle size={14} strokeWidth={1.75} className="flex-shrink-0 mt-px text-err" />
      <span>{message}</span>
    </div>
  );
}
