## Description

Please include a summary of the change and the related Card ID.

- Card ID:
- Related AC:

## Type of Change

- [ ] `feat`: A new feature
- [ ] `fix`: A bug fix
- [ ] `docs`: Documentation only changes
- [ ] `test`: Adding missing tests or correcting existing tests
- [ ] `chore`: Changes to build process or auxiliary tools

## Security Checklist (SEC-NN)

Mark which controls apply to this PR (see `docs/code-review-checklist/04-security.md`):

- [ ] SEC-01: Password hashed with bcrypt
- [ ] SEC-02: Route protected by requireAuth / requireRole
- [ ] SEC-03: Session cookie attributes verified
- [ ] SEC-04: CSRF / Origin checked for state mutation
- [ ] SEC-05: Object-level access filtered by user_id
- [ ] SEC-06: Rate limiting on sensitive endpoints
- [ ] SEC-07: Input validated via schema
- [ ] SEC-08: Security headers and single CORS origin
- [ ] SEC-09: No internal stack traces exposed
- [ ] SEC-10: Audit trail recorded in loan_events
- [ ] SEC-11: Fine calculated via calculateFine / bounded manual
- [ ] SEC-12: QR token CSPRNG hash single-use
- [ ] SEC-13: Operational endpoints unregistered in production
- [ ] SEC-14: Secrets managed through environment
- [ ] SEC-15: PII minimized from logs and responses
- [ ] SEC-16: Accepted enumeration risk preserved
- [ ] SEC-17: Camera API requires HTTPS (secure context)

## Testing and Verification

- Available checks:
  - [ ] `bun run check` (`bun run typecheck && bun test && biome check`)
  - [ ] `bun run build:web`
  - [ ] `bun run e2e` (after wiring card adds the harness)
- [ ] Operation Status Tracker updated in `docs/api-specs/07-system.md` (TODO -> OK)
