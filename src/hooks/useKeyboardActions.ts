import { useEffect } from 'react';

interface KeyboardActionOptions {
  enabled?: boolean;
  onEscape?: () => void;
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    tagName === 'input'
  );
};

const isNativeKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest('button, a, [role="button"], input[type="button"], input[type="submit"]')
  );
};

const isClickable = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  const ariaDisabled = element.getAttribute('aria-disabled') === 'true';
  const disabled = element instanceof HTMLButtonElement && element.disabled;

  return (
    !disabled &&
    !ariaDisabled &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  );
};

const clickFirstAction = (selector: string) => {
  const action = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isClickable);

  if (!action) return false;
  action.click();
  return true;
};

export function useKeyboardActions({ enabled = true, onEscape }: KeyboardActionOptions = {}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Enter') {
        if (isEditableTarget(event.target) || isNativeKeyboardTarget(event.target)) return;

        if (clickFirstAction('[data-keyboard-primary="true"]')) {
          event.preventDefault();
        }
      }

      if (event.key === 'Escape') {
        if (isEditableTarget(event.target)) {
          (event.target as HTMLElement).blur();
          return;
        }

        if (clickFirstAction('[data-keyboard-cancel="true"]')) {
          event.preventDefault();
          return;
        }

        onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape]);
}
