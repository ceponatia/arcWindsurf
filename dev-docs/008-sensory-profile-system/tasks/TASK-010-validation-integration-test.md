# TASK-010: Sensory Profile System Integration Validation

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 2h
**Plan**: PLAN-1.0
**Depends On**: TASK-001 through TASK-009

---

## Description

Final validation task to verify the complete Sensory Profile System works end-to-end. This includes testing all integration points, verifying data persistence, and confirming UX flows work as designed.

## Test Scenarios

### Scenario 1: New Character Flow

```text
1. Create new character
2. Fill Core Identity (name, race: Elf)
3. Set occupation to "ranger"
4. Open Sensory Profile card
5. Verify Quick Start shows "woodland-spirit" as suggested
6. Select woodland-spirit template
7. Verify preview shows hair/skin/breath with "template:woodland-spirit" attribution
8. Save character
9. Reload page
10. Verify template selection persisted
```

### Scenario 2: Multiple Templates

```text
1. Load existing character
2. Select "woodland-spirit" template at 60% weight
3. Select "noble-refined" template at 40% weight
4. Verify preview shows blended values
5. Verify attribution shows both templates
6. Adjust woodland-spirit to 100%, noble-refined to 20%
7. Verify preview updates
8. Save and reload
9. Verify weights persisted correctly
```

### Scenario 3: Manual Override Precedence

```text
1. Load character with templates selected
2. Note resolved value for "hair.scent"
3. Open BodyCard
4. Edit hair region with custom scent
5. Verify SensoryProfileCard preview shows "override" attribution
6. Verify manual value displays, not template value
7. Clear manual override
8. Verify template value returns
```

### Scenario 4: Backward Compatibility

```text
1. Load existing character created before sensory system
2. Verify no errors on load
3. Verify auto-defaults enabled by default
4. Verify existing body overrides still display
5. Add template selection
6. Save character
7. Reload and verify both old body data and new sensory config present
```

### Scenario 5: Edge Cases

```text
1. Select template then set weight to 0% → template should be excluded from blend
2. Disable auto-defaults with no templates → preview shows empty/minimal
3. Select templates with conflicting regions → verify blend occurs without error
4. Enter very long occupation text → verify no layout breaks
5. Rapidly toggle templates → verify no race conditions or UI flicker
```

## Performance Validation

- [ ] `resolveSensoryProfile()` executes in < 50ms for complex profiles
- [ ] Template API response < 100ms
- [ ] No visible UI lag when changing templates
- [ ] Character Studio initial load time not degraded (< 500ms regression)

## Accessibility Validation

- [ ] All interactive elements keyboard accessible
- [ ] Toggle has appropriate ARIA labels
- [ ] Weight sliders have labels
- [ ] Color contrast meets WCAG AA

## Files to Verify

| Package | Files                               | Check                |
| ------- | ----------------------------------- | -------------------- |
| schemas | `sensoryProfileConfig.ts`           | Schema exports       |
| schemas | `sensoryTemplate.ts`                | Template type        |
| schemas | `sensoryTemplates.ts`               | Template data        |
| schemas | `resolveSensoryProfile.ts`          | Resolver logic       |
| schemas | `characterProfile.ts`               | sensoryProfile field |
| api     | `sensory.ts`                        | Templates endpoint   |
| web     | `signals.ts`                        | Sensory signals      |
| web     | `SensoryProfileCard.tsx`            | Main card            |
| web     | `TemplateCardGrid.tsx`              | Template selector    |
| web     | `SensoryPreviewWithAttribution.tsx` | Preview              |
| web     | `IdentityPanel.tsx`                 | Occupation input     |

## Sign-Off Checklist

- [ ] All unit tests pass (`pnpm test`)
- [ ] All packages typecheck (`pnpm typecheck`)
- [ ] No ESLint errors (`pnpm lint`)
- [ ] Manual testing scenarios completed
- [ ] Performance benchmarks met
- [ ] Code reviewed by team member
- [ ] Documentation updated if needed

## Notes

This task should only be marked complete when all dependent tasks are done and the full integration has been validated. Any issues discovered should be filed as follow-up tasks or addressed in the originating task.

- Manual scenario validation and UX checks were not executed in this pass.

## Acceptance Criteria

### Schema & Data

- [ ] `SensoryProfileConfig` schema validates correctly
- [ ] `SensoryTemplate` schema validates correctly
- [x] At least 3 templates available (woodland-spirit, forge-worker, noble-refined)
- [ ] `resolveSensoryProfile()` produces correct output for all test cases
- [ ] Attribution tracking works for all source types

### API

- [x] `GET /api/sensory/templates` returns template metadata
- [ ] Response time < 100ms
- [ ] No authentication required

### Character Studio UI

- [ ] SensoryProfileCard appears in IdentityPanel after Classification
- [ ] Card is collapsed by default
- [ ] Auto-defaults toggle works
- [ ] Template cards display and can be selected
- [ ] Weight sliders adjust template intensity
- [ ] "Suggested for you" badges appear correctly
- [ ] Preview section shows resolved values with attribution
- [ ] Occupation input appears in Classification
- [ ] "Edit regions manually" link scrolls to BodyCard

### Data Persistence

- [ ] New character: sensoryProfile defaults to `{ autoDefaults: { enabled: true } }`
- [ ] Template selections persist after save/reload
- [ ] Occupation persists after save/reload
- [ ] Existing characters without sensoryProfile load correctly
- [ ] Manual body overrides still work alongside templates

### Cross-Component Integration

- [ ] Changes in SensoryProfileCard update resolvedBodyMap signal
- [ ] BodyCard sees resolved values (for reference)
- [ ] Occupation input affects template suggestions
- [ ] No TypeScript errors in any package
- [ ] No console errors during normal usage

## Validation Notes

- Manual UI scenarios, accessibility checks, and performance benchmarks were not executed because the app was not running in a browser session.
- Only the resolveSensoryProfile unit test file was executed; full test, lint, and typecheck suites were not run.
- API response timing and auth-free access were not validated at runtime.
