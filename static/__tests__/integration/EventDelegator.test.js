import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import EventDelegator from '../../scripts_module/helpers/utils/eventDelegations.js';
import QueryService from '../../scripts_module/helpers/fetchData/QueryService.js';
import ApiService from '../../scripts_module/helpers/fetchData/ApiService.js';
import QueryCache from '../../scripts_module/helpers/fetchData/QueryCache.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';

describe('EventDelegator - Integration Tests', () => {
  let eventDelegator;
  let queryService;
  let container;

  beforeEach(() => {
    const apiService = new ApiService();
    const cache = new QueryCache();
    queryService = new QueryService(apiService, cache);
    
    const simpleActions = {
      testAction: jest.fn(),
      toggleTheme: jest.fn()
    };
    
    eventDelegator = new EventDelegator(queryService, Component.instances, simpleActions);
    
    container = document.createElement('div');
    document.body.appendChild(container);
    
    global.fetch.mockClear();
});

afterEach(() => {
    document.body.removeChild(container);
    Component.instances = {};
});

describe('simple action handling', () => {
  it('should call registered action', () => {
    container.innerHTML = `
      <button data-click-test-action="param">Test</button>
    `;

    eventDelegator.listen('click');
    
    const button = container.querySelector('button');
    button.click();

    expect(eventDelegator.actionRegistry.testAction).toHaveBeenCalled();
  });

  it('should pass event and payload to action', () => {
    container.innerHTML = `
      <button data-click-test-action="testPayload">Test</button>
    `;

    eventDelegator.listen('click');
    
    const button = container.querySelector('button');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    button.dispatchEvent(clickEvent);

    expect(eventDelegator.actionRegistry.testAction).toHaveBeenCalledWith(
      expect.any(MouseEvent),
      'testPayload',
      null
    );
  });

  it('should call component method if exists', () => {
    const mockComponent = {
      customAction: jest.fn()
    };

    container.innerHTML = `
      <div data-instance-id="test-comp">
        <button data-click-custom-action="payload">Test</button>
      </div>
    `;

    Component.instances['test-comp'] = mockComponent;
    
    eventDelegator.listen('click');
    
    const button = container.querySelector('button');
    button.click();
    
    expect(mockComponent.customAction).toHaveBeenCalled();
  });
});

describe('event bubbling', () => {
  it('should find data attributes on parent elements', () => {
    container.innerHTML = `
      <div data-click-test-action="parent">
        <span>
          <button id="nested-btn">Click</button>
        </span>
      </div>
    `;

    eventDelegator.listen('click');
    
    const button = container.querySelector('#nested-btn');
    button.click();

    expect(eventDelegator.actionRegistry.testAction).toHaveBeenCalled();
  });

  it('should stop at first matching element', () => {
    const action1 = jest.fn();
    const action2 = jest.fn();
    
    eventDelegator.actionRegistry.action1 = action1;
    eventDelegator.actionRegistry.action2 = action2;

    container.innerHTML = `
      <div data-click-action2="outer">
        <button data-click-action1="inner">Click</button>
      </div>
    `;

    eventDelegator.listen('click');
    
    const button = container.querySelector('button');
    button.click();

    expect(action1).toHaveBeenCalled();
    expect(action2).not.toHaveBeenCalled();
  });
});
//   describe('HTTP action handling', () => {
    //     it('should handle GET requests', async () => {
        //       container.innerHTML = `
        //         <button data-click-get="/api/test" id="test-btn">Click</button>
        //       `;
        
        //       global.fetch.mockResolvedValueOnce({
            //         ok: true,
            //         status: 200,
            //         headers: new Headers({ 'content-type': 'application/json' }),
            //         json: async () => ({ data: 'test' }),
            //         text: async () => '{"data":"test"}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('#test-btn');
//       button.click();

//       // Wait for async operations
//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(global.fetch).toHaveBeenCalledWith(
//         '/api/test',
//         expect.objectContaining({
//           method: 'GET'
//         })
//       );
//     });

//     it('should handle POST requests with form data', async () => {
//       container.innerHTML = `
//         <form data-submit-post="/api/test">
//           <input name="username" value="testuser" />
//           <button type="submit">Submit</button>
//         </form>
//       `;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 201,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ success: true }),
//         text: async () => '{"success":true}'
//       });

//       eventDelegator.listen('submit');
      
//       const form = container.querySelector('form');
//       const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
//       form.dispatchEvent(submitEvent);

//       // Wait for async operations
//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(global.fetch).toHaveBeenCalled();
//       const fetchCall = global.fetch.mock.calls[0];
//       expect(fetchCall[1].method).toBe('POST');
//     });

//     it('should handle PUT requests', async () => {
//       container.innerHTML = `
//         <button data-click-put="/api/test/1">Update</button>
//       `;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 200,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ updated: true }),
//         text: async () => '{"updated":true}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(global.fetch).toHaveBeenCalledWith(
//         '/api/test/1',
//         expect.objectContaining({
//           method: 'PUT'
//         })
//       );
//     });

//     it('should handle DELETE requests', async () => {
//       container.innerHTML = `
//         <button data-click-delete="/api/test/1">Delete</button>
//       `;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 204,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({}),
//         text: async () => ''
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(global.fetch).toHaveBeenCalledWith(
//         '/api/test/1',
//         expect.objectContaining({
//           method: 'DELETE'
//         })
//       );
//     });
//   });


//   describe('callback execution', () => {
//     it('should execute prefetch callback', async () => {
//       const mockComponent = {
//         validateData: jest.fn((event) => {
//           return { validated: true };
//         })
//       };

//       container.innerHTML = `
//         <div data-instance-id="test-comp">
//           <button 
//             data-click-get="/api/test"
//             data-prefetch="validateData"
//           >Test</button>
//         </div>
//       `;

//       Component.instances['test-comp'] = mockComponent;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 200,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ success: true }),
//         text: async () => '{"success":true}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(mockComponent.validateData).toHaveBeenCalled();
//     });

//     it('should execute onSuccess callback', async () => {
//       const mockComponent = {
//         handleSuccess: jest.fn()
//       };

//       container.innerHTML = `
//         <div data-instance-id="test-comp">
//           <button 
//             data-click-get="/api/test"
//             data-success="handleSuccess"
//           >Test</button>
//         </div>
//       `;

//       Component.instances['test-comp'] = mockComponent;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 200,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ data: 'test' }),
//         text: async () => '{"data":"test"}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(mockComponent.handleSuccess).toHaveBeenCalled();
//     });

//     it('should execute onError callback on failed request', async () => {
//       const mockComponent = {
//         handleError: jest.fn()
//       };

//       container.innerHTML = `
//         <div data-instance-id="test-comp">
//           <button 
//             data-click-get="/api/test"
//             data-error="handleError"
//           >Test</button>
//         </div>
//       `;

//       Component.instances['test-comp'] = mockComponent;

//       global.fetch.mockResolvedValueOnce({
//         ok: false,
//         status: 500,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ error: 'Server error' }),
//         text: async () => '{"error":"Server error"}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(mockComponent.handleError).toHaveBeenCalled();
//     });

//     it('should execute onLoading callback', async () => {
//       const mockComponent = {
//         showLoading: jest.fn()
//       };

//       container.innerHTML = `
//         <div data-instance-id="test-comp">
//           <button 
//             data-click-get="/api/test"
//             data-loading="showLoading"
//           >Test</button>
//         </div>
//       `;

//       Component.instances['test-comp'] = mockComponent;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 200,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ data: 'test' }),
//         text: async () => '{"data":"test"}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(mockComponent.showLoading).toHaveBeenCalled();
//     });
//   });

//   describe('force and ttl options', () => {
//     it('should respect force flag', async () => {
//       container.innerHTML = `
//         <button 
//           data-click-get="/api/test"
//           data-force="true"
//         >Test</button>
//       `;

//       global.fetch.mockResolvedValue({
//         ok: true,
//         status: 200,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ data: 'test' }),
//         text: async () => '{"data":"test"}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
      
//       // Click twice
//       button.click();
//       await new Promise(resolve => setTimeout(resolve, 50));
      
//       button.click();
//       await new Promise(resolve => setTimeout(resolve, 50));

//       // Should call fetch twice because force=true
//       expect(global.fetch).toHaveBeenCalledTimes(2);
//     });

//     it('should use custom TTL', async () => {
//       const querySpy = jest.spyOn(queryService, 'query');

//       container.innerHTML = `
//         <button 
//           data-click-get="/api/test"
//           data-ttl="5000"
//         >Test</button>
//       `;

//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         status: 200,
//         headers: new Headers({ 'content-type': 'application/json' }),
//         json: async () => ({ data: 'test' }),
//         text: async () => '{"data":"test"}'
//       });

//       eventDelegator.listen('click');
      
//       const button = container.querySelector('button');
//       button.click();

//       await new Promise(resolve => setTimeout(resolve, 50));

//       expect(querySpy).toHaveBeenCalledWith(
//         expect.any(String),
//         expect.objectContaining({
//           ttl: 5000
//         })
//       );
//     });
//   });
});