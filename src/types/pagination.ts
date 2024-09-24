export interface Paginated<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
}
