// ==========================================================================
// Utility Helper Functions
// ==========================================================================

/**
 * Sanitizes strings to prevent XSS before rendering to the DOM
 */
export function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Formats a date string (YYYY-MM-DD) into a more readable format (e.g., Oct 24, 2025)
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Maps a job status to its corresponding CSS badge class
 */
export function getStatusBadgeClass(status) {
    const statusMap = {
        'Applied': 'status-applied',
        'Assessment': 'status-assessment',
        'Interview': 'status-interview',
        'Offer': 'status-offer',
        'Rejected': 'status-rejected',
        'Ghosted': 'status-ghosted'
    };
    return statusMap[status] || 'status-applied';
}

/**
 * Debounce function to limit how often a function executes (used for search input)
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}