/** Read the Django CSRF token from the csrftoken cookie. */
export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}
