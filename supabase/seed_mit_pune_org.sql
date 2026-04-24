-- Run in Supabase → SQL Editor. Safe to run more than once.
-- Ensures the org referenced by homepage "View Demo" (/org/mit-pune) exists.

INSERT INTO public.orgs (name, slug)
VALUES ('MIT Pune', 'mit-pune')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;
