-- Add clinical_data JSONB to cases for comprehensive 14-section clinical submission
-- Migration: 014_clinical_data_jsonb

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS clinical_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cases.clinical_data IS 'Structured 14-section clinical form data (history, exam, pathology, procedure, etc.)';
