import type { ReactNode } from 'react';

export interface AppHeaderProps {
  characterName?: string | undefined;
  settingName?: string | undefined;
  hasSession?: boolean;
}

export interface PreviewSidebarLayoutProps {
  /** Content to display in the preview card */
  children: ReactNode;
  /** Title for the preview section */
  title?: string | undefined;

  // Action panel props
  /** Label for the save button */
  saveLabel?: string | undefined;
  /** Label for the delete button */
  deleteLabel?: string | undefined;
  /** Title for delete confirmation modal */
  deleteTitle?: string | undefined;
  /** Label for the close/cancel button */
  closeLabel?: string | undefined;
  /** Label for the edit button */
  editLabel?: string | undefined;
  /** Called when save is clicked */
  onSave: () => void;
  /** Called when cancel is clicked */
  onCancel?: (() => void) | undefined;
  /** Called when edit button is clicked (to enter edit mode) */
  onEdit?: (() => void) | undefined;
  /** Called when delete is confirmed */
  onDelete?: (() => void | Promise<void>) | undefined;
  /** Whether any operation is in progress */
  disabled?: boolean | undefined;
  /** Whether save is currently in progress */
  saving?: boolean | undefined;
  /** Whether user is currently in edit mode (fields unlocked) */
  isInEditMode?: boolean | undefined;
  /** Whether this is editing an existing item (shows delete button) */
  isEditing?: boolean | undefined;
  /** Error message to display */
  error?: string | null | undefined;
  /** Load error message to display */
  loadError?: string | null | undefined;
  /** Success message to display */
  success?: string | null | undefined;
  /** Name of the item for delete confirmation message */
  itemName?: string | undefined;
}
