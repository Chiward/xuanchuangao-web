-- Add is_read column to feedback table
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Update RLS policies to allow admins to view/update all feedback
-- Note: Service Role (which the admin API uses) bypasses RLS, so we might not need to change RLS for admin access.
-- However, if we want to be explicit or if we have an "admin" user role in the auth.users table:

-- Create index for faster filtering by status and is_read
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_is_read ON public.feedback (is_read);
