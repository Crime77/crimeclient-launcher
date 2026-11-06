interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

export function LoadingIndicator({
  message,
  className = "",
}: LoadingIndicatorProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 select-none ${className}`}
    >
      <div className="w-[18px] h-[18px] border-[1.5px] border-line-2 border-t-fg-3 rounded-full animate-spin mb-3"></div>
      {message && (
        <p className="text-fg-3 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
