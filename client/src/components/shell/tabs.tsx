import React from 'react';
import PantryManager from '../PantryManager';
import RecipeManager from '../RecipeManager';
import { BookmarkIcon, CookIcon, KitchenIcon } from './icons';

export type TabId = 'kitchen' | 'cook' | 'recipes';

export interface TabDef {
  id: TabId;
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  /** The screen shown in this tab's panel. Swap these as the real screens land. */
  Screen: React.FC;
}

/** The single tab -> component mapping. Kitchen is the default after sign-in. */
export const TABS: TabDef[] = [
  { id: 'kitchen', label: 'Kitchen', Icon: KitchenIcon, Screen: PantryManager },
  { id: 'cook', label: 'Cook', Icon: CookIcon, Screen: RecipeManager },
  { id: 'recipes', label: 'My recipes', Icon: BookmarkIcon, Screen: RecipeManager },
];

export const DEFAULT_TAB: TabId = 'kitchen';
