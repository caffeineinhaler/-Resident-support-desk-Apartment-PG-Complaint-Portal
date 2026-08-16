import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => [],
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  global.fetch = originalFetch;
});

test('loads and displays the complaints screen', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /apartment.*complaint portal/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /submit complaint/i })).toBeInTheDocument();

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/complaints');
  });

  expect(screen.getByText(/no complaints found/i)).toBeInTheDocument();
});

test('filters submitted complaints by search term', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => [
      {
        id: 1,
        residentName: 'Asha Sharma',
        roomNumber: 'B-204',
        contact: '+91 98765 43210',
        category: 'Plumbing',
        description: 'Leaking tap in the kitchen.',
        priority: 'High',
        status: 'Pending',
        date: '2026-08-16T09:00:00.000Z',
        additionalInfo: '',
      },
    ],
  });

  render(<App />);

  expect(await screen.findByText('Asha Sharma')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'internet' } });
  expect(screen.getByText(/no matching complaints/i)).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'asha' } });
  expect(screen.getByText('Asha Sharma')).toBeInTheDocument();
});
