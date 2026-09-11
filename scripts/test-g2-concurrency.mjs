import { randomUUID } from "node:crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { max: 5, onnotice: () => {} });
const authUserId = randomUUID();
const appUserId = randomUUID();
const eventId = randomUUID();
const versionId = randomUUID();
const templateId = `concurrency-${randomUUID()}`;

async function allocate(label) {
  return sql.begin(async (transaction) => {
    await transaction.unsafe("set local role authenticated");
    await transaction`select set_config('request.jwt.claim.sub', ${authUserId}, true)`;
    return transaction`
      select * from public.create_personal_invitation(
        ${eventId}::uuid,
        ${label},
        null,
        null,
        null,
        ${randomUUID()}::uuid
      )
    `;
  });
}

async function sharedRsvp(publicCode) {
  return sql.begin(async (transaction) => {
    await transaction.unsafe("set local role anon");
    return transaction`
      select * from public.submit_shared_rsvp(
        ${publicCode}, 'Race Shared Guest', '0912345678', 'attending', 0, '', false,
        ${"c".repeat(64)}, ${randomUUID()}::uuid
      )
    `;
  });
}

try {
  await sql`
    insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
    values (
      '00000000-0000-0000-0000-000000000000', ${authUserId}, 'authenticated', 'authenticated',
      ${`${authUserId}@example.test`}, '{"provider":"google"}', '{"name":"Concurrency Owner"}'
    )
  `;
  await sql`
    insert into public.app_users (id, email, display_name)
    values (${appUserId}, ${`${appUserId}@example.test`}, 'Concurrency Owner')
  `;
  await sql`
    insert into public.auth_bindings (app_user_id, auth_user_id, provider, provider_subject)
    values (${appUserId}, ${authUserId}, 'google', ${`google-${authUserId}`})
  `;
  await sql`
    insert into public.templates (id, name, category, renderer_version, content_schema_version)
    values (${templateId}, 'Concurrency Template', 'wedding', 1, 1)
  `;
  await sql`
    insert into public.events (id, owner_app_user_id, template_id, category, lifecycle, starts_at, companion_limit)
    values (${eventId}, ${appUserId}, ${templateId}, 'wedding', 'published', now() + interval '10 days', 3)
  `;
  await sql`insert into public.event_drafts (event_id) values (${eventId})`;
  await sql`
    insert into public.event_versions (id,event_id,version_number,template_id,renderer_version,content_schema_version,content)
    values (${versionId},${eventId},1,${templateId},1,1,'{"rsvp":{"enabled":true}}')
  `;
  await sql`update public.events set published_version_id=${versionId} where id=${eventId}`;
  await sql`insert into public.event_quota_counters (event_id, guest_slots_used) values (${eventId}, 49)`;
  await sql`
    insert into public.guest_slots (event_id, allocation_number, allocation_source, display_name)
    select ${eventId}, n, 'personalized', 'Seed Guest ' || n
    from generate_series(1, 49) n
  `;

  const [{ public_code: publicCode }] = await sql`select public_code from public.events where id=${eventId}`;
  const outcomes = await Promise.allSettled([allocate("Race Personal Guest"), sharedRsvp(publicCode)]);
  const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled");
  const failed = outcomes.filter((outcome) => outcome.status === "rejected");
  if (succeeded.length !== 1 || failed.length !== 1) {
    throw new Error(`Expected one success and one failure; got ${succeeded.length}/${failed.length}`);
  }
  if (!String(failed[0].reason?.message).includes("GUEST_QUOTA_EXCEEDED")) {
    throw new Error(`Unexpected losing transaction error: ${failed[0].reason?.message}`);
  }

  const [counter] = await sql`
    select guest_slots_used,
      (select count(*)::integer from public.guest_slots where event_id = ${eventId}) as guest_count
    from public.event_quota_counters where event_id = ${eventId}
  `;
  if (counter.guest_slots_used !== 50 || counter.guest_count !== 50) {
    throw new Error(`Quota invariant failed: ${JSON.stringify(counter)}`);
  }
  console.log("G6 concurrency PASS: personal-link creation and shared RSVP raced; one won and quota stayed at 50.");
} finally {
  await sql`delete from public.events where id = ${eventId}`;
  await sql`delete from public.auth_bindings where auth_user_id = ${authUserId}`;
  await sql`delete from public.app_users where id = ${appUserId}`;
  await sql`delete from auth.users where id = ${authUserId}`;
  await sql`delete from public.templates where id = ${templateId}`;
  await sql.end();
}
