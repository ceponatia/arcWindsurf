import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { CharactersPanel } from '../src/components/data-display/CharactersPanel.js';

const characters = [{ id: 'c1', name: 'Hero', summary: 'Brave', tags: ['tag'] }];

type RenderResult = {
  container: HTMLDivElement;
  unmount: () => void;
};

/**
 * Renders a React element into the document for DOM assertions.
 */
const renderIntoDocument = (element: React.ReactElement): RenderResult => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

/**
 * Finds a button by its visible text content.
 */
const getButtonByText = (container: HTMLElement, text: string): HTMLButtonElement => {
  const buttons = Array.from(container.querySelectorAll('button'));
  const match = buttons.find((button) => button.textContent?.trim() === text);
  if (!match) {
    throw new Error(`Missing button with text: ${text}`);
  }

  return match as HTMLButtonElement;
};

/**
 * Finds a button by its title attribute.
 */
const getButtonByTitle = (container: HTMLElement, title: string): HTMLButtonElement => {
  const match = container.querySelector(`button[title="${title}"]`);
  if (!match) {
    throw new Error(`Missing button with title: ${title}`);
  }

  return match as HTMLButtonElement;
};

describe('CharactersPanel', () => {
  it('renders list and handles actions', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();

    const { container, unmount } = renderIntoDocument(
      <CharactersPanel
        selectedId={null}
        onSelect={onSelect}
        onEdit={onEdit}
        characters={characters}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
        onDeleteRequest={onDeleteRequest}
      />
    );

    try {
      const heroButton = getButtonByText(container, 'Hero');
      act(() => {
        heroButton.click();
      });
      expect(onSelect).toHaveBeenCalledWith('c1');

      const deleteButton = getButtonByTitle(container, 'Delete character');
      act(() => {
        deleteButton.click();
      });
      expect(onDeleteRequest).toHaveBeenCalledWith('c1');

      const editButton = getButtonByTitle(container, 'Edit character');
      act(() => {
        editButton.click();
      });
      expect(onEdit).toHaveBeenCalledWith('c1');
    } finally {
      unmount();
    }
  });

  it('shows retry on error', () => {
    const onRefresh = vi.fn();
    const { container, unmount } = renderIntoDocument(
      <CharactersPanel
        selectedId={null}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        characters={[]}
        loading={false}
        error="Oops"
        onRefresh={onRefresh}
      />
    );

    try {
      const retryButton = getButtonByText(container, 'Retry');
      act(() => {
        retryButton.click();
      });
      expect(onRefresh).toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
});
