-- Add locale column to quotes table for translated customer-facing emails and PDFs
alter table public.quotes
  add column if not exists locale text not null default 'en';
