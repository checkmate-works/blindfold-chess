/**
 * What a challenge session tells its result screen about the server
 * attempt, in the result route's params.
 *
 * @description
 * `attemptId` is the attempt the result screen finishes (a signed-out run
 * has none). `interrupted` marks a run the shared session hook ended because
 * its answers stopped reaching the server (`remoteFailed`: refused, or three
 * failed sends in a row). Such a run ends like a quit, partway through, and
 * its score is the client's own grading, which a server-run challenge must
 * not record, so the result screen neither finishes the attempt nor leaves
 * the player to wonder why the run stopped (`ChallengeRecordStatus`). The
 * web does the same: no finish, and a toast saying the result was not saved.
 */
export type AttemptResultParams = {
  readonly attemptId?: string;
  readonly interrupted?: "1";
};

export function attemptResultParams(
  attemptId: string | null,
  remoteFailed: boolean,
): AttemptResultParams {
  if (!attemptId) return {};
  return remoteFailed ? { attemptId, interrupted: "1" } : { attemptId };
}
