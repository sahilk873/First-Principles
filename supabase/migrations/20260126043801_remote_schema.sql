drop extension if exists "pg_net";


  create table "public"."user_provisioning_events" (
    "id" uuid not null default gen_random_uuid(),
    "created_by" uuid,
    "new_user_id" uuid,
    "name" text not null,
    "role" text not null,
    "generated_email" text not null,
    "password_hint" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_provisioning_events" enable row level security;

CREATE UNIQUE INDEX user_provisioning_events_pkey ON public.user_provisioning_events USING btree (id);

alter table "public"."user_provisioning_events" add constraint "user_provisioning_events_pkey" PRIMARY KEY using index "user_provisioning_events_pkey";

alter table "public"."user_provisioning_events" add constraint "user_provisioning_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."user_provisioning_events" validate constraint "user_provisioning_events_created_by_fkey";

alter table "public"."user_provisioning_events" add constraint "user_provisioning_events_new_user_id_fkey" FOREIGN KEY (new_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."user_provisioning_events" validate constraint "user_provisioning_events_new_user_id_fkey";

alter table "public"."user_provisioning_events" add constraint "user_provisioning_events_role_check" CHECK ((role = ANY (ARRAY['CLINICIAN'::text, 'EXPERT_REVIEWER'::text, 'ORG_ADMIN'::text, 'SYS_ADMIN'::text]))) not valid;

alter table "public"."user_provisioning_events" validate constraint "user_provisioning_events_role_check";

grant delete on table "public"."user_provisioning_events" to "anon";

grant insert on table "public"."user_provisioning_events" to "anon";

grant references on table "public"."user_provisioning_events" to "anon";

grant select on table "public"."user_provisioning_events" to "anon";

grant trigger on table "public"."user_provisioning_events" to "anon";

grant truncate on table "public"."user_provisioning_events" to "anon";

grant update on table "public"."user_provisioning_events" to "anon";

grant delete on table "public"."user_provisioning_events" to "authenticated";

grant insert on table "public"."user_provisioning_events" to "authenticated";

grant references on table "public"."user_provisioning_events" to "authenticated";

grant select on table "public"."user_provisioning_events" to "authenticated";

grant trigger on table "public"."user_provisioning_events" to "authenticated";

grant truncate on table "public"."user_provisioning_events" to "authenticated";

grant update on table "public"."user_provisioning_events" to "authenticated";

grant delete on table "public"."user_provisioning_events" to "service_role";

grant insert on table "public"."user_provisioning_events" to "service_role";

grant references on table "public"."user_provisioning_events" to "service_role";

grant select on table "public"."user_provisioning_events" to "service_role";

grant trigger on table "public"."user_provisioning_events" to "service_role";

grant truncate on table "public"."user_provisioning_events" to "service_role";

grant update on table "public"."user_provisioning_events" to "service_role";


  create policy "Case submitters can view reviews for their cases"
  on "public"."reviews"
  as permissive
  for select
  to authenticated
using ((case_id IN ( SELECT cases.id
   FROM public.cases
  WHERE (cases.submitter_id = auth.uid()))));



  create policy "user_provisioning_events_admins_only"
  on "public"."user_provisioning_events"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'SYS_ADMIN'::text) OR (p.role = 'ORG_ADMIN'::text))))));



