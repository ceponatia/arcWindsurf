import type { ReactNode } from 'react';

export interface HelpIconProps {
  /** Brief tooltip text for quick help */
  tooltip: string;
  /** Optional link to full documentation (hash route like "docs/character-builder") */
  docLink?: string;
  /** Size of the icon */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

export interface HelpPopoverProps {
  /** Title of the help section */
  title: string;
  /** Content to display (can be JSX) */
  children: ReactNode;
  /** Optional link to full documentation */
  docLink?: string;
  /** Trigger element (defaults to help icon button) */
  trigger?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}
