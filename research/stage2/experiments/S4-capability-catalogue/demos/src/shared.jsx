// Shared fixture data and helpers for the S4 demos. `report(key, value)` writes test-visible state to
// <body data-*> (not a live region, so it never pollutes the announcement log the tests record).
import React from 'react';
import { createRoot } from 'react-dom/client';

export const COMMANDS = [
  { id: 'new-invoice', label: 'New invoice', group: 'Create', shortcut: 'N I' },
  { id: 'new-client', label: 'New client', group: 'Create', shortcut: 'N C' },
  { id: 'new-project', label: 'New project', group: 'Create', shortcut: 'N P' },
  { id: 'go-dashboard', label: 'Go to dashboard', group: 'Navigate', shortcut: 'G D' },
  { id: 'go-invoices', label: 'Go to invoices', group: 'Navigate', shortcut: 'G I' },
  { id: 'go-settings', label: 'Go to settings', group: 'Navigate', shortcut: 'G S' },
  { id: 'toggle-theme', label: 'Switch theme', group: 'Preferences', shortcut: 'T' },
  { id: 'sign-out', label: 'Sign out', group: 'Preferences', shortcut: '' },
];
export const GROUPS = ['Create', 'Navigate', 'Preferences'];
export const ITEMS = ['Brief', 'Wireframes', 'Visual design', 'Build', 'Launch'].map((t, i) => ({ id: 'i' + (i + 1), label: t }));

export function report(key, value) { document.body.dataset[key] = typeof value === 'string' ? value : JSON.stringify(value); }

export function mount(App, title) {
  document.title = title;
  const root = document.getElementById('root');
  createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}

