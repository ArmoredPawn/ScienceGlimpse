import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";

interface SuspensionGateProps {
  children: ReactNode;
}

/*
 * Replaces the whole site with a notice while the signed-in account is
 * suspended (suspensions/{uid}, set from the Mod dashboard). This is the
 * friendly half of a suspension; firestore.rules is the half that
 * actually stops a suspended account writing anything, so hiding the
 * site here is about telling the person why, not about security.
 *
 * AuthContext watches the suspension live, so a restore lifts this
 * screen immediately without a reload.
 */
const SuspensionGate = ({ children }: SuspensionGateProps) => {
  const { user, suspension, logout } = useAuth();

  if (!user || !suspension) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />

      <h1 className="mt-4 text-2xl font-bold">
        Your account is suspended
      </h1>

      <p className="mt-2 max-w-md text-muted-foreground">
        A ScienceGlimpse moderator has suspended this account, so
        you can't read for tokens, play Science Summit or change your
        profile right now.
      </p>

      {suspension.reason && (
        <div className="mt-6 w-full max-w-md rounded-xl border border-border bg-card p-4 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reason
          </p>

          <p className="mt-1">{suspension.reason}</p>

          {suspension.createdAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Since {suspension.createdAt.toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <p className="mt-6 max-w-md text-sm text-muted-foreground">
        If you think this is a mistake, contact the ScienceGlimpse
        team.
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={() => void logout()}
        className="mt-6"
      >
        Sign out
      </Button>
    </main>
  );
};

export default SuspensionGate;
