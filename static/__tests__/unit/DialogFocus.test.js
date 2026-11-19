import { trapDialogFocus } from '../../common/dialog.js';

describe('dialog keyboard containment', () => {
  let dialog;
  beforeEach(() => {
    dialog = document.createElement('div'); dialog.tabIndex = -1;
    dialog.innerHTML = '<button>First</button><div hidden><button>Hidden</button></div><button disabled>Disabled</button><button>Last</button>';
    document.body.append(dialog); dialog.addEventListener('keydown', trapDialogFocus);
  });
  function tab(shiftKey = false) {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    dialog.dispatchEvent(event); return event;
  }
  it('wraps forward and backward while excluding unavailable controls', () => {
    const first = dialog.firstElementChild, last = dialog.lastElementChild;
    last.focus(); tab(); expect(document.activeElement).toBe(first);
    first.focus(); tab(true); expect(document.activeElement).toBe(last);
  });
  it('allows ordinary tab movement between interior controls', () => {
    dialog.firstElementChild.focus(); expect(tab().defaultPrevented).toBe(false);
  });
  it('recovers focus from outside and contains an empty dialog', () => {
    tab(); expect(document.activeElement).toBe(dialog.firstElementChild);
    dialog.replaceChildren(); tab(); expect(document.activeElement).toBe(dialog);
  });
});
