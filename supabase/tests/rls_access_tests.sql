-- DEPRECATED AFTER SECURITY HARDENING
--
-- The former test suite validated the removed access-code table and the removed
-- security-definer client views. Running it after migration 012 would test an
-- obsolete architecture and produce misleading failures.
--
-- Use, in this order:
--
--   1. supabase/tests/012_security_hardening_audit.sql
--   2. supabase/tests/012_security_role_tests.sql
--
-- Historical content remains available in Git history. This file is retained as
-- a deliberate compatibility marker for existing runbooks that reference its
-- path; it performs no writes and no authorization assertions.

select 'DEPRECATED: run 012_security_hardening_audit.sql and 012_security_role_tests.sql' as test_result;
