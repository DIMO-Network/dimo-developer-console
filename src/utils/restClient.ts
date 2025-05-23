export type Primitive = string | number | boolean | Date | null | undefined;
export type Data = Primitive | Record<string, Primitive> | Primitive[];

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
    data?: Data,
    customHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(resource, this.baseUrl);
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
      const error = await response.json();
      const errorMessage = `Failed to ${method} data: ${response.status} ${response.statusText}`;
      console.error(errorMessage);
      throw new Error(error.message);
    }

    return (await response.json()) as T;
  }

  async get<T>(
    resource: string,
    queryParams: Record<string, string> = {},
    customHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(resource, this.baseUrl);
    Object.keys(queryParams).forEach((key) =>
      url.searchParams.append(key, queryParams[key]),
    );
    return await this.execute<T>('GET', url.toString(), undefined, customHeaders);
  }

  async post<T>(
    resource: string,
    data: Data,
    customHeaders: Record<string, string> = {},
  ): Promise<T> {
    return await this.execute<T>('POST', resource, data, customHeaders);
  }

  async put<T>(
    resource: string,
    data: Data,
    customHeaders: Record<string, string> = {},
  ): Promise<T> {
    return await this.execute<T>('PUT', resource, data, customHeaders);
  }

  async delete<T>(
    resource: string,
    customHeaders: Record<string, string> = {},
  ): Promise<T> {
    return await this.execute<T>('DELETE', resource, undefined, customHeaders);
  }
}
