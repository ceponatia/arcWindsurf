# TASK-013: Integrate All Personality Cards into IdentityPanel

**Priority**: P0
**Estimate**: 1 hour
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-004 through TASK-012

---

## Objective

Assemble all personality cards into the IdentityPanel in a logical, usable order.

## File to Modify

`packages/web/src/features/character-studio/components/IdentityPanel.tsx`

## Card Order

Arrange cards in order of importance and workflow:

1. **Basic Info** (name, age, summary) - likely already exists
2. **Backstory** (TASK-004)
3. **Classification** (TASK-005)
4. **Personality Dimensions** - BigFiveSliders (TASK-006)
5. **Emotional Baseline** (TASK-007)
6. **Values & Motivations** (TASK-008)
7. **Fears & Triggers** (TASK-009)
8. **Social Patterns** (TASK-010)
9. **Voice & Communication** (TASK-011)
10. **Stress Response** (TASK-012)

## Implementation

```tsx
import { IdentityCard } from './IdentityCard.js';
import { BigFiveSliders } from './personality/BigFiveSliders.js';
import { EmotionalBaselineForm } from './personality/EmotionalBaselineForm.js';
import { ValuesList } from './personality/ValuesList.js';
import { FearsList } from './personality/FearsList.js';
import { SocialPatternsForm } from './personality/SocialPatternsForm.js';
import { SpeechStyleForm } from './personality/SpeechStyleForm.js';
import { StressBehaviorForm } from './personality/StressBehaviorForm.js';

export const IdentityPanel: React.FC = () => {
  useSignals();

  return (
    <div className="space-y-4 overflow-y-auto">
      {/* Basic Info card - existing */}

      <IdentityCard title="Backstory" defaultOpen={false}>
        {/* textarea */}
      </IdentityCard>

      <IdentityCard title="Classification" defaultOpen={false}>
        {/* race/alignment/tier selects */}
      </IdentityCard>

      <IdentityCard title="Personality Dimensions" defaultOpen={true}>
        <BigFiveSliders />
      </IdentityCard>

      <IdentityCard title="Emotional Baseline" defaultOpen={false}>
        <EmotionalBaselineForm />
      </IdentityCard>

      <IdentityCard title="Values & Motivations" defaultOpen={false}>
        <ValuesList />
      </IdentityCard>

      <IdentityCard title="Fears & Triggers" defaultOpen={false}>
        <FearsList />
      </IdentityCard>

      <IdentityCard title="Social Patterns" defaultOpen={false}>
        <SocialPatternsForm />
      </IdentityCard>

      <IdentityCard title="Voice & Communication" defaultOpen={false}>
        <SpeechStyleForm />
      </IdentityCard>

      <IdentityCard title="Stress Response" defaultOpen={false}>
        <StressBehaviorForm />
      </IdentityCard>
    </div>
  );
};
```

## Default Open State

- Basic Info: open (primary editing target)
- Personality Dimensions: open (high value, visual)
- All others: closed (progressive disclosure)

## Acceptance Criteria

- [ ] All cards render in IdentityPanel
- [ ] Cards collapse/expand independently
- [ ] Scroll works when many cards open
- [ ] No TypeScript errors
- [ ] Visual layout is clean and usable
