// LOS Global Configuration Map
//
// PLATFORM-AGNOSTIC: This template ships with NO hardcoded LOS domains.
// To target your LOS, fill in `urlPatterns` below.
//
// `urlPatterns` is an ordered list of regexes applied to the visible URL to
// extract context. Each regex must define named capture groups so
// parseContext() can build a context object:
//   entityId  -> the primary record identifier (e.g. loan/deal/file ID)
//   entityTab -> the active tab/view inside that record (optional)
//   subdomain -> host subdivision shown in the sidebar (optional)
// Add as many patterns as your LOS needs (production, sandbox, mock...).
// Rename the groups to match your LOS's vocabulary if you like, then update
// the keys in parseContext() accordingly.
const LosConfig = {
    // Layout positioning config: 'left' | 'right'
    sidebarPosition: 'right',

    // Ordered list of URL patterns to extract context from.
    // The first pattern that matches wins.
    urlPatterns: [
        // Live LOS hosts: https://<subdomain>.your-los.com/loan/<id>/<tab>
        /https:\/\/(?<subdomain>[^.]+)\.your-los\.com\/.*loan\/(?<entityId>[^\/]+)\/?(?<entityTab>[^\/?#]+)?/,

        // Localhost test/mock server: http://localhost:<port>/loan/<id>/<tab>
        /http:\/\/localhost:\d+\/.*loan\/(?<entityId>[^\/]+)\/?(?<entityTab>[^\/?#]+)?/
    ],

    // Declarative UI Array - Add buttons here and they auto-inject based on tab regex
    customFABs: [
        {
            id: 'sync-crm',
            label: 'Sync to CRM',
            css: 'bottom: 20px; right: 20px; background: #007bff; color: white;',
            tabRegex: /.*/
        },
        {
            id: 'start-video',
            label: 'Start Video Room',
            css: 'bottom: 70px; right: 20px; background: #28a745; color: white;',
            tabRegex: /Borrower_Information/i
        }
    ],

    // Helper: extract named regex groups from a URL and set fallback values.
    // Returns null when no pattern matches (context stays "disconnected").
    parseContext: (url) => {
        for (const pattern of LosConfig.urlPatterns) {
            const match = url.match(pattern);
            if (!match) continue;
            const groups = match.groups || {};
            return {
                subdomain: groups.subdomain || 'unknown-host',
                entityId: groups.entityId || null,
                entityTab: groups.entityTab || 'Home'
            };
        }
        return null;
    }
};

// Unified export compatibility: Node.js (CommonJS) and browser contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LosConfig;
} else {
    window.LosConfig = LosConfig;
}
