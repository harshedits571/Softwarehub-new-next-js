/**
 * 🔒 HARSH EDITS - SECURITY LAYER (RELAXED)
 * This script handles obfuscation and basic protection.
 */

(function() {
    // 1. Obfuscated Firebase Config
    const _0x4f2a = 'eyJhcGlLZXkiOiJBSXphU3lES3FyM09iVkVNcFo1XzFfaWJXMkstS0REdzFrcnVlU0EiLCJhdXRoRG9tYWluIjoid2ViLWFkbWluLTk1NjFjLmZpcmViYXNlYXBwLmNvbSIsImRhdGFiYXNlVVJMIjoiaHR0cHM6Ly93ZWItYWRtaW4tOTU2MWMtZGVmYXVsdC1ydGRiLmZpcmViYXNlaW8uY29tIiwicHJvamVjdElkIjoid2ViLWFkbWluLTk1NjFjIiwic3RvcmFnZUJ1Y2tldCI6IndlYi1hZG1pbi05NTYxYy5maXJlYmFzZXN0b3JhZ2UuYXBwIiwibWVzc2FnaW5nU2VuZGVySWQiOiI2MzAxNDQ5MTA4MDAiLCJhcHBJZCI6IjE6NjMwMTQ0OTEwODAwOndlYjo2MWRjMTkyZDg1ZTg5MmMyYTU2NWQ1IiwibWVhc3VyZW1lbnRJZCI6IkctNjlaNDlWSFFZMSJ9';
    window._firebaseConfig = JSON.parse(atob(_0x4f2a));

    // 2. Anti-Inspect (Lightweight)
    // We only disable right-click and shortcuts, no more "Kill Page" logic.
    
    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    });

    console.log("%cSoftwhereHub Security Active", "color: #6366f1; font-size: 20px; font-weight: bold;");
})();
