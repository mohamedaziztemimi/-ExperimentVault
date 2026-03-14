import { db, activityLogs } from '@ev/db'

export interface ActivityDiff {
  field: string
  oldValue: unknown
  newValue: unknown
}

export async function logActivity(params: {
  experimentId: string
  userId: string
  action: string
  diff?: ActivityDiff[]
}): Promise<void> {
  const diffPayload =
    params.diff !== undefined
      ? params.diff.map((d) => ({
          field: d.field,
          old_value: d.oldValue,
          new_value: d.newValue,
        }))
      : null

  await db.insert(activityLogs).values({
    experiment_id: params.experimentId,
    user_id: params.userId,
    action: params.action,
    diff: diffPayload,
  })
}
