# Arcana

**[Live Application](https://d3its9ne9e8ot4.cloudfront.net/)**

Arcana is a deployed agentic AI tarot application featuring the complete
78-card Rider–Waite–Smith deck, upright and reversed readings, structured
three-card interpretation, optional public web research, and a private
browser-local reading journal.

The application runs on a serverless AWS architecture and uses a
Midnights-inspired visual system.

## Architecture

- `site/` — HTML, CSS, and JavaScript frontend with 78 optimized WebP cards
- `infra/lib/` — TypeScript AWS CDK infrastructure
- `infra/lambda/` — Node.js reading API and deterministic routing logic
- S3 + CloudFront — private static origin, HTTPS delivery, and CDN caching
- API Gateway + Lambda — validated and rate-limited reading API
- Secrets Manager — server-side OpenAI API key storage
- OpenAI Responses API — structured readings and optional public web search

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

Questions are first routed locally using deterministic rules. Ordinary tarot
questions proceed directly to a model-generated structured reading. Web search
is enabled only when current public facts materially affect the answer, such as
recent sports form, injuries, schedules, or other time-sensitive information.

The agent keeps researched evidence separate from symbolic tarot interpretation
and does not search for private individuals or claim access to private thoughts.

## Current status

Arcana is deployed on AWS and available through CloudFront:

**https://d3its9ne9e8ot4.cloudfront.net/**

The production version includes the complete card deck, upright and reversed
draws, structured AI readings, optional web research, follow-up interaction,
an offline fallback, and browser-local reading history.

The dependency tree is locked in `package-lock.json`. GitHub Actions validates
the TypeScript build and CDK synthesis. Production deployment remains a
manually approved step.
