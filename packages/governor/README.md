# @minimal-rpg/governor

The Governor is the orchestration layer for the Minimal RPG. It is responsible for:

1. **Intent Detection**: Analyzing player input to determine what they want to do.
2. **Routing**: Dispatching the request to the appropriate specialized agent (Map, NPC, Rules).
3. **State Management**: Using `@minimal-rpg/state-manager` to recall effective state and commit state updates.
4. **Response Generation**: Aggregating agent outputs into a cohesive narrative.

## Usage

```typescript
import { Governor } from '@minimal-rpg/governor';

const governor = new Governor(config);
const result = await governor.handleTurn(sessionId, playerInput);
```
