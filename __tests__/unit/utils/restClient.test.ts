import { RestClient } from '@/utils/restClient';

describe('RestClient', () => {
  const baseUrl = 'https://api.example.com';
  let restClient: RestClient;

  beforeEach(() => {
    restClient = new RestClient(baseUrl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default headers', () => {
    expect(restClient.defaultHeaders).toEqual({});
  });

  it('should set default headers', () => {
    const headers = { Authorization: 'Bearer token' };
    restClient.defaultHeaders = headers;
    expect(restClient.defaultHeaders).toEqual(headers);
  });

  it('should make a GET request', async () => {
    const mockResponse = { data: 'example' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    global.fetch = mockFetch;

    const response = await restClient.get('/endpoint');
    expect(response).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/endpoint`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('should make a POST request', async () => {
    const mockResponse = { data: 'created' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    global.fetch = mockFetch;

    const postData = { key: 'value' };
    const response = await restClient.post('/endpoint', postData);
    expect(response).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
  });

  it('should make a PUT request', async () => {
    const mockResponse = { data: 'updated' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    global.fetch = mockFetch;

    const putData = { key: 'value' };
    const response = await restClient.put('/endpoint', putData);
    expect(response).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/endpoint`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putData),
    });
  });

  it('should make a DELETE request', async () => {
    const mockResponse = { data: 'deleted' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
    global.fetch = mockFetch;

    const response = await restClient.delete('/endpoint');
    expect(response).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/endpoint`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('should throw error on failed response', async () => {
    const mockErrorResponse = { message: 'Error message' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn().mockResolvedValue(mockErrorResponse),
    });
    global.fetch = mockFetch;

    // Mock console.error
    const consoleErrorMock = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      await restClient.get('/nonexistent');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Error message');
      expect(consoleErrorMock).toHaveBeenCalledWith(
        `Failed to GET data: 404 Not Found`
      );
    }

    // Restore console.error
    consoleErrorMock.mockRestore();
  });

  it('should append query parameters to URL', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = mockFetch;

    const mockAppend = jest.fn();
    // Mock URL constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn<any, any>(global, 'URL').mockImplementation((url) => ({
      searchParams: {
        append: mockAppend,
      },
      toString: () => url,
    }));

    const queryParams = { param1: 'value1', param2: 'value2' };
    await restClient.get('/endpoint', queryParams);

    // Verify that searchParams.append was called with the correct parameters
    expect(mockAppend).toHaveBeenCalledTimes(2);
    expect(mockAppend).toHaveBeenCalledWith('param1', 'value1');
    expect(mockAppend).toHaveBeenCalledWith('param2', 'value2');
  });
});
