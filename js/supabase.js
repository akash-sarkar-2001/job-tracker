import { supabase } from './config.js';

// ==========================================================================
// User Session Management
// ==========================================================================
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

export async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// ==========================================================================
// CRUD Operations: Applications
// ==========================================================================
export async function fetchApplications() {
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function saveApplication(jobData, jobId = null) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");

    const payload = {
        user_id: user.id,
        company_name: jobData.company,
        job_role: jobData.role,
        status: jobData.status,
        date_applied: jobData.date || null,
        job_portal: jobData.portal,
        location: jobData.location,
        job_link: jobData.link,
        notes: jobData.notes,
        updated_at: new Date().toISOString()
    };

    if (jobId) {
        // Update existing record
        const { data, error } = await supabase
            .from('applications')
            .update(payload)
            .eq('id', jobId)
            .select();
        if (error) throw error;
        return data;
    } else {
        // Insert new record
        const { data, error } = await supabase
            .from('applications')
            .insert([payload])
            .select();
        if (error) throw error;
        return data;
    }
}

export async function deleteApplication(jobId) {
    const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', jobId);

    if (error) throw error;
}

// ==========================================================================
// Storage Operations: Resumes
// ==========================================================================
export async function uploadResumeFile(jobId, file, onProgress) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required.");

    // Create a unique file path: user_id/job_id_filename
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${jobId}_${Date.now()}.${fileExt}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) throw uploadError;

    // Simulate progress for UI (Supabase JS doesn't have native upload progress yet)
    onProgress(100);

    // 2. Update the application record with the file path
    const { error: dbError } = await supabase
        .from('applications')
        .update({ resume_file: filePath })
        .eq('id', jobId);

    if (dbError) throw dbError;

    return filePath;
}

export async function getResumeUrl(filePath) {
    // Generates a secure, temporary URL valid for 60 seconds
    const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 60);

    if (error) throw error;
    return data.signedUrl;
}