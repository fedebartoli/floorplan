# Blueprints: a floorplan of a system that isn't built yet

A blueprint is the same map, drawn from a plan instead of code. Someone has a PRD, a spec or just a long description of what they want to build, and the map shows every piece they'd need, how the pieces connect, what each screen relies on, and what still has to be decided.

You write two files in `floorplan/`:
- `plan.json`: the files, endpoints and connections the system would have (this file).
- `architecture.json`: the parts, outside services, flows and tour, exactly as for a code map ([schema.md](schema.md)).

`plan.mjs` turns `plan.json` into the scan `build.mjs` expects, so everything after that works as for real code. Cards are drawn with dashed outlines and a **Blueprint** label, Health becomes a **design review** of the plan, and every part has a **Build this with Claude** (or Codex) button with a ready request to build it.

Contents: [Planning well](#planning-well) · [plan.json](#planjson) · [Checks](#what-the-design-review-checks)

## Planning well

- **Plan to the level of files and endpoints**, not just boxes. Screens, the design review and the build prompts all depend on it. A small product is typically 15–60 files and 10–40 endpoints. Don't plan every helper: one file per page, per group of endpoints, per outside service and per kind of saved data is about right.
- **Pick a sensible, common stack** unless the PRD names one, and list it in `stack`. Prefer what a solo builder working with AI would choose: a Next.js or React website, a Node or Python server, Postgres, Stripe, a hosted email service. Use real, conventional paths for that stack (`web/app/checkout/page.tsx`, `api/src/routes/orders.ts`).
- **Every screen the PRD describes is a file with a `screen` URL.** Give each screen `calls` for the endpoints it uses and `uses` for the parts it's built from.
- **Every endpoint gets `access`.** Decide it from the PRD. If the PRD is silent and it matters, leave it out (the review will flag it) or add a question.
- **Don't invent requirements.** Where the PRD doesn't say and you had to choose, write the choice in `assumptions`. Where the answer changes what gets built and you can't reasonably choose, add it to `questions` with the parts it affects. Ask the user 2–3 questions up front only if the PRD leaves something fundamental open (who uses it, web or mobile, does anyone sign in, does money change hands).
- **Outside services and data stores are `external` nodes** in architecture.json (Stripe, the database, an email service). Files reach them through `services` and `data` in plan.json.
- **Background work** (scheduled emails, nightly jobs, queue workers) gets its own files and a `worker` node.

## plan.json

```json
{
  "$schema": "floorplan/plan@1",
  "source": "docs/prd.md",
  "stack": ["Next.js website", "Node.js + Express server", "Postgres", "Stripe"],
  "assumptions": ["Staff and customers share one sign-in, with staff marked as such."],
  "questions": [{ "question": "Can customers cancel for free?", "about": ["POST /api/orders/:id/cancel"] }],
  "files": [ { "path": "web/app/checkout/page.tsx", "name": "Checkout page", "description": "…", "screen": "/checkout", "uses": ["web/lib/api.ts"], "calls": ["POST /api/orders"] } ],
  "endpoints": [ { "method": "POST", "path": "/api/orders", "file": "api/src/routes/orders.ts", "name": "Place an order", "description": "…", "access": "signed-in" } ]
}
```

| field | meaning |
|---|---|
| `source` | what it was planned from: the PRD's path in the project, or a few words such as "a description in chat" |
| `stack` | the technology choices, in plain words |
| `assumptions` | choices you made where the PRD didn't say. Shown on the map's overview |
| `questions` | `{ question, about }`: decisions the PRD leaves open. `about` lists node ids, file paths or `"METHOD /path"`. Each one shows in the design review until it's answered and removed |
| `files` | every planned file (see below) |
| `endpoints` | every planned endpoint (see below) |

**files[]**

| field | meaning |
|---|---|
| `path` | where it would live, relative to the project folder. Required, unique |
| `name`, `description` | a human name and one plain sentence, written like a description of real code ([writing-descriptions.md](writing-descriptions.md)) |
| `screen` | for a page people open: its URL (`/checkout`, `/orders/:id`). Makes it a screen in **Screens** |
| `uses` | other planned files it is built from or calls directly (becomes "uses" connections) |
| `calls` | endpoints it calls, as `"METHOD /path"`, exactly as in `endpoints` |
| `services` | ids of `external` nodes it talks to (Stripe, an email service) |
| `data` | ids of nodes for the data stores it reads or writes (usually the database) |

**endpoints[]**

| field | meaning |
|---|---|
| `method` | GET, POST, PUT, PATCH, DELETE, or CALL for a callable function (for example Firebase `onCall`) |
| `path` | the URL, starting with `/`. Use `:name` for parts that change (`/api/orders/:id`) |
| `file` | the planned file that handles it. Required |
| `name`, `description` | as for files |
| `access` | who may use it: `public` (anyone), `signed-in`, `staff`, `webhook` (another company's service, which must prove it's them) or `internal` (only your own services) |

Node `paths` globs in architecture.json assign planned files to parts, the same as for code. Aim for no unassigned files.

## What the design review checks

- endpoints that change data and are open to anyone (worth a second look, though sign-up and guest checkout are legitimate);
- endpoints with no `access` decided;
- every open question, pointing at the parts it affects;
- endpoints no planned screen or service calls;
- planned files connected to nothing.

Each has **Resolve with Claude/Codex**, a request to settle it and update the plan.
