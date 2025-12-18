-- Migration: 003_storage_bucket
-- Description: Creates the imaging storage bucket for case file uploads

-- Create the imaging bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'imaging',
    'imaging',
    false,
    52428800, -- 50MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/dicom', 'application/pdf', 'application/zip']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the imaging bucket

-- Policy: Users can upload files to their organization's folder
CREATE POLICY "Users can upload imaging files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'imaging'
    AND (storage.foldername(name))[1] = (
        SELECT org_id::text FROM public.profiles WHERE id = auth.uid()
    )
);

-- Policy: Users can view files from their organization
CREATE POLICY "Users can view org imaging files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'imaging'
    AND (storage.foldername(name))[1] = (
        SELECT org_id::text FROM public.profiles WHERE id = auth.uid()
    )
);

-- Policy: Expert reviewers can view files for assigned cases
CREATE POLICY "Reviewers can view assigned case imaging"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'imaging'
    AND EXISTS (
        SELECT 1 FROM public.reviews r
        JOIN public.cases c ON c.id = r.case_id
        WHERE r.reviewer_id = auth.uid()
        AND (storage.foldername(name))[1] = c.org_id::text
        AND (storage.foldername(name))[2] = c.id::text
    )
);

-- Policy: Sys admins can view all files
CREATE POLICY "Sys admins can view all imaging"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'imaging'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SYS_ADMIN'
    )
);

-- Policy: Users can delete their own uploaded files (draft cases only)
CREATE POLICY "Users can delete own draft case imaging"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'imaging'
    AND (storage.foldername(name))[1] = (
        SELECT org_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id::text = (storage.foldername(name))[2]
        AND c.submitter_id = auth.uid()
        AND c.status = 'DRAFT'
    )
);

