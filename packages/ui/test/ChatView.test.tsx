import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ChatView } from '../src/components/chat/ChatView.js';
import type { ChatViewMessage } from '../src/components/chat/types.js';

const baseHandlers = {
  onDraftChange: vi.fn(),
  onSend: vi.fn(),
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSaveEdit: vi.fn(),
  onDeleteMessage: vi.fn(),
};

const messages: ChatViewMessage[] = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there', speaker: { id: 'npc-1', name: 'Aria' } },
  { role: 'user', content: 'Another' },
];

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

describe('ChatView', () => {
  it('renders loading and error states', () => {
    const { container, unmount } = renderIntoDocument(
      <ChatView
        messages={[]}
        loading
        error={null}
        draft=""
        editingIdx={null}
        editDraft=""
        autoScroll={false}
        {...baseHandlers}
      />
    );

    try {
      expect(container.textContent ?? '').toContain('Loading session…');
    } finally {
      unmount();
    }
  });

  it('renders messages and allows edit/delete', () => {
    const { container, unmount } = renderIntoDocument(
      <ChatView
        messages={messages}
        loading={false}
        error={null}
        draft=""
        editingIdx={0}
        editDraft="Edit draft"
        autoScroll={false}
        {...baseHandlers}
      />
    );

    try {
      expect(container.textContent ?? '').toContain('Edit draft');

      const deleteButton = getButtonByText(container, 'Delete');
      act(() => {
        deleteButton.click();
      });
      expect(baseHandlers.onDeleteMessage).toHaveBeenCalledWith(0);

      const cancelButton = getButtonByText(container, 'Cancel');
      act(() => {
        cancelButton.click();
      });
      expect(baseHandlers.onCancelEdit).toHaveBeenCalled();

      const saveButton = getButtonByText(container, 'Save');
      act(() => {
        saveButton.click();
      });
      expect(baseHandlers.onSaveEdit).toHaveBeenCalledWith(0);
    } finally {
      unmount();
    }
  });

  it('shows redo on last user message', () => {
    const onRedo = vi.fn();
    const { container, unmount } = renderIntoDocument(
      <ChatView
        messages={messages}
        loading={false}
        error={null}
        draft=""
        editingIdx={null}
        editDraft=""
        autoScroll={false}
        onRedo={onRedo}
        {...baseHandlers}
      />
    );

    try {
      const redoButton = getButtonByTitle(container, 'Regenerate response');
      act(() => {
        redoButton.click();
      });
      expect(onRedo).toHaveBeenCalledWith(2);
    } finally {
      unmount();
    }
  });
});
