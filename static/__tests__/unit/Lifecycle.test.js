import Component from '../../scripts_module/ComponentsClasses/Component.js';
import { ResizeHandler } from '../../scripts_module/helpers/utils/ResizeManager.js';

describe('component and resize cleanup', () => {
  afterEach(() => { jest.useRealTimers(); Component.instances = {}; });

  it('debounces a burst of resize events', () => {
    jest.useFakeTimers();
    const add = jest.spyOn(window, 'addEventListener');
    const handler = new ResizeHandler(100);
    const callback = jest.fn();
    handler.subscribe(callback);
    try {
      for (let i = 0; i < 10; i++) window.dispatchEvent(new Event('resize'));
      jest.advanceTimersByTime(99);
      expect(callback).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    } finally {
      handler.unsubscribe();
      const listener = add.mock.calls.find(([name]) => name === 'resize')[1];
      window.removeEventListener('resize', listener);
    }
  });

  it('removes the same resize listener that it registered', () => {
    const add = jest.spyOn(window, 'addEventListener').mockImplementation(() => {});
    const remove = jest.spyOn(window, 'removeEventListener');
    const handler = new ResizeHandler();
    handler.subscribe(jest.fn());
    const listener = add.mock.calls.find(([name]) => name === 'resize')[1];
    handler.unsubscribe();
    expect(remove).toHaveBeenCalledWith('resize', listener);
  });

  it('deletes the element and its listeners while removing the registry entry', async () => {
    class TestComponent extends Component {}
    const element = document.createElement('button');
    document.body.append(element);
    const component = new TestComponent(element);
    const id = component.instanceId;
    const onClick = jest.fn();
    component.addEventListener(element, 'click', onClick);
    await component.delete();
    element.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(element.isConnected).toBe(false);
    expect(Component.instances[id]).toBeUndefined();
  });
});
