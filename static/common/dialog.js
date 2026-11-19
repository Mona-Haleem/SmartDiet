export function trapDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [contenteditable="true"], [tabindex]')]
    .filter(element => !element.disabled && (element.tabIndex >= 0 || (element.matches('[contenteditable="true"]') && !element.hasAttribute('tabindex'))) && !element.closest('[hidden], [inert]')
      && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none'
      && ![...ancestors(element, dialog)].some(parent => getComputedStyle(parent).display === 'none'));
  const first = controls[0], last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    dialog.focus();
  } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
}

function* ancestors(element, root) {
  for (let parent = element.parentElement; parent && parent !== root; parent = parent.parentElement) yield parent;
}
