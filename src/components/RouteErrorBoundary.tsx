"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronDown, Home, RotateCw } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/buttons/Button";

// Friendly fallback used by `errorElement` on the root route. Replaces the
// React Router default "Hey developer" screen so users can recover (reload /
// go home) and devs see a stack trace in non-prod builds.
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { title, message, stack } = useMemo(() => normalizeError(error, t), [error, t]);

  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-bg text-fg">
      <div className="cc-panel cc-enter w-full max-w-lg p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} strokeWidth={1.75} className="text-err flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[17px] font-[650] text-fg leading-tight">{title}</h1>
            <p className="mt-1.5 text-[13px] text-fg-2 leading-relaxed break-words">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { navigate("/play"); }}
            icon={<Home size={14} strokeWidth={1.75} />}
          >
            {t("errorBoundary.goHome")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { window.location.reload(); }}
            icon={<RotateCw size={14} strokeWidth={1.75} />}
          >
            {t("errorBoundary.reload")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { navigate(-1); }}
            icon={<ArrowLeft size={14} strokeWidth={1.75} />}
          >
            {t("errorBoundary.back")}
          </Button>
        </div>

        {isDev && stack && (
          <div className="mt-5 pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setDetailsOpen(v => !v)}
              className="text-xs text-fg-3 hover:text-fg-2 flex items-center gap-1.5 transition-colors duration-fast"
            >
              <ChevronDown
                size={14}
                strokeWidth={1.75}
                className={`transition-transform duration-med ${detailsOpen ? "rotate-180" : ""}`}
              />
              {t("errorBoundary.details")}
            </button>
            {detailsOpen && (
              <pre
                className="mt-2 p-3 bg-s2 border border-line text-[11px] text-fg-2 font-mono overflow-auto max-h-64 whitespace-pre-wrap break-words custom-scrollbar"
                style={{ borderRadius: "var(--r-md)" }}
              >
                {stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeError(
  error: unknown,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { title: string; message: string; stack: string | null } {
  if (isRouteErrorResponse(error)) {
    return {
      title: t("errorBoundary.titleRoute", { status: error.status }),
      message: error.statusText || String(error.data ?? ""),
      stack: null,
    };
  }
  if (error instanceof Error) {
    return {
      title: t("errorBoundary.title"),
      message: error.message || t("errorBoundary.unknown"),
      stack: error.stack ?? null,
    };
  }
  return {
    title: t("errorBoundary.title"),
    message: typeof error === "string" ? error : t("errorBoundary.unknown"),
    stack: null,
  };
}
