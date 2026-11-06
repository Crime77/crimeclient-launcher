"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Package, User } from "lucide-react";
import i18n from "../../i18n/i18n";
import { useNavigate } from "react-router-dom";
import type { UnifiedProjectDetails } from "../../types/unified";
import { UnifiedDependencyType } from "../../types/unified";
import type { AccentColor } from "../../store/useThemeStore";
import { openExternalUrl } from "../../services/tauri-service";
import { cn } from "../../lib/utils";
import { formatIsoDate } from "../modrinth/v2/format";

interface ModDetailSidebarProps {
  project: UnifiedProjectDetails;
  accentColor: AccentColor;
}

interface LinkItemProps {
  label: string;
  url: string | null;
}

// "github.com" from a full URL, shown in mono next to the link label
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function LinkItem({ label, url }: LinkItemProps) {
  if (!url) return null;

  const handleClick = async () => {
    try {
      await openExternalUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      toast.error(i18n.t('common.open_link_failed'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full h-7 flex items-center gap-2 px-1.5 -mx-1.5 text-left hover:bg-s2 transition-colors duration-fast"
      style={{ borderRadius: "var(--r-sm)", width: "calc(100% + 12px)" }}
      title={url}
    >
      <span className="text-[12.5px] text-fg-2 group-hover:text-fg truncate">{label}</span>
      <span className="flex-1" />
      <span className="cc-num text-[11px] text-fg-4 truncate max-w-[110px]">{hostOf(url)}</span>
      <ArrowUpRight size={12} strokeWidth={1.75} className="text-fg-4 group-hover:text-fg-2 flex-shrink-0" />
    </button>
  );
}

// Helper to format environment support
function formatSideSupport(side: string | null): { label: string; color: string } {
  switch (side) {
    case "required":
      return { label: i18n.t('mod_detail.support.required'), color: "text-fg" };
    case "optional":
      return { label: i18n.t('mod_detail.support.optional'), color: "text-fg-2" };
    case "unsupported":
      return { label: i18n.t('mod_detail.support.unsupported'), color: "text-fg-4" };
    default:
      return { label: i18n.t('mod_detail.support.unknown'), color: "text-fg-4" };
  }
}

// Helper to group and format Minecraft versions
function formatGameVersions(versions: string[]): string[] {
  if (!versions || versions.length === 0) return [];

  // Sort versions semantically (newest first)
  const sorted = [...versions].sort((a, b) => {
    const aParts = a.split('.').map(p => parseInt(p) || 0);
    const bParts = b.split('.').map(p => parseInt(p) || 0);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const diff = (bParts[i] || 0) - (aParts[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  // Group by major.minor version
  const groups = new Map<string, string[]>();
  for (const version of sorted) {
    const parts = version.split('.');
    if (parts.length >= 2) {
      const majorMinor = `${parts[0]}.${parts[1]}`;
      if (!groups.has(majorMinor)) {
        groups.set(majorMinor, []);
      }
      groups.get(majorMinor)!.push(version);
    } else {
      groups.set(version, [version]);
    }
  }

  // Format each group
  const formatted: string[] = [];
  for (const [majorMinor, groupVersions] of groups) {
    if (groupVersions.length >= 3) {
      // If 3+ versions in a group, use .x notation
      formatted.push(`${majorMinor}.x`);
    } else if (groupVersions.length === 2) {
      // For 2 versions, show range like "1.18.1–1.18.2"
      formatted.push(`${groupVersions[groupVersions.length - 1]}–${groupVersions[0]}`);
    } else {
      // Single version
      formatted.push(groupVersions[0]);
    }
  }

  return formatted;
}

/** One block of the fact column: eyebrow heading (optional mono count), rows below. */
function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="py-4 border-b border-line first:pt-0 last:border-b-0">
      <h3 className="flex items-baseline gap-2 mb-2 normal-case tracking-normal">
        <span className="cc-eyebrow">{title}</span>
        {count !== undefined && <span className="cc-num text-[11px] text-fg-4">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

/** Key on the left in fg-3, value on the right in mono. */
function Fact({ label, children, mono = true }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-[3px] text-[12px] leading-[18px]">
      <span className="text-fg-3 flex-shrink-0">{label}</span>
      <span className={cn("text-right min-w-0 [overflow-wrap:anywhere] text-fg-2", mono && "cc-num text-[11.5px]")}>
        {children}
      </span>
    </div>
  );
}

export function ModDetailSidebar({ project, accentColor }: ModDetailSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenLicense = async () => {
    if (project.license?.url) {
      try {
        await openExternalUrl(project.license.url);
      } catch (error) {
        console.error("Failed to open URL:", error);
      }
    }
  };

  // Check if there are any links
  const hasLinks =
    project.links.issues ||
    project.links.source ||
    project.links.wiki ||
    project.links.discord ||
    project.links.website;

  const hasDonations = project.donation_urls.length > 0;
  const hasEnvironmentInfo = project.client_side || project.server_side;
  const hasCompatibilityInfo = project.game_versions.length > 0 || project.loaders.length > 0 || hasEnvironmentInfo;

  const hasDependencies = project.dependencies.length > 0;

  // Format game versions for display
  const formattedVersions = formatGameVersions(project.game_versions);

  return (
    <div>
      {/* Compatibility Section */}
      {hasCompatibilityInfo && (
        <Section title={t('mod_detail.compatibility')}>
          {/* Minecraft Versions */}
          {formattedVersions.length > 0 && (
            <Fact label={t('mods.detail.minecraft')}>
              {formattedVersions.slice(0, 8).join(", ")}
              {formattedVersions.length > 8 && (
                <span className="text-fg-4"> +{formattedVersions.length - 8}</span>
              )}
            </Fact>
          )}

          {/* Platforms/Loaders */}
          {project.loaders.length > 0 && (
            <Fact label={t('mod_detail.platforms')} mono={false}>
              <span className="capitalize">{project.loaders.join(" · ")}</span>
            </Fact>
          )}

          {/* Environment Support */}
          {hasEnvironmentInfo && (
            <>
              <Fact label={t('content.filters.client')}>
                <span className={formatSideSupport(project.client_side).color}>
                  {formatSideSupport(project.client_side).label}
                </span>
              </Fact>
              <Fact label={t('content.filters.server')}>
                <span className={formatSideSupport(project.server_side).color}>
                  {formatSideSupport(project.server_side).label}
                </span>
              </Fact>
            </>
          )}
        </Section>
      )}

      {/* Dependencies Section */}
      {hasDependencies && (
        <Section title={t('mods.detail.dependencies')} count={project.dependencies.length}>
          {project.dependencies.map((dep) => (
            <button
              key={dep.project_id}
              type="button"
              onClick={() => navigate(`/mods/${dep.source.toLowerCase()}/${dep.project_id}`)}
              className="group flex items-center gap-2 h-8 px-1.5 -mx-1.5 text-left hover:bg-s2 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-sm)", width: "calc(100% + 12px)" }}
            >
              <span
                className="w-6 h-6 flex-shrink-0 overflow-hidden bg-s3 border border-line grid place-items-center"
                style={{ borderRadius: "var(--r-sm)" }}
              >
                {dep.icon_url ? (
                  <img src={dep.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={12} strokeWidth={1.75} className="text-fg-4" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-[12.5px] text-fg-2 group-hover:text-fg truncate">
                {dep.title}
              </span>
              <span
                className={cn(
                  "cc-num text-[11px] flex-shrink-0",
                  dep.dependency_type === UnifiedDependencyType.Required ? "text-fg-3" : "text-fg-4",
                )}
              >
                {dep.dependency_type === UnifiedDependencyType.Required
                  ? t('mod_detail.support.required')
                  : t('mod_detail.support.optional')}
              </span>
            </button>
          ))}
        </Section>
      )}

      {/* Team Members Section */}
      {project.team_members.length > 0 && (
        <Section title={t('mods.detail.team')} count={project.team_members.length}>
          <div className="max-h-64 overflow-y-auto scrollbar-hover">
            {project.team_members.map((member, index) => (
              <button
                key={index}
                type="button"
                onClick={() => openExternalUrl(member.profile_url)}
                className="group flex items-center gap-2 h-8 px-1.5 -mx-1.5 text-left hover:bg-s2 transition-colors duration-fast"
                style={{ borderRadius: "var(--r-sm)", width: "calc(100% + 12px)" }}
              >
                <span className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden bg-s3 grid place-items-center">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={12} strokeWidth={1.75} className="text-fg-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-[12.5px] text-fg-2 group-hover:text-fg truncate">
                  {member.username}
                </span>
                <span className="cc-num text-[11px] text-fg-4 truncate max-w-[90px] flex-shrink-0">{member.role}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Donate Section */}
      {hasDonations && (
        <Section title={t('mod_detail.support')}>
          {project.donation_urls.map((donation, index) => (
            <LinkItem
              key={index}
              label={donation.platform}
              url={donation.url}
            />
          ))}
        </Section>
      )}

      {/* Links Section */}
      {hasLinks && (
        <Section title={t('mod_detail.links_title')}>
          <LinkItem label={t('mod_detail.links.website')} url={project.links.website} />
          <LinkItem label={t('mod_detail.links.source_code')} url={project.links.source} />
          <LinkItem label={t('mod_detail.links.issue_tracker')} url={project.links.issues} />
          <LinkItem label={t('mod_detail.links.wiki')} url={project.links.wiki} />
          <LinkItem label={t('mod_detail.links.discord')} url={project.links.discord} />
        </Section>
      )}

      {/* Details Section */}
      <Section title={t('mod_detail.details')}>
        {/* License */}
        {project.license && (
          <Fact label={t('mod_detail.license')}>
            {project.license.url ? (
              <button
                type="button"
                onClick={handleOpenLicense}
                className="text-fg-2 underline decoration-line-3 underline-offset-2 hover:text-fg hover:decoration-fg transition-colors duration-fast text-right"
              >
                {project.license.id || project.license.name}
              </button>
            ) : (
              <span title={project.license.name}>{project.license.id || project.license.name}</span>
            )}
          </Fact>
        )}

        {/* Dates */}
        <Fact label={t('mod_detail.created')}>{formatIsoDate(project.date_created)}</Fact>
        <Fact label={t('mod_detail.updated')}>{formatIsoDate(project.date_modified)}</Fact>

        {/* Project Info */}
        <Fact label={t('mod_detail.project_id')}>{project.id}</Fact>
        <Fact label={t('mod_detail.type')} mono={false}>
          {t(`mods.kind.${project.project_type}`, { defaultValue: project.project_type })}
        </Fact>
      </Section>
    </div>
  );
}
