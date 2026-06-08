# START HERE — Joe's plain-English guide

This is for YOU (not the AI). It walks the whole flow: open in VS Code → get it
running → push to GitHub → hand to Devin. No jargon. The detailed docs (DEVIN.md,
SETUP.md) are for the AI agents; this one is for you.

---

## What you have
This folder is the COMPLETE app — everything built so far (prompts 1–5). It has
never run on a real machine yet, so the first goal is just to get it to build.

You need **Node 20** installed (nodejs.org → download the "LTS" version). That's
the only thing to install manually.

---

## PART A — Open and run it in VS Code

1. Unzip this folder somewhere easy, e.g. `C:\Users\joemc\sekondment`.
2. Open **VS Code** → File → Open Folder → pick that folder.
3. VS Code may pop up "install recommended extensions" — say yes.
4. Open the terminal in VS Code: menu **Terminal → New Terminal**.
5. Type these one at a time (press Enter after each, wait for it to finish):
   ```
   npm install
   npm run build
   ```
6. `npm install` downloads everything (takes a few minutes — normal).
7. `npm run build` is the real test. **It will probably show some errors the first
   time** — that is EXPECTED and fine. This is where Claude Code / Devin earns its
   keep: it reads those errors and fixes them. You don't have to understand them.

### If you want Claude Code to fix the build errors inside VS Code:
- Install the Claude Code extension (or use Devin — see Part C).
- Tell it: *"Run npm run build and fix exactly the errors it reports, one by one,
  until the build succeeds. Don't change anything else."*

### Once `npm run build` succeeds:
You're ready to push to GitHub (Part B) — OR skip straight to Devin (Part C) and
let Devin do everything including the push.

---

## PART B — Put it on GitHub (so Devin can grab it)

Easiest path in VS Code:
1. Click the **Source Control** icon on the left (looks like a branch).
2. If it asks to initialise / publish, point it at your repo:
   `github.com/Mindlabsjersey/sekondment-v1`.
3. Type a message like "full build" → click the tick / **Commit** → **Push**.

If that's fiddly, the terminal version is:
```
git add -A
git commit -m "full build from Claude (prompts 1-5)"
git push
```
(You may need to `git remote add origin https://github.com/Mindlabsjersey/sekondment-v1.git`
the first time if it complains there's no remote.)

---

## PART C — Hand it to Devin

Open Devin, start a new session, and paste this:

> Clone `github.com/Mindlabsjersey/sekondment-v1` (main branch). Read DEVIN.md
> first — it's your task list and rules. Then do Task 0: npm install, tsc, and
> npm run build, fixing exactly the errors the build reports until it succeeds.
> Then stop and tell me — I need to create the Supabase project and give you keys
> before Task 1.

Devin works through it. When it stops and asks for keys, do PART D.

---

## PART D — The bits only YOU can do (accounts + keys)

Devin can write code but it can't log into your accounts. When it asks:

### Supabase (the database) — ~5 minutes
1. Go to **supabase.com** → New Project → region **London (eu-west-2)** → set a
   password → Create. Wait ~1 minute.
2. **Settings → API**. Copy these THREE values:
   - Project URL
   - `anon` public key
   - `service_role` secret key
3. Paste all three to Devin and say: *"Here are the Supabase keys. Do Task 1 from
   DEVIN.md — run the migrations in order and get the app booting."*

### Stripe (payments, test mode) — when Devin reaches Task 2
1. **stripe.com** → sign in → switch to **Test mode** (toggle, top right).
2. Enable **Connect** (Stripe's marketplace payments).
3. Give Devin the test secret key (starts `sk_test_`) and follow its instructions.

That's the whole loop. **Devin = code. You = accounts and keys.** Everything Devin
needs to know about the project is already written down in DEVIN.md.

---

## If you get stuck
- Build errors → let Devin/Claude Code fix them; that's their job.
- "It won't push to GitHub" → check you're signed into GitHub in VS Code
  (bottom-left account icon).
- "Which file does what?" → README.md lists the structure; ROADMAP.md shows what's
  done vs left to do.
