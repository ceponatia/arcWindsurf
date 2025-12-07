# Setting Schemas

Zod schemas for game setting/world profiles.

## Files

| File            | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `background.ts` | Core setting schema with lore and themes                               |
| `index.ts`      | Re-exports `SettingProfileSchema` (alias of `SettingBackgroundSchema`) |

## SettingProfileSchema

Defines a game world or setting:

```ts
{
  id: string,
  name: string,          // Max 80 chars
  lore: string,          // World description and history
  themes?: string[],     // Narrative themes
  tags?: SettingTag[],   // Gameplay tags for prompt rules
}
```

## Setting Tags

Tags that trigger tag-specific prompt rules:

```ts
'romance' | 'adventure' | 'mystery' | 'foot fetish' | 'dirty';
```

These tags are used to inject additional narrative rules from the corresponding prompt configuration files (e.g., `system-prompt-romance.json`).
