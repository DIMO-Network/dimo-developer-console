import { act, fireEvent, render, screen } from '@testing-library/react';
import { PaginatedTableIdentityAPI } from '@/components/Table/PaginatedTableIdentityAPI';

const rows = [{ name: 'a' }, { name: 'b' }];
const columns = [{ accessorKey: 'name', header: 'Name' }];

const deferred = () => {
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const setup = (onPaginationChange: jest.Mock) => {
  render(
    <PaginatedTableIdentityAPI
      columns={columns}
      data={rows}
      onPaginationChange={onPaginationChange}
      rowCount={10}
      pageInfo={{ startCursor: 's1', endCursor: 'e1' }}
      pageSize={2}
    />,
  );
  const [previous, next] = screen.getAllByRole('button');
  return { previous, next };
};

describe('PaginatedTableIdentityAPI', () => {
  it('turns the page once its rows are in, and asks only once for a double click', async () => {
    const page = deferred();
    const onPaginationChange = jest.fn(() => page.promise);
    const { next } = setup(onPaginationChange);

    await act(async () => {
      fireEvent.click(next);
      fireEvent.click(next);
    });
    expect(onPaginationChange).toHaveBeenCalledTimes(1);
    expect(onPaginationChange).toHaveBeenCalledWith({
      after: 'e1',
      first: 2,
      last: null,
      before: null,
    });
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(next).toBeDisabled();

    await act(async () => {
      page.resolve();
      await page.promise;
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(next).not.toBeDisabled();
  });

  it('stays on its page when the next one fails to load', async () => {
    const page = deferred();
    const { next } = setup(jest.fn(() => page.promise));

    fireEvent.click(next);
    await act(async () => {
      page.reject(new Error('down'));
      await page.promise.catch(() => undefined);
    });
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(next).not.toBeDisabled();
  });

  it('unlocks after a handler that throws, and stays on its page', async () => {
    const onPaginationChange = jest.fn(() => {
      throw new Error('broken');
    });
    const { next } = setup(onPaginationChange);
    await act(async () => {
      fireEvent.click(next);
    });
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(next).not.toBeDisabled();
  });

  it('turns at once for a handler that returns nothing', async () => {
    const { next } = setup(jest.fn());
    await act(async () => {
      fireEvent.click(next);
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
