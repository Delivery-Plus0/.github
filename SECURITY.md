# Security policy

Applies to every repository in Delivery-Plus0 unless that repository has its own `SECURITY.md`.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through GitHub's **Report a vulnerability** button, under the repository's **Security** tab (private vulnerability reporting).

Include:
- the affected repository and component;
- what an attacker can do, and the steps to reproduce it;
- a suggested fix, if you have one.

Never include real passwords, tokens or personal data.

## What we're most interested in

- Bypassing authentication or authorization: JWT validation, roles, staff permissions, restaurant ownership.
- Reaching an internal service, or a driver's private documents, from outside the API gateway.
- Injection: SQL, command or template.
- Secrets committed to a repository or its history.
- Personal data (phone numbers, national IDs, locations) visible to someone who shouldn't see it.

Default credentials in local-development compose files and `.env.example` are intentional, and not vulnerabilities.

## What happens next

We acknowledge reports within a few days, keep you updated while we fix them, and credit you in the advisory if you'd like. Please give us reasonable time to release a fix before disclosing it publicly.
