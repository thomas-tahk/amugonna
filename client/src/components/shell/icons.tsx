import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

/** Fridge: Kitchen tab */
export const KitchenIcon: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M5 10h14" />
    <path d="M9 6v1.5M9 13v3" />
  </svg>
);

/** Pot with steam: Cook tab */
export const CookIcon: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M4 11h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
    <path d="M2 11h2M20 11h2" />
    <path d="M9 3c-1 1.5 1 2.5 0 4M14 3c-1 1.5 1 2.5 0 4" />
  </svg>
);

/** Bookmark: My recipes tab */
export const BookmarkIcon: React.FC<IconProps> = (props) => (
  <svg {...base} {...props}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
  </svg>
);

/** Brand mark: a simple leaf/flame */
export const BrandIcon: React.FC<IconProps> = (props) => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <path d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 12 22a5 5 0 0 1-5-9.5c0 2 1.5 3 2.5 3C8.5 11 10 6 12 2z" />
  </svg>
);
