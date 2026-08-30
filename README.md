# Arcana

An English-language, three-card Rider–Waite–Smith tarot experience with upright and reversed cards. The frontend uses a Midnights-inspired visual system and is being prepared for a serverless AWS deployment.

## Architecture

- `site/` — deployable static frontend and 78 optimized WebP card images
- `infra/lib/` — AWS CDK stack
- `infra/lambda/` — reading API Lambda
- S3 — private static asset origin
- CloudFront — HTTPS CDN and the public application URL
- API Gateway + Lambda — server-side reading endpoint

## Local frontend

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/site/`.

## Infrastructure checks

```bash
npm install
npm run build
npm run synth
```

No AWS resources are created until `npm run deploy` is run with configured AWS credentials.

## Current status

Step one provides the deployable frontend, optimized deck assets, API contract, and AWS infrastructure skeleton. The Lambda intentionally returns a placeholder response until the LLM provider and secret are configured in step two.
