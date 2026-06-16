-- Allow DNA (did not attend) as an appointment status.
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('booked', 'cancelled', 'dna'));
