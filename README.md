# Arcana

An English-language, three-card Rider–Waite–Smith tarot experience with upright and reversed cards. The frontend uses a Midnights-inspired visual system and is being prepared for a serverless AWS deployment.

## Architecture

- `site/` — deployable static frontend and 78 optimized WebP card images
- `infra/lib/` — AWS CDK stack
- `infra/lambda/` — reading API Lambda
- S3 — private static asset origin
- CloudFront — HTTPS CDN and the public application URL
- API Gateway + Lambda — server-side reading endpoint
- API Gateway throttles requests and validates payloads before Lambda execution
- API Gateway throttling limits how quickly model calls can be started

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

## Configure AI readings

The stack creates an empty AWS Secrets Manager secret and prints its ARN as
`OpenAiSecretArn`. After deployment, store the API key in that secret—never in
the frontend or in Git:

```bash
aws secretsmanager put-secret-value \
  --secret-id <OpenAiSecretArn> \
  --secret-string '{"OPENAI_API_KEY":"<your-key>"}'
```

The Lambda uses the OpenAI Responses API as an agent. In a single bounded run it
can ask one clarifying question, decide whether current public information is
needed, invoke web search, and return a structured reading with evidence kept
separate from tarot interpretation. Relationship questions do not trigger
research into private individuals.

## Current status

The frontend, optimized deck assets, AWS infrastructure, model-backed reading
endpoint, offline fallback, and follow-up interaction are implemented. No AWS
resources or model calls occur until the stack is deployed and its generated
secret is populated.

The dependency tree is locked in `package-lock.json`. `npm run build` and
`npm run synth` must both pass before infrastructure changes are merged.
GitHub Actions runs these checks automatically; deployment remains a manual
confirmation step.
