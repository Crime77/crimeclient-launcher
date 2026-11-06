"use client";

import type { Profile } from "../../types/profile";
import { ProfileIcon } from "./ProfileIcon";
import { cn } from "../../lib/utils";

interface ProfileIconV2Props {
  profile: Profile;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  xs: { box: "w-8 h-8", icon: "w-4 h-4", radius: "var(--r-sm)" },
  sm: { box: "w-12 h-12", icon: "w-5 h-5", radius: "var(--r-md)" },
  md: { box: "w-16 h-16", icon: "w-7 h-7", radius: "var(--r-md)" },
  lg: { box: "w-20 h-20", icon: "w-8 h-8", radius: "var(--r-lg)" },
};

/** A profile's icon on a neutral tile (s3 with a hairline); the package glyph stands in when it has none. */
export function ProfileIconV2({
  profile,
  size = "md",
  className = "",
}: ProfileIconV2Props) {
  const s = SIZE[size];

  return (
    <div
      className={cn(
        s.box,
        "flex-shrink-0 flex items-center justify-center overflow-hidden bg-s3 border border-line",
        className,
      )}
      style={{ borderRadius: s.radius }}
    >
      <ProfileIcon
        profileId={profile.id}
        banner={profile.banner}
        profileName={profile.name}
        accentColor="var(--fg-3)"
        onSuccessfulUpdate={() => {}}
        isEditable={false}
        variant="bare"
        className="w-full h-full"
        placeholderIcon="ph:package-duotone"
        iconClassName={s.icon}
      />
    </div>
  );
}
