"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { ModPlatform } from "../../types/unified";
import { sanitizeRichHtml } from "../../utils/html-sanitize";

interface ModDetailDescriptionProps {
  body: string;
  source: ModPlatform;
}

// Body text 14 px in fg-2, headings in fg, code in mono on s2. Links stay neutral (underlined), never accent.
const HEADING = "text-fg normal-case tracking-normal [overflow-wrap:anywhere]";

// The same look for CurseForge HTML, which arrives as markup instead of Markdown
const HTML_BODY = `max-w-none text-[14px] leading-[1.65] text-fg-2 [overflow-wrap:anywhere]
  [&_h1]:text-[20px] [&_h1]:font-[650] [&_h1]:text-fg [&_h1]:mt-7 [&_h1]:mb-3 [&_h1]:first:mt-0
  [&_h2]:text-[17px] [&_h2]:font-[650] [&_h2]:text-fg [&_h2]:mt-6 [&_h2]:mb-2.5
  [&_h3]:text-[15px] [&_h3]:font-[620] [&_h3]:text-fg [&_h3]:mt-5 [&_h3]:mb-2
  [&_h4]:text-[14px] [&_h4]:font-[620] [&_h4]:text-fg [&_h4]:mt-4 [&_h4]:mb-2
  [&_h5]:text-[14px] [&_h5]:font-[620] [&_h5]:text-fg [&_h5]:mt-4 [&_h5]:mb-2
  [&_h6]:text-[14px] [&_h6]:font-[620] [&_h6]:text-fg [&_h6]:mt-4 [&_h6]:mb-2
  [&_p]:mb-3
  [&_summary]:cursor-pointer
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
  [&_strong]:font-[620] [&_strong]:text-fg
  [&_em]:italic
  [&_code]:bg-s2 [&_code]:border [&_code]:border-line [&_code]:px-1 [&_code]:rounded-sm [&_code]:text-[12.5px] [&_code]:font-mono [&_code]:text-fg
  [&_pre]:bg-s2 [&_pre]:border [&_pre]:border-line [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:text-[12.5px] [&_pre]:font-mono [&_pre]:overflow-x-auto [&_pre]:mb-3
  [&_pre_code]:border-0 [&_pre_code]:p-0 [&_pre_code]:bg-transparent
  [&_blockquote]:border-l-2 [&_blockquote]:border-line-3 [&_blockquote]:pl-4 [&_blockquote]:text-fg-3 [&_blockquote]:my-3
  [&_a]:text-fg [&_a]:underline [&_a]:decoration-line-3 [&_a]:underline-offset-2 [&_a:hover]:decoration-fg [&_a]:break-words
  [&_img]:inline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-1
  [&_hr]:border-line [&_hr]:my-6
  [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3 [&_table]:text-[13px]
  [&_th]:bg-s2 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:border [&_th]:border-line [&_th]:text-left [&_th]:font-[600] [&_th]:text-fg
  [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:border [&_td]:border-line`;

/** The project's long description (Markdown for Modrinth, sanitized HTML for CurseForge). */
export function ModDetailDescription({ body, source }: ModDetailDescriptionProps) {
  const { t } = useTranslation();

  if (!body || body.trim().length === 0) {
    return (
      <p className="py-6 text-[13px] text-fg-3">
        {t('mod_detail.no_description')}
      </p>
    );
  }

  return (
    <div className="max-w-[760px]">
      {source === ModPlatform.CurseForge ? (
        // Render HTML for CurseForge (sanitized)
        <div
          className={HTML_BODY}
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(body) }}
        />
      ) : (
        // Render Markdown for Modrinth (with HTML support via rehype-raw)
        <div className="max-w-none text-[14px] leading-[1.65] text-fg-2 [overflow-wrap:anywhere]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => (
                <h1 className={`${HEADING} text-[20px] leading-[1.25] font-[650] mt-7 mb-3 first:mt-0`}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className={`${HEADING} text-[17px] leading-[1.3] font-[650] mt-6 mb-2.5 first:mt-0`}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className={`${HEADING} text-[15px] leading-[1.35] font-[620] mt-5 mb-2 first:mt-0`}>
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className={`${HEADING} text-[14px] font-[620] mt-4 mb-2`}>
                  {children}
                </h4>
              ),
              h5: ({ children }) => (
                <h5 className={`${HEADING} text-[14px] font-[620] mt-4 mb-2`}>
                  {children}
                </h5>
              ),
              h6: ({ children }) => (
                <h6 className={`${HEADING} text-[13px] font-[620] text-fg-2 mt-4 mb-2`}>
                  {children}
                </h6>
              ),
              p: ({ children }) => (
                <p className="mb-3 [overflow-wrap:anywhere]">
                  {children}
                </p>
              ),
              summary: ({ children }) => (
                <summary className="cursor-pointer text-fg" style={{ width: 'fit-content' }}>
                  {children}
                </summary>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-fg-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 mb-3 space-y-1 marker:text-fg-4">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="[overflow-wrap:anywhere]">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-[620] text-fg">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic">{children}</em>
              ),
              code: ({ children, className }) => {
                // Check if it's inline code or a code block
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <code className="font-mono text-[12.5px] text-fg">
                      {children}
                    </code>
                  );
                }
                return (
                  <code
                    className="bg-s2 border border-line px-1 font-mono text-[12.5px] text-fg"
                    style={{ borderRadius: "var(--r-sm)" }}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre
                  className="bg-s2 border border-line p-3 font-mono text-[12.5px] leading-[1.55] text-fg overflow-x-auto mb-3"
                  style={{ borderRadius: "var(--r-md)" }}
                >
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-line-3 pl-4 text-fg-3 my-3">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-fg underline decoration-line-3 underline-offset-2 hover:decoration-fg transition-colors duration-fast break-words"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt}
                  className="inline max-w-full h-auto my-1"
                  style={{ borderRadius: "var(--r-sm)" }}
                  loading="lazy"
                />
              ),
              hr: () => <hr className="border-line my-6" />,
              table: ({ children }) => (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full border-collapse text-[13px]">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-s2">{children}</thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-b border-line">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="px-2.5 py-1.5 border border-line text-left font-[600] text-fg">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-2.5 py-1.5 border border-line">
                  {children}
                </td>
              ),
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
