import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuilderActionPanel } from '../src/components/forms/BuilderActionPanel.js';

describe('BuilderActionPanel', () => {
  it('renders save and cancel buttons', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<BuilderActionPanel onSave={onSave} onCancel={onCancel} isInEditMode isEditing />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('opens delete confirmation modal', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <BuilderActionPanel
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
        isInEditMode
        isEditing
        itemName="Test"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onDelete).toHaveBeenCalled();
  });
});
