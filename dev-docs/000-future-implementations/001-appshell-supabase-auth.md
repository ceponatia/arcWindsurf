# Ticket: AppShell Supabase auth integration

## Summary

Integrate Supabase auth into AppShell and use `useAuth` to gate session access and startup flow.

## Acceptance criteria

- AppShell uses `useAuth` to derive user auth state.
- Unauthenticated users are blocked from creating or loading sessions and see a clear call-to-action.
- Authenticated users can create and load sessions without regressions.
- Existing chat and builder flows continue to work when auth is enabled.
- Add or update tests to cover auth-gated behavior, including the planned test in
  packages/web/test/AppShell.auth.todo.test.tsx.

## Notes

- Track the planned behavior in the existing todo test until implementation is complete.
