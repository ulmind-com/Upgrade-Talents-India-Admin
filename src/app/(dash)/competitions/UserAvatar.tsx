"use client";

import { useEffect, useState } from "react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

/**
 * Google profile photos (lh3.googleusercontent.com) answer 429 when the browser
 * sends a Referer, so every remote avatar is requested without one and falls
 * back to the contestant's initial if the image still fails.
 */
export function UserAvatar({
  user,
  className = "size-8",
  rounded = "rounded-lg",
  verified = false,
}: {
  user: any;
  className?: string;
  rounded?: string;
  verified?: boolean;
}) {
  const src: string =
    user?.user_photo || user?.profile_photo || user?.avatar || user?.photo_url || user?.picture || "";
  const [failed, setFailed] = useState(false);
  const initial = ((user?.user_name || user?.name || user?.user_email || user?.email || "P").trim()[0] || "P").toUpperCase();

  useEffect(() => { setFailed(false); }, [src]);

  return (
    <div className={cn("relative shrink-0", className)}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("size-full object-cover border border-[var(--border)]", rounded)}
        />
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-indigo-600/30 text-xs font-bold text-violet-200 shadow-inner",
            rounded
          )}
        >
          {initial}
        </div>
      )}
      {verified && (
        <span className="absolute -bottom-1 -right-1">
          <VerifiedBadge size="xs" />
        </span>
      )}
    </div>
  );
}
