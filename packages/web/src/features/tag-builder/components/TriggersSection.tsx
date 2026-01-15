import {
  TRIGGER_CONDITION_LABELS,
  type TagTriggerCondition,
  type TriggerFormEntry,
} from '../types.js';

interface TriggersSectionProps {
  triggers: TriggerFormEntry[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof TriggerFormEntry, value: string | boolean) => void;
}

export function TriggersSection({ triggers, onAdd, onRemove, onUpdate }: TriggersSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Trigger Conditions</h3>
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
        >
          + Add Trigger
        </button>
      </div>

      <p className="text-sm text-gray-400">
        Define when this tag should activate. Multiple triggers use OR logic — any matching trigger
        activates the tag.
      </p>

      {triggers.length === 0 ? (
        <div className="p-4 bg-gray-700/50 rounded border border-gray-600 text-center text-gray-400">
          No triggers defined. Add a trigger to specify activation conditions.
        </div>
      ) : (
        <div className="space-y-3">
          {triggers.map((trigger, index) => (
            <TriggerEntry
              key={index}
              index={index}
              trigger={trigger}
              onRemove={() => onRemove(index)}
              onUpdate={(field, value) => onUpdate(index, field, value)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface TriggerEntryProps {
  index: number;
  trigger: TriggerFormEntry;
  onRemove: () => void;
  onUpdate: (field: keyof TriggerFormEntry, value: string | boolean) => void;
}

function TriggerEntry({ index, trigger, onRemove, onUpdate }: TriggerEntryProps) {
  // Get the value field based on condition type
  const valueField = getValueField(trigger.condition);
  const currentValue = Object.getOwnPropertyDescriptor(trigger, valueField)?.value as
    | string
    | undefined;

  return (
    <div className="p-3 bg-gray-700/50 rounded border border-gray-600 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Trigger #{index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-sm transition-colors"
          aria-label="Remove trigger"
        >
          ✕ Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Condition Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Condition Type</label>
          <select
            value={trigger.condition}
            onChange={(e) => onUpdate('condition', e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(TRIGGER_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Condition Value */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {getValueLabel(trigger.condition)}
          </label>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onUpdate(valueField, e.target.value)}
            placeholder={getValuePlaceholder(trigger.condition)}
            className="w-full px-2 py-1.5 text-sm bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Invert toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={trigger.invert}
          onChange={(e) => onUpdate('invert', e.target.checked)}
          className="rounded bg-gray-600 border-gray-500"
        />
        Invert condition (activate when NOT matched)
      </label>
    </div>
  );
}

/**
 * Get the field name for the value input based on condition type.
 */
function getValueField(condition: TagTriggerCondition): keyof TriggerFormEntry {
  switch (condition) {
    case 'intent':
      return 'intents';
    case 'keyword':
      return 'keywords';
    case 'emotion':
      return 'emotions';
    case 'relationship':
      return 'relationshipLevels';
    case 'time':
      return 'timeRange';
    case 'location':
      return 'locationIds';
    case 'state':
      return 'stateFlags';
    default:
      return 'keywords';
  }
}

function getValueLabel(condition: TagTriggerCondition): string {
  switch (condition) {
    case 'intent':
      return 'Intents (comma-separated)';
    case 'keyword':
      return 'Keywords (comma-separated)';
    case 'emotion':
      return 'Emotions (comma-separated)';
    case 'relationship':
      return 'Relationship Levels';
    case 'time':
      return 'Time Range';
    case 'location':
      return 'Location IDs (comma-separated)';
    case 'state':
      return 'State Flags (comma-separated)';
    default:
      return 'Value';
  }
}

function getValuePlaceholder(condition: TagTriggerCondition): string {
  switch (condition) {
    case 'intent':
      return 'e.g., combat, romance, exploration';
    case 'keyword':
      return 'e.g., fight, battle, attack';
    case 'emotion':
      return 'e.g., angry, sad, excited';
    case 'relationship':
      return 'e.g., stranger, friend, lover';
    case 'time':
      return 'e.g., night, dawn, 18:00-22:00';
    case 'location':
      return 'e.g., tavern, forest, castle';
    case 'state':
      return 'e.g., quest_started, combat_active';
    default:
      return 'Enter value...';
  }
}
