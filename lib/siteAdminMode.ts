// Site-admin's "root mode" — a UI-visibility gate only, never a security boundary. A genuine
// site_admin defaults to seeing exactly what a regular admin sees; this claim (see
// functions/src/functions/users-onCreateProvision.ts's setSiteAdminMode) is what reveals the
// extra root-only surfaces (Settings, per-member AI/scenario editing, viewing another member's
// portfolio). Every one of those surfaces still independently calls requireSiteAdmin
// server-side (functions/src/lib/auth.ts) — someone forging this claim without actually holding
// the site_admin role gains nothing, since isSiteAdminModeOn always requires the real role too.
//
// Stored as a session-cookie custom claim rather than a second cookie: Firebase Hosting only
// ever forwards the cookie literally named `__session` to the SSR backend (confirmed against
// the live deployment — a second cookie set client-side never reached proxy.ts or any server
// component, see lib/firebase/session.ts's own header comment), so any per-viewer toggle state
// has to live inside that one cookie's own signed claims instead.
export function isSiteAdminModeOn(role: string | undefined, siteAdminModeClaim: boolean | undefined): boolean {
  return (role === "site_admin" || role === "dev_site_admin") && siteAdminModeClaim === true;
}

// Dev-site-admin's mode toggle — same pattern as siteAdminMode. A dev_site_admin with this off
// sees what a developer sees; on reveals full dev-site-admin surfaces.
export function isDevSiteAdminModeOn(role: string | undefined, devSiteAdminModeClaim: boolean | undefined): boolean {
  return role === "dev_site_admin" && devSiteAdminModeClaim === true;
}
