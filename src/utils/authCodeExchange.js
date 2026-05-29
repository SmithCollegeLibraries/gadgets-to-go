export async function exchangeAuthCode(baseUrl, code) {
  const response = await fetch(`${baseUrl}/auth/exchange-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error('Unable to complete authentication.');
  }

  const data = await response.json();
  if (!data.token) {
    throw new Error('Authentication response did not include a token.');
  }

  return data.token;
}
