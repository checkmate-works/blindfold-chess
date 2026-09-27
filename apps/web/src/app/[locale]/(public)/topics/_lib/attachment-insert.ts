/**
 * Argument shape of an attachment-aware create wrapper, derived from the base
 * action it forwards to. The wrapper owns `afterInsert` — it composes the
 * attachment INSERT with whatever the topic adds — so the topic's own hook
 * comes in as `extraAfterInsert` instead. Deriving it keeps a parameter added
 * to `createPostBase` / `createReplyBase` from having to be copied into every
 * wrapper by hand.
 */
export type WithExtraAfterInsert<P extends { afterInsert?: unknown }> = Omit<P, 'afterInsert'> & {
  /** Topic-specific extra rows to insert inside the same transaction as the
   *  post / reply and its attachment (e.g. an opening rating row). */
  extraAfterInsert?: P['afterInsert'];
};

/**
 * Run a create call whose transaction carries an attachment INSERT, turning a
 * failure the attachment kind's mapper recognises (a constraint or SQLSTATE it
 * knows how to explain) into a form error. Anything the mapper does not
 * recognise — including the `redirect()` a successful create throws — is
 * rethrown untouched.
 */
export async function mapAttachmentInsertError<S>(
  run: () => Promise<S>,
  toErrorKey: (err: unknown) => string | null
): Promise<S | { error: string }> {
  try {
    return await run();
  } catch (err) {
    const error = toErrorKey(err);
    if (error) {
      return { error };
    }
    throw err;
  }
}
