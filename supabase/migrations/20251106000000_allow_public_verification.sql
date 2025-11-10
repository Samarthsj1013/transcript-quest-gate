-- Allow public access to view APPROVED transcript requests for verification
-- This enables the /verify/:id page to work without authentication

CREATE POLICY "Anyone can verify approved transcripts"
ON public.transcript_requests
FOR SELECT
USING (status = 'APPROVED');

-- Note: This policy allows anyone to view APPROVED transcript requests
-- which is necessary for the public QR code verification feature.
-- Only APPROVED requests are visible, and they only show basic student info.
-- Sensitive data like rejection reasons are not exposed for approved requests.
