import Component from '../../scripts_module/ComponentsClasses/Component.js';

class Panel extends Component {}
describe('component rendering and registry contracts', () => {
  let panel, root, data;
  beforeEach(() => {
    root = document.createElement('section'); root.innerHTML = '<div id="old">Old</div>'; document.body.append(root);
    data = { value: 1, enabled: true }; panel = new Panel(root, {}, data);
    Alpine.nextTick = jest.fn(async () => {}); Alpine.$data.mockImplementation(element => element.__data || data);
  });
  afterEach(() => { Component.instances = {}; delete Alpine.nextTick; });
  it('initializes the inserted subtree after a partial HTML replacement', async () => {
    const old = root.querySelector('#old'); expect(await panel.swapContent('<div id="new">New</div>', old)).toBe(true);
    expect(root.querySelector('#old')).toBeNull(); const inserted = root.querySelector('#new');
    expect(inserted.textContent).toBe('New'); expect(Alpine.initTree).toHaveBeenCalledWith(inserted);
    expect(panel.$el).toBe(root);
  });
  it('rebinds the component and references when its root is replaced', async () => {
    const oldId = panel.instanceId; const newData = { value: 2, $refs: { label: document.createElement('label') } };
    Alpine.$data.mockReturnValue(newData);
    expect(await panel.swapContent('<section id="replacement"><span>New root</span></section>')).toBe(true);
    const replacement = document.querySelector('#replacement');
    expect(panel.$el).toBe(replacement); expect(panel.$data).toBe(newData); expect(panel.$refs).toBe(newData.$refs);
    expect(replacement.dataset.instanceId).toBe(oldId); expect(Component.findInstance(replacement.firstChild)).toBe(panel);
  });
  it('does not remove useful content after an empty HTML response', async () => {
    expect(await panel.swapContent('   ')).toBe(false); expect(root.isConnected).toBe(true); expect(root.textContent).toBe('Old');
  });
  it('reports an invalid response without throwing or removing content', async () => {
    expect(await panel.swapContent(null)).toBe(false); expect(root.isConnected).toBe(true);
  });
  it('creates a reactive child component from returned HTML', async () => {
    const child = await panel.createEle('<article><button>Child</button></article>', root, 'beforeend', Panel);
    expect(child).toBeInstanceOf(Panel); expect(child.$el.parentElement).toBe(root);
    expect(Component.findInstance(child.$el.querySelector('button'))).toBe(child); expect(child.$el.__instance).toBe(child);
  });
  it('requires a real HTML target and permits structured-data callbacks', async () => {
    await expect(panel.createEle('<p>Text</p>', null, 'beforeend', Panel)).rejects.toThrow(/Target DOM/);
    const update = jest.fn(value => ({ saved: value.id })); expect(await panel.createEle({ id: 3 }, update)).toEqual({ saved: 3 });
  });
  it('preserves false and zero while refusing undeclared reactive fields', async () => {
    await panel.updateEle({ value: 0, enabled: false, injected: 'ignore' });
    expect(data).toEqual({ value: 0, enabled: false }); await panel.updateEle(null); expect(data.value).toBe(0);
  });
  it('removes registry entries and listeners when a rendered component is destroyed', async () => {
    const click = jest.fn(); panel.addEventListener(window, 'panel-test', click); const id = panel.instanceId;
    await panel.delete(); window.dispatchEvent(new Event('panel-test'));
    expect(click).not.toHaveBeenCalled(); expect(Component.instances[id]).toBeUndefined(); expect(root.isConnected).toBe(false);
  });
  it('dispatches known actions and handles unknown actions without throwing', () => {
    panel.save = jest.fn(); const event = new Event('click'); panel.handleAction('save', event, { id: 3 });
    expect(panel.save).toHaveBeenCalledWith(event, { id: 3 }); expect(() => panel.handleAction('missing', event)).not.toThrow();
    expect(Component.findInstance(document.createElement('div'))).toBeNull();
  });
});
