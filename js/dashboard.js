import {
    getCurrentUser, logoutUser, fetchApplications, saveApplication,
    deleteApplication, uploadResumeFile, getResumeUrl
} from './supabase.js';
import {
    renderTable, updateStats, openJobModal, closeJobModal,
    openResumeModal, closeResumeModal
} from './ui.js';
import { debounce } from './utils.js';
import { showToast } from './auth.js'; // Reusing toast logic

// ==========================================================================
// Global State
// ==========================================================================
let allApplications = [];
let statusChartInstance = null;

// ==========================================================================
// Initialization & Authentication Guard
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = 'index.html'; // Kick out unauthenticated users
            return;
        }

        document.getElementById('user-email').textContent = user.email;
        await refreshDashboard();

    } catch (error) {
        showToast('System initialization failed: ' + error.message, 'error');
    }
});

// ==========================================================================
// Core Operations
// ==========================================================================
async function refreshDashboard() {
    try {
        allApplications = await fetchApplications();
        applyFiltersAndSort(); // This calls renderTable and updateStats
        renderCharts();
    } catch (error) {
        showToast('Failed to retrieve databank: ' + error.message, 'error');
    }
}

// ==========================================================================
// UI Event Listeners
// ==========================================================================

// --- Navigation ---
document.getElementById('logout-btn').addEventListener('click', async () => {
    await logoutUser();
    window.location.href = 'index.html';
});

// --- Modal Triggers ---
document.getElementById('btn-add-job').addEventListener('click', () => {
    openJobModal('Initialize New Target');
});

// --- Job Form Submission ---
document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    const jobId = document.getElementById('job-id').value;
    const jobData = {
        company: document.getElementById('job-company').value,
        role: document.getElementById('job-role').value,
        status: document.getElementById('job-status').value,
        date: document.getElementById('job-date').value,
        portal: document.getElementById('job-portal').value,
        location: document.getElementById('job-location').value,
        link: document.getElementById('job-link').value,
        notes: document.getElementById('job-notes').value
    };

    try {
        await saveApplication(jobData, jobId || null);
        showToast(`Target successfully ${jobId ? 'updated' : 'initialized'}.`, 'success');
        closeJobModal();
        await refreshDashboard();
    } catch (error) {
        showToast('Database write error: ' + error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// --- Table Action Handlers (Passed to renderTable) ---
window.handleEditJob = (job) => {
    document.getElementById('job-id').value = job.id;
    document.getElementById('job-company').value = job.company_name;
    document.getElementById('job-role').value = job.job_role;
    document.getElementById('job-status').value = job.status;
    document.getElementById('job-date').value = job.date_applied ? job.date_applied.split('T')[0] : '';
    document.getElementById('job-portal').value = job.job_portal || '';
    document.getElementById('job-location').value = job.location || '';
    document.getElementById('job-link').value = job.job_link || '';
    document.getElementById('job-notes').value = job.notes || '';

    openJobModal('Modify Target Parameters');
};

window.handleDeleteJob = async (jobId) => {
    if (confirm('CRITICAL ACTION: Are you sure you want to purge this target from the databank?')) {
        try {
            await deleteApplication(jobId);
            showToast('Target purged successfully.', 'success');
            await refreshDashboard();
        } catch (error) {
            showToast('Failed to purge target: ' + error.message, 'error');
        }
    }
};

window.handleUploadResumeClick = (jobId) => {
    openResumeModal(jobId);
};

window.handleViewResume = async (filePath) => {
    try {
        showToast('Decrypting file link...', 'success');
        const url = await getResumeUrl(filePath);
        window.open(url, '_blank');
    } catch (error) {
        showToast('Failed to retrieve file: ' + error.message, 'error');
    }
};

// --- File Upload Logic ---
const fileInput = document.getElementById('resume-file');
const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--neon-blue)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--glass-border)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--glass-border)';
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        processFileUpload();
    }
});

fileInput.addEventListener('change', processFileUpload);

async function processFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File exceeds 10MB limit.', 'error');
        return;
    }

    const jobId = document.getElementById('resume-job-id').value;
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.querySelector('.progress-fill');

    progressContainer.classList.remove('hidden');

    try {
        await uploadResumeFile(jobId, file, (percent) => {
            progressBar.style.width = `${percent}%`;
        });

        setTimeout(() => {
            showToast('Resume securely stored.', 'success');
            closeResumeModal();
            refreshDashboard();
        }, 500);

    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
        progressContainer.classList.add('hidden');
    }
}

// ==========================================================================
// Searching, Filtering, and Sorting
// ==========================================================================
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('filter-status');
const sortSelect = document.getElementById('sort-data');

function applyFiltersAndSort() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterVal = statusFilter.value;
    const sortVal = sortSelect.value;

    let filtered = allApplications.filter(app => {
        const matchesSearch =
            (app.company_name && app.company_name.toLowerCase().includes(searchTerm)) ||
            (app.job_role && app.job_role.toLowerCase().includes(searchTerm)) ||
            (app.job_portal && app.job_portal.toLowerCase().includes(searchTerm));

        const matchesStatus = filterVal === 'All' || app.status === filterVal;

        return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
        if (sortVal === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortVal === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortVal === 'company-asc') return a.company_name.localeCompare(b.company_name);
        if (sortVal === 'company-desc') return b.company_name.localeCompare(a.company_name);
        return 0;
    });

    renderTable(filtered, window.handleEditJob, window.handleDeleteJob, window.handleUploadResumeClick, window.handleViewResume);
    updateStats(filtered);
}

searchInput.addEventListener('input', debounce(applyFiltersAndSort, 300));
statusFilter.addEventListener('change', applyFiltersAndSort);
sortSelect.addEventListener('change', applyFiltersAndSort);

// ==========================================================================
// Chart.js Visualization
// ==========================================================================
function renderCharts() {
    const ctx = document.getElementById('statusChart').getContext('2d');

    // Count statuses
    const statusCounts = { Applied: 0, Assessment: 0, Interview: 0, Offer: 0, Rejected: 0, Ghosted: 0 };
    allApplications.forEach(app => {
        if (statusCounts[app.status] !== undefined) statusCounts[app.status]++;
    });

    if (statusChartInstance) statusChartInstance.destroy();

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#ffb800', '#00e5ff', '#b026ff', '#00ff9d', '#ff3366', '#888888'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                title: { display: true, text: 'Target Distribution', color: '#f8fafc', font: { family: "'JetBrains Mono', monospace", size: 16 } }
            }
        }
    });
}

// ==========================================================================
// Data Export (CSV)
// ==========================================================================
document.getElementById('btn-export').addEventListener('click', () => {
    if (allApplications.length === 0) {
        showToast('No data to export.', 'warning');
        return;
    }

    const headers = ['Company', 'Role', 'Status', 'Date Applied', 'Portal', 'Location', 'Notes'];
    const csvRows = [headers.join(',')];

    allApplications.forEach(app => {
        const row = [
            `"${app.company_name || ''}"`,
            `"${app.job_role || ''}"`,
            `"${app.status || ''}"`,
            `"${app.date_applied || ''}"`,
            `"${app.job_portal || ''}"`,
            `"${app.location || ''}"`,
            `"${(app.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
        ];
        csvRows.push(row.join(','));
    });

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Target_Intel_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});