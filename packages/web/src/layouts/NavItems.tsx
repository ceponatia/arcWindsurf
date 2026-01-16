import React from 'react';
import {
  NavButton,
  HomeIcon,
  UsersIcon,
  GlobeIcon,
  MapPinIcon,
  TagIcon,
  BoxIcon,
  ChatIcon,
} from './ShellComponents.js';
import type { AppControllerValue } from '../types.js';

interface NavItemsProps {
  controller: AppControllerValue;
  onItemClick?: () => void;
}

/**
 * Shared navigation items used in both mobile and desktop menus.
 */
export const NavItems: React.FC<NavItemsProps> = ({ controller, onItemClick }) => {
  const {
    viewMode,
    navigateToHome,
    navigateToCharacterLibrary,
    navigateToPersonaLibrary,
    navigateToSettingLibrary,
    navigateToLocationLibrary,
    navigateToTagLibrary,
    navigateToItemLibrary,
    navigateToSessionLibrary,
  } = controller;

  return (
    <>
      <NavButton
        icon={<HomeIcon className="w-5 h-5" />}
        label="Home"
        active={viewMode === 'home'}
        onClick={() => {
          navigateToHome();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<UsersIcon className="w-5 h-5" />}
        label="Characters"
        active={viewMode === 'character-library' || viewMode === 'character-studio'}
        onClick={() => {
          navigateToCharacterLibrary();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<UsersIcon className="w-5 h-5" />}
        label="Personas"
        active={viewMode === 'persona-library' || viewMode === 'persona-builder'}
        onClick={() => {
          navigateToPersonaLibrary();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<GlobeIcon className="w-5 h-5" />}
        label="Settings"
        active={viewMode === 'setting-library' || viewMode === 'setting-builder'}
        onClick={() => {
          navigateToSettingLibrary();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<MapPinIcon className="w-5 h-5" />}
        label="Locations"
        active={viewMode === 'location-library' || viewMode === 'location-builder'}
        onClick={() => {
          navigateToLocationLibrary();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<TagIcon className="w-5 h-5" />}
        label="Tags"
        active={viewMode === 'tag-library' || viewMode === 'tag-builder'}
        onClick={() => {
          navigateToTagLibrary();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<BoxIcon className="w-5 h-5" />}
        label="Items"
        active={viewMode === 'item-library' || viewMode === 'item-builder'}
        onClick={() => {
          navigateToItemLibrary();
          onItemClick?.();
        }}
      />
      <NavButton
        icon={<ChatIcon className="w-5 h-5" />}
        label="Sessions"
        active={viewMode === 'session-library' || viewMode === 'chat'}
        onClick={() => {
          navigateToSessionLibrary();
          onItemClick?.();
        }}
      />
    </>
  );
};
