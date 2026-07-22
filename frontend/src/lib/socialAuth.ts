type SocialAuthProcess = "login" | "signup";

export function startSocialAuth(
  provider: string,
  process: SocialAuthProcess,
  callbackPath: string,
  csrfToken: string,
) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/_allauth/browser/v1/auth/provider/redirect";

  const fields = {
    provider,
    process,
    callback_url: new URL(callbackPath, window.location.origin).toString(),
    csrfmiddlewaretoken: csrfToken,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
