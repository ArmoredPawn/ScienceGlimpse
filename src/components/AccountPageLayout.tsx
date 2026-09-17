import React from "react";

import AnimatedBackground from "./AnimatedBackground";
import Navigation from "./Navigation";

interface AccountPageLayoutProps {
  children: React.ReactNode;
}

/*
 * Shared frame for the account pages — log in, sign up, reset password
 * and profile. They used to render a bare centred card with no way back
 * into the site except the browser button.
 *
 * The navigation bar is fixed, so it takes up no space in the flow and
 * the padding here is what stops the card sliding underneath it.
 * Tailwind sets border-box globally, so min-h-screen already includes
 * that padding and the page does not end up taller than the viewport.
 */
const AccountPageLayout: React.FC<AccountPageLayoutProps> = ({
  children,
}) => (
  <div className="relative min-h-screen overflow-x-hidden bg-background">
    <AnimatedBackground />
    <Navigation />

    <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-12 pt-24">
      {children}
    </main>
  </div>
);

export default AccountPageLayout;
