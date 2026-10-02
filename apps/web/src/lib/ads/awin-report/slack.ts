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

export async function postSlackMessage(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const reason = (await res.text()).slice(0, 100);
    throw new SlackWebhookError(res.status, reason);
  }
}
