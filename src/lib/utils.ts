export async function secureRequest<T>(query: string, variables?: any): Promise<{ data: T }> {
  const response = await fetch('/api/subgraph', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  return response.json();
} 