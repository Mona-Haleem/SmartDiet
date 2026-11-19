import { createSectionDetailsEditor } from '../../scripts_module/ComponentsClasses/sectionDetailsEditor.js';

describe('structured rich text editing', () => {
  let editor, ticks;
  const fragment = (content, effects = ['Default'], color = '') => ({ type: 'p', content, effects, color });
  const paragraph = text => ({ type: 'p', content: text, effects: [] });
  function render() {
    editor.$el.innerHTML = editor.details.map((detail, index) => `<div class="detail-block" data-detail-index="${index}">${['ol', 'ul'].includes(detail.type)
      ? `<${detail.type}>${detail.content.map((item, itemIndex) => `<li class="detail-list-item" data-item-index="${itemIndex}"><div contenteditable="true" class="editable-content">${editor.renderContent(item)}</div></li>`).join('')}</${detail.type}>`
      : `<div contenteditable="true" class="editable-content">${editor.renderContent(detail)}</div>`}</div>`).join('');
  }
  function flush() { render(); while (ticks.length) ticks.shift()(); }
  function select(element, start, end) {
    const range = document.createRange(); range.selectNodeContents(element);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); const nodes = []; let node;
    while ((node = walker.nextNode())) nodes.push(node);
    let offset = 0;
    for (const text of nodes) {
      if (start >= offset && start <= offset + text.length) { range.setStart(text, start - offset); break; }
      offset += text.length;
    }
    offset = 0;
    for (const text of nodes) {
      if (end >= offset && end <= offset + text.length) { range.setEnd(text, end - offset); break; }
      offset += text.length;
    }
    range.getBoundingClientRect = () => ({ left: 10, top: 70, width: 80 });
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    editor.savedSelection = editor.saveSelection(); return range;
  }
  beforeEach(() => {
    ticks = []; editor = createSectionDetailsEditor(); editor.$el = document.createElement('section');
    editor.$nextTick = callback => ticks.push(callback); document.body.append(editor.$el);
    window.eleObj = { detailsEditor: { cancel: jest.fn(), saveDetails: jest.fn() } };
  });
  afterEach(() => { window.getSelection().removeAllRanges(); delete window.eleObj; });

  it('adds and reorders blocks without losing their content', () => {
    editor.addParagraph(); editor.addList('ul'); editor.details[0].content = 'First';
    editor.moveUp(0); editor.moveDown(1); expect(editor.details[0].content).toBe('First');
    editor.moveDown(0); expect(editor.details[1].content).toBe('First');
    editor.moveUp(1); expect(editor.details[0].content).toBe('First');
    flush(); expect(editor.$el.querySelectorAll('.detail-block')).toHaveLength(2);
    expect(document.activeElement).toHaveClass('editable-content');
  });
  it('focuses a new paragraph after Enter and preserves the previous text', () => {
    editor.details = [paragraph('Keep this')]; render(); editor.init();
    editor.$el.querySelector('.editable-content').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(editor.details).toEqual([paragraph('Keep this'), paragraph('')]); flush();
    expect(document.activeElement).toBe(editor.$el.querySelectorAll('.editable-content')[1]);
  });
  it('ignores non-editor keys and controls', () => {
    editor.details = [paragraph('Keep')]; render(); editor.init();
    const input = document.createElement('input'); editor.$el.append(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    editor.$el.querySelector('.editable-content').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(editor.details).toEqual([paragraph('Keep')]);
  });
  it.each(['ul', 'ol'])('adds and removes %s list items while retaining siblings', type => {
    editor.addList(type); editor.details[0].content[0].content = 'Keep'; editor.addListItem(0); flush();
    expect(editor.details[0].content).toHaveLength(2); expect(document.activeElement).toBe(editor.$el.querySelectorAll('.editable-content')[1]);
    editor.deleteListItem(0, 1); expect(editor.details[0].content[0].content).toBe('Keep');
    editor.deleteListItem(0, 0); expect(editor.details).toEqual([]);
  });
  it('Enter in a nonempty list item adds an item immediately afterwards', () => {
    editor.details = [{ type: 'ul', content: [paragraph('First'), paragraph('Last')] }]; render();
    editor.handleKeyDown({ key: 'Enter', target: editor.$el.querySelector('.editable-content'), preventDefault: jest.fn() });
    expect(editor.details[0].content.map(item => item.content)).toEqual(['First', '', 'Last']); flush();
    expect(document.activeElement).toBe(editor.$el.querySelectorAll('.editable-content')[1]);
  });
  it.each([1, 2])('Enter in an empty list item exits the list, list size=%s', size => {
    editor.details = [{ type: 'ol', content: Array.from({ length: size }, (_, i) => paragraph(i ? 'Keep' : '')) }]; render();
    editor.handleKeyDown({ key: 'Enter', target: editor.$el.querySelector('.editable-content'), preventDefault: jest.fn() });
    flush(); expect(editor.details.at(-1)).toEqual(paragraph(''));
    if (size === 2) expect(editor.details[0].content[0].content).toBe('Keep');
    expect(document.activeElement).toBe(editor.$el.querySelectorAll('.editable-content')[size - 1]);
  });
  it('allows data-only edits when the new block has not rendered yet', () => {
    editor.addParagraph(); editor.addList('ol'); editor.addListItem(1); editor.insertParagraphAfter(0, false);
    editor.insertListItemAfter(2, 0); ticks.splice(0).forEach(callback => callback());
    expect(editor.details).toHaveLength(3);
  });
  it('saves and restores a selection spanning formatted text nodes', () => {
    editor.details = [{ type: 'p', content: [fragment('Hello '), fragment('world', ['fw-bold'])] }]; render();
    select(editor.$el.querySelector('.editable-content'), 2, 9);
    expect(editor.savedSelection).toMatchObject({ start: 2, end: 9 });
    expect(editor.restoreSelection().toString()).toBe('llo wor');
  });
  it('does not restore a selection after its element has been removed', () => {
    editor.details = [paragraph('Hello')]; render(); select(editor.$el.querySelector('.editable-content'), 0, 3);
    editor.$el.remove(); expect(editor.restoreSelection()).toBeNull(); editor.savedSelection = null;
    expect(editor.restoreSelection()).toBeNull(); window.getSelection().removeAllRanges(); expect(editor.saveSelection()).toBeNull();
  });
  it('ignores selection outside an editable field', () => {
    const outside = document.createElement('p'); outside.textContent = 'Outside'; document.body.append(outside);
    const range = document.createRange(); range.selectNodeContents(outside); window.getSelection().addRange(range);
    expect(editor.saveSelection()).toBeNull();
  });
  it('positions the toolbar for a text selection and dismisses it outside the editor', () => {
    editor.details = [paragraph('Hello world')]; render(); editor.init();
    const element = editor.$el.querySelector('.editable-content'); select(element, 1, 5);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(editor.showFormatBar).toBe(true); expect(editor.formatBarPosition).toEqual({ x: 50, y: 20 });
    document.body.click(); expect(editor.showFormatBar).toBe(false); expect(editor.savedSelection).toBeNull();
  });
  it('keeps the toolbar open while interacting with formatting controls', () => {
    editor.init(); const toolbar = document.createElement('div'); toolbar.className = 'details-format-bar'; editor.$el.append(toolbar);
    editor.showFormatBar = true; toolbar.click(); toolbar.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(editor.showFormatBar).toBe(true);
    editor.$el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); expect(editor.showFormatBar).toBe(false);
  });
  it.each(['bold', 'italic', 'underline', 'line-through', 'text-lg'])('formats only the selected substring with %s', format => {
    editor.details = [paragraph('Hello world')]; render(); select(editor.$el.querySelector('.editable-content'), 6, 11);
    editor.applyFormat(format); const content = editor.details[0].content;
    expect(content.map(f => f.content).join('')).toBe('Hello world');
    expect(content[0].effects).not.toContain(editor.formatToEffect(format));
    expect(content[1].effects).toContain(editor.formatToEffect(format));
    expect(editor.savedSelection).toBeNull(); expect(editor.showFormatBar).toBe(false);
  });
  it('toggles an existing format off while preserving the selected text', () => {
    editor.details = [{ type: 'p', content: [fragment('Bold', ['fw-bold'], '#333333')] }]; render();
    select(editor.$el.querySelector('.editable-content'), 0, 4); editor.applyFormat('bold');
    expect(editor.details[0].content).toEqual([fragment('Bold', ['Default'], '#333333')]);
  });
  it('changes color on only the selected list-item text', () => {
    editor.details = [{ type: 'ul', content: [paragraph('Keep'), paragraph('Color me')] }]; render();
    select(editor.$el.querySelectorAll('.editable-content')[1], 0, 5); editor.applyFormat('color', '#00A6FF');
    expect(editor.details[0].content[0].content).toBe('Keep');
    expect(editor.details[0].content[1].content[0]).toMatchObject({ content: 'Color', color: '#00A6FF' });
  });
  it('handles expired selections without modifying the document', () => {
    editor.details = [paragraph('Keep')]; editor.showFormatBar = true; editor.applyFormat('bold');
    expect(editor.details).toEqual([paragraph('Keep')]); expect(editor.showFormatBar).toBe(false);
  });
  it('preserves neighboring fragments and merges adjacent identical formatting', () => {
    const model = { content: [fragment('A', ['fw-bold'], 'red'), fragment('BC', ['fw-bold'], 'red'), fragment('D')] };
    editor.processEffectWithOffsets(model, 1, 2, 'fw-bold', false, null, false);
    expect(model.content.map(f => f.content).join('')).toBe('ABCD');
    expect(model.content[0].content).toBe('ABC'); expect(model.content.at(-1).content).toBe('D');
    editor.processEffectWithOffsets(model, 1, 2, 'fw-bold', false, null, true);
    expect(model.content[1].content).toBe('B'); expect(model.content[1].effects).toEqual(['Default']);
  });
  it('splits a plain-text fragment around the selection without dropping either side', () => {
    const model = paragraph('ABCDE'); editor.processEffectWithOffsets(model, 1, 4, 'fst-italic', false, null, false);
    expect(model.content.map(f => f.content)).toEqual(['A', 'BCD', 'E']);
    expect(model.content[1].effects).toEqual(['fst-italic']);
  });
  it('finds only fragments overlapping the selection', () => {
    const parts = [fragment('AB'), fragment('CD'), fragment('EF')];
    expect(editor.getFragmentsInRange({ content: parts }, 2, 4)).toEqual([parts[1]]);
    expect(editor.getFragmentsInRange(paragraph('text'), 0, 1)).toEqual([]);
    expect(editor.getFragmentsInRange({}, 0, 1)).toEqual([]);
  });
  it('syncs typing without discarding unchanged formatting', () => {
    const model = { content: [fragment('Keep', ['fw-bold'])] }; const element = document.createElement('div'); element.textContent = 'Keep';
    editor.syncContentFromDOM(model, element); expect(model.content[0].effects).toEqual(['fw-bold']);
    element.textContent = 'Changed'; editor.syncContentFromDOM(model, element);
    expect(model.content).toEqual([fragment('Changed')]);
    const text = paragraph('Before'); element.textContent = 'After'; editor.syncContentFromDOM(text, element); expect(text.content).toBe('After');
  });
  it('synchronizes either a paragraph or a particular list item', () => {
    editor.details = [paragraph('Before'), { type: 'ul', content: [paragraph('Item')] }];
    const target = document.createElement('div'); target.textContent = 'Updated';
    editor.updateContent(0, null, { target }); editor.updateContent(1, 0, { target });
    expect(editor.details[0].content).toBe('Updated'); expect(editor.details[1].content[0].content).toBe('Updated');
  });
  it('renders text as text and preserves supported formatting', () => {
    const unsafe = '<img src=x onerror=alert(1)>&';
    const container = document.createElement('div'); container.innerHTML = editor.renderContent(paragraph(unsafe));
    expect(container.textContent).toBe(unsafe); expect(container.querySelector('img')).toBeNull();
    container.innerHTML = editor.renderContent({ content: [fragment('Bold', ['Default', 'fw-bold'], '#333333'), fragment(' Plain', [])] });
    expect(container.querySelector('span')).toHaveClass('fw-bold'); expect(container.textContent).toBe('Bold Plain');
    expect(editor.renderContent({})).toBe(''); expect(editor.formatToEffect('custom')).toBe('custom');
  });
  it('does not allow model style attributes to create executable HTML attributes', () => {
    const container = document.createElement('div');
    container.innerHTML = editor.renderContent({ content: [fragment('Text', ['fw-bold'], '#fff" onclick="alert(1)')] });
    expect(container.querySelector('[onclick]')).toBeNull();
  });
  it('adds an internal section reference with the parent plan identity', () => {
    editor.addRef('detail', { href: '/diet/collections/plans/2/Test/#section-7', name: 'Day 1', id: 7, planId: 2 });
    flush(); expect(editor.details[0]).toMatchObject({ type: 'ref', refType: 'detail', eleId: 7, planId: 2, content: 'Day 1' });
  });
  it('adds a normal link and ignores an empty reference', () => {
    editor.addRef('link', { href: 'https://example.com' }); editor.addRef('link', { href: '' }); flush();
    expect(editor.details).toHaveLength(1); expect(editor.details[0].href).toBe('https://example.com');
  });
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)'])('rejects executable link scheme %s', href => {
    editor.addRef('link', { href, name: 'Click' }); expect(editor.details).toEqual([]);
  });
  it('passes the complete structured document to save and delegates cancellation', () => {
    editor.details = [paragraph('Saved')]; editor.saveEdit(); editor.cancelEdit(); editor.closeEditor();
    expect(window.eleObj.detailsEditor.saveDetails).toHaveBeenCalledWith(editor.details);
    expect(window.eleObj.detailsEditor.cancel).toHaveBeenCalledTimes(2);
  });
});
