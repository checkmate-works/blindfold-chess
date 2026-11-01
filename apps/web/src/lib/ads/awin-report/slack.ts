import { createFetchWithTimeout } from '@/lib/http/fetch-with-timeout';

/**
 * Post one message to a Slack Incoming Webhook.
 *
 * A webhook URL is bound to the channel chosen when it was issued, so the
 * channel is not a parameter here and cannot be overridden in the payload.
 * The URL's path is the credential — anyone holding it can post to that
 * channel — so the error thrown on failure names the status and Slack's
 * one-word reason (`no_service` for a revoked URL, `channel_not_found`,
 * `invalid_payload`) and never the URL.
 */
export class SlackWebhookError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string
  ) {
    super(`Slack webhook -> HTTP ${status}: ${reason}`);
    this.name = 'SlackWebhookError';
  }
}

/**
 * Deadline for one webhook post, covering the response body as well.
 *
 * An Incoming Webhook does no work the caller waits on — Slack accepts the
 * message and answers `ok` — so a healthy post takes a fraction of a second,
 * and ten seconds is already a generous margin on that. It is short for a
 * second reason: the post runs after both Awin calls, which may together have
 * used up to 140 seconds of the cron route's 300-second default `maxDuration`
 * (see `AWIN_FETCH_TIMEOUT_MS` in `./awin-client.ts`), and it has to reject
 * inside what is left so the failure reaches Sentry instead of dying with the
 * function.
 *
 * A timeout is not proof the message was not posted: Slack may have accepted
 * it and stalled on the answer. Re-running the cron by hand after a timeout
 * can therefore post the day twice, which is the cheaper of the two mistakes.
 */
const SLACK_FETCH_TIMEOUT_MS = 10_000;

const fetchWithTimeout = createFetchWithTimeout(SLACK_FETCH_TIMEOUT_MS);

export async function postSlackMessage(webhookUrl: string, text: string): Promise<void> {
  const res = await fetchWithTimeout(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const reason = (await res.text()).slice(0, 100);
    throw new SlackWebhookError(res.status, reason);
  }
}
