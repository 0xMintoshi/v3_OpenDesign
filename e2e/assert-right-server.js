/**
 * Playwright globalSetup — fail fast if baseURL is not actually this chart app.
 *
 * Why this exists. `webServer.reuseExistingServer` is true outside CI, so if
 * ANY process already holds port 5173 Playwright will quietly use it instead of
 * starting `npm run dev`. When that process is serving a different app — the
 * parent Quotation App root is the usual culprit, since it is commonly served on
 * the same port during v3 work — every spec still runs, loads the wrong page, and
 * hangs on a selector that will never appear. The result is a full-suite failure
 * whose error messages point at whatever `await` happened to be running when the
 * 30s budget expired, which is nowhere near the cause.
 *
 * That misdirection is expensive: it reads as "the e2e suite is broken" rather
 * than "you have the wrong server on the port". This check turns a 12-test
 * timeout mystery into one line naming the real problem.
 *
 * The rule was already written down and was still missed, which is the argument
 * for enforcing it in code rather than in prose.
 */

const EXPECTED_TITLE = 'Lumen Dental — Treatment Chart';

export default async function assertRightServer(config) {
  const baseURL =
    config?.projects?.[0]?.use?.baseURL ?? config?.use?.baseURL ?? 'http://localhost:5173';

  let html;
  try {
    const res = await fetch(baseURL, { redirect: 'follow' });
    html = await res.text();
  } catch (e) {
    // Nothing is listening yet — that is fine and expected. Playwright's
    // webServer will start the dev server itself.
    return;
  }

  if (html.includes(EXPECTED_TITLE)) return;   // correct app, carry on

  const title = (html.match(/<title>([^<]*)<\/title>/i) || [, '(no <title>)'])[1].trim();
  throw new Error(
    `\n\n  e2e aborted: ${baseURL} is not serving this chart app.\n\n` +
    `    expected page title : ${EXPECTED_TITLE}\n` +
    `    actually served     : ${title}\n\n` +
    `  Something else already holds that port, and reuseExistingServer picked it up.\n` +
    `  The usual cause is an http-server started from the Quotation App root during\n` +
    `  v3 work. Stop it, then re-run — do NOT start debugging the specs.\n\n` +
    `    Windows : Get-NetTCPConnection -LocalPort 5173 -State Listen |\n` +
    `                ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n` +
    `    POSIX   : lsof -ti:5173 | xargs kill\n`
  );
}
