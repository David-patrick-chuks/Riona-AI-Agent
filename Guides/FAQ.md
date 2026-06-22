# FAQ

This usually happens when the Instagram automation loop is not enabled.

### Fix:

Enable the loop in your `.env` file:

IG_AGENT_ENABLED=true

Then restart the server.

### Alternative:

You can manually trigger interactions using:

POST /api/interact

## Cookie errors

If Instagram login fails or session breaks:

### Fix:

- Delete this file:
  cookies/Instagramcookies.json

- Restart the application

- The system will automatically re-login and generate fresh cookies.

## Sponsored posts

You can improve sponsored post detection using environment variables:

- IG_AD_MARKERS
- IG_AD_BUTTON_MARKERS

### Note:

Make sure values are properly comma-separated in your .env file.

## Should I run `npm audit fix --force`?

Avoid using --force unless absolutely necessary, as it may break dependencies.

### Recommended steps:

1. Check vulnerabilities:
   npm audit

2. Apply safe fixes:
   npm audit fix

3. If issues remain, update specific packages manually and test the application before deploying.
   Recommended path:

- Run `npm audit` to see details
- Run `npm audit fix` first
- For remaining issues, update specific packages intentionally and test
