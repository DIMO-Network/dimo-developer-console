export class RestClient {
  private baseUrl: string;
  private _defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this._defaultHeaders = defaultHeaders;
  }

  get defaultHeaders(): Record<string, string> {
    return this._defaultHeaders;
  }

  set defaultHeaders(headers: Record<string, string>) {
    this._defaultHeaders = headers;
  }

  private async execute<T>(
    method: string,
    resource: string,
    data?: any,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(resource, this.baseUrl);
    // eslint-disable-next-line no-undef
    const options: globalThis.RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...customHeaders,
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorMessage = `Failed to ${method} data: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  }

  async get<T>(
    resource: string,
    queryParams: Record<string, string> = {},
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(resource, this.baseUrl);
    Object.keys(queryParams).forEach((key) =>
      url.searchParams.append(key, queryParams[key])
    );
    return await this.execute<T>(
      'GET',
      url.toString(),
      undefined,
      customHeaders
    );
  }

  async post<T>(
    resource: string,
    data: any,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    return await this.execute<T>('POST', resource, data, customHeaders);
  }

  async put<T>(
    resource: string,
    data: any,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    return await this.execute<T>('PUT', resource, data, customHeaders);
  }

  async delete<T>(
    resource: string,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    return await this.execute<T>('DELETE', resource, undefined, customHeaders);
  }
}
