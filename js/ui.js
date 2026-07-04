import { escapeHTML, formatDate, getStatusBadgeClass } from './utils.js';

// ==========================================================================
// DOM Elements - Modals
// ==========================================================================
const jobModal = document.getElementById('job-modal');
const resumeModal = document.getElementById('resume-modal');
const closeButtons = document.querySelectorAll('.close-modal');

// ==========================================================================
// Modal Control Functions
// ==========================================================================
export function openJobModal(title = 'Initialize New Target') {
    document.getElementById('modal-title').textContent = title;
    jobModal.classList.remove('hidden');
}

export function closeJobModal() {
    jobModal.classList.add('hidden');
    document.getElementById('job-form').reset();
    document.getElementById('job-id').value = '';
}

export function openResumeModal(jobId) {
    document.getElementById('resume-job-id').value = jobId;
    resumeModal.classList.remove('hidden');

    // Reset upload UI
    document.getElementById('upload-progress').classList.add('hidden');
    document.querySelector('.progress-fill').style.width = '0%';
    document.querySelector('.upload-status-text').textContent = 'Uploading to secure storage...';
}

export function closeResumeModal() {
    resumeModal.classList.add('hidden');
    document.getElementById('resume-file').value = '';
    document.getElementById('resume-job-id').value = '';
}

// Attach event listeners to all close buttons
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        closeJobModal();
        closeResumeModal();
    });
});

// Close modal if clicking on the overlay background
window.addEventListener('click', (e) => {
    if (e.target === jobModal) closeJobModal();
    if (e.target === resumeModal) closeResumeModal();
});

// ==========================================================================
// Table Rendering Engine
// ==========================================================================
export function renderTable(applications, onEdit, onDelete, onUploadResume, onViewResume) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; // Clear current rows

    if (applications.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No targets found in databank.</td></tr>`;
        return;
    }

    applications.forEach(app => {
        const tr = document.createElement('tr');

        // Check if resume exists
        const resumeAction = app.resume_file
            ? `<button class="action-btn view-resume" data-url="${escapeHTML(app.resume_file)}" title="View Tailored Resume"><i class="ph ph-file-pdf"></i></button>`
            : `<button class="action-btn upload-resume" data-id="${app.id}" title="Upload Tailored Resume"><i class="ph ph-upload-simple"></i></button>`;

        tr.innerHTML = `
            <td><strong>${escapeHTML(app.company_name)}</strong></td>
            <td>${escapeHTML(app.job_role)}</td>
            <td>${escapeHTML(app.job_portal) || '-'}</td>
            <td>${formatDate(app.date_applied)}</td>
            <td><span class="status-badge ${getStatusBadgeClass(app.status)}">${escapeHTML(app.status)}</span></td>
            <td>
                <div class="table-actions">
                    ${resumeAction}
                </div>
            </td>
            <td>
                <div class="table-actions">
                    ${app.job_link ? `<a href="${escapeHTML(app.job_link)}" target="_blank" class="action-btn" title="Go to Job Link"><i class="ph ph-link"></i></a>` : ''}
                    <button class="action-btn edit-btn" data-id="${app.id}" title="Edit Target"><i class="ph ph-pencil-simple"></i></button>
                    <button class="action-btn delete delete-btn" data-id="${app.id}" title="Delete Target"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        `;

        // Attach event listeners to dynamically created buttons
        tr.querySelector('.edit-btn').addEventListener('click', () => onEdit(app));
        tr.querySelector('.delete-btn').addEventListener('click', () => onDelete(app.id));

        if (app.resume_file) {
            tr.querySelector('.view-resume').addEventListener('click', () => onViewResume(app.resume_file));
        } else {
            tr.querySelector('.upload-resume').addEventListener('click', () => onUploadResume(app.id));
        }

        tableBody.appendChild(tr);
    });
}

// ==========================================================================
// Dashboard Statistics Engine
// ==========================================================================
export function updateStats(applications) {
    let stats = {
        total: applications.length,
        applied: 0,
        assessment: 0,
        interview: 0,
        offer: 0,
        rejected: 0 // Will combine rejected and ghosted
    };

    applications.forEach(app => {
        if (app.status === 'Applied') stats.applied++;
        else if (app.status === 'Assessment') stats.assessment++;
        else if (app.status === 'Interview') stats.interview++;
        else if (app.status === 'Offer') stats.offer++;
        else if (app.status === 'Rejected' || app.status === 'Ghosted') stats.rejected++;
    });

    // Animate numbers counting up (Optional, but adds to the premium feel)
    animateValue('stat-total', document.getElementById('stat-total').innerText, stats.total, 500);
    animateValue('stat-applied', document.getElementById('stat-applied').innerText, stats.applied, 500);
    animateValue('stat-assessment', document.getElementById('stat-assessment').innerText, stats.assessment, 500);
    animateValue('stat-interview', document.getElementById('stat-interview').innerText, stats.interview, 500);
    animateValue('stat-offer', document.getElementById('stat-offer').innerText, stats.offer, 500);
    animateValue('stat-rejected', document.getElementById('stat-rejected').innerText, stats.rejected, 500);
}

// Helper for number animation
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + parseInt(start || 0));
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}