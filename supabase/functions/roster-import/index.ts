import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Column mapping from HTML header text to DB column names
const COLUMN_MAP: Record<string, string> = {
  KeyID: "key_id",
  MemberType: "member_type",
  NickName: "nickname",
  FirstName: "first_name",
  LastName: "last_name",
  Spouse: "spouse",
  Gender: "gender",
  Email: "email",
  EmailPrivate: "email_private",
  UserName: "username",
  BirthDate: "birth_date",
  StreetAddress1: "street_address_1",
  StreetAddress2: "street_address_2",
  AddressPrivate: "address_private",
  HomePhone: "home_phone",
  HomePhonePrivate: "home_phone_private",
  CellPhone: "cell_phone",
  CellPhonePrivate: "cell_phone_private",
  EAANumber: "eaa_number",
  CurrentStanding: "current_standing",
  CurrentJoinedOnDate: "current_joined_on_date",
  ExpirationDate: "expiration_date",
  OtherInfo: "other_info",
  PreferredCity: "preferred_city",
  PreferredState: "preferred_state",
  Country: "country",
  ZipCode: "zip_code",
  Ratings: "ratings",
  AircraftOwned: "aircraft_owned",
  AircraftProject: "aircraft_project",
  AircraftBuilt: "aircraft_built",
  IMC: "imc",
  VMC: "vmc",
  YoungEaglePilot: "young_eagle_pilot",
  YoungEagleVolunteer: "young_eagle_volunteer",
  EaglePilot: "eagle_pilot",
  EagleFlightVolunteer: "eagle_flight_volunteer",
  DateAdded: "date_added",
  DateUpdated: "date_updated",
  UpdatedBy: "updated_by",
  EAAExpiration: "eaa_expiration",
  YouthProtection: "youth_protection",
  BackgroundCheck: "background_check",
  UDF1: "udf1",
  UDF1Text: "udf1_text",
  UDF2: "udf2",
  UDF2Text: "udf2_text",
  UDF3: "udf3",
  UDF3Text: "udf3_text",
  UDF4: "udf4",
  UDF4Text: "udf4_text",
  UDF5: "udf5",
  UDF5Text: "udf5_text",
  AdminLevelDesc: "admin_level_desc",
  ChapterName: "chapter_name",
  ChapterNumber: "chapter_number",
  ChapterType: "chapter_type",
  AptifyID: "aptify_id",
};

const BOOLEAN_FIELDS = new Set([
  "email_private", "address_private", "home_phone_private", "cell_phone_private",
  "imc", "vmc", "young_eagle_pilot", "young_eagle_volunteer",
  "eagle_pilot", "eagle_flight_volunteer",
]);

const DATE_FIELDS = new Set([
  "birth_date", "current_joined_on_date", "expiration_date",
  "date_added", "date_updated", "eaa_expiration",
]);

const INTEGER_FIELDS = new Set(["key_id", "aptify_id"]);

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseHtmlTable(html: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  // Extract header row
  const headerMatch = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
  if (!headerMatch) return rows;

  const headers: string[] = [];
  const thRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
  let m;
  while ((m = thRegex.exec(headerMatch[1])) !== null) {
    headers.push(m[1].replace(/<[^>]*>/g, "").trim());
  }

  // Extract data rows
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowIndex = 0;
  while ((m = trRegex.exec(html)) !== null) {
    if (rowIndex === 0) { rowIndex++; continue; } // skip header
    rowIndex++;
    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm;
    while ((cm = tdRegex.exec(m[1])) !== null) {
      cells.push(decodeHtmlEntities(cm[1].replace(/<[^>]*>/g, "").trim()));
    }
    if (cells.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    rows.push(row);
  }
  return rows;
}

function convertValue(dbCol: string, val: string): any {
  if (!val || val === "") return null;
  if (BOOLEAN_FIELDS.has(dbCol)) {
    if (!val || val === "") return false;
    return val === "True" || val === "true" || val === "1" || val === "Yes";
  }
  if (DATE_FIELDS.has(dbCol)) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  }
  if (INTEGER_FIELDS.has(dbCol)) {
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }
  return val;
}

function mapRow(rawRow: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [htmlCol, val] of Object.entries(rawRow)) {
    const dbCol = COLUMN_MAP[htmlCol];
    if (dbCol) {
      mapped[dbCol] = convertValue(dbCol, val);
    }
  }
  return mapped;
}

// Fields to skip when diffing
const SKIP_DIFF = new Set(["created_at", "updated_at", "last_import_id", "date_updated", "updated_by"]);

function normalizeForDiff(val: any, field: string): string {
  if (val == null || val === "") return "";
  if (BOOLEAN_FIELDS.has(field)) return val ? "true" : "false";
  return String(val);
}

function diffRecord(
  existing: Record<string, any>,
  incoming: Record<string, any>
): { field: string; oldVal: string; newVal: string }[] {
  const changes: { field: string; oldVal: string; newVal: string }[] = [];
  for (const [key, newVal] of Object.entries(incoming)) {
    if (SKIP_DIFF.has(key)) continue;
    const oldVal = existing[key];
    const oldStr = normalizeForDiff(oldVal, key);
    const newStr = normalizeForDiff(newVal, key);
    if (oldStr !== newStr) {
      changes.push({ field: key, oldVal: oldStr, newVal: newStr });
    }
  }
  return changes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Verify user and admin role
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlContent = await file.text();
    const rawRows = parseHtmlTable(htmlContent);
    if (rawRows.length === 0) {
      return new Response(JSON.stringify({ error: "No data rows found in file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incomingRecords = rawRows.map(mapRow).filter((r) => r.key_id != null);

    // Fetch existing members
    const { data: existingMembers } = await adminClient
      .from("roster_members")
      .select("*");
    const existingMap = new Map<number, Record<string, any>>();
    (existingMembers || []).forEach((m: any) => existingMap.set(m.key_id, m));

    // Create import record
    const { data: importRecord, error: importError } = await adminClient
      .from("roster_imports")
      .insert({
        imported_by: user.id,
        file_name: file.name,
        record_count: incomingRecords.length,
        status: "processing",
      })
      .select()
      .single();

    if (importError) throw importError;
    const importId = importRecord.id;

    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;
    const changeRecords: any[] = [];

    const incomingKeyIds = new Set(incomingRecords.map((r) => r.key_id));

    // Process each incoming record
    for (const incoming of incomingRecords) {
      const existing = existingMap.get(incoming.key_id);

      if (!existing) {
        // New member
        addedCount++;
        await adminClient.from("roster_members").insert({
          ...incoming,
          last_import_id: importId,
        });
        changeRecords.push({
          import_id: importId,
          key_id: incoming.key_id,
          change_type: "added",
          field_name: null,
          old_value: null,
          new_value: null,
          first_name: incoming.first_name,
          last_name: incoming.last_name,
          eaa_number: incoming.eaa_number,
        });
      } else {
        // Check for modifications
        const diffs = diffRecord(existing, incoming);
        if (diffs.length > 0) {
          modifiedCount++;
          await adminClient
            .from("roster_members")
            .update({ ...incoming, last_import_id: importId })
            .eq("key_id", incoming.key_id);

          for (const diff of diffs) {
            changeRecords.push({
              import_id: importId,
              key_id: incoming.key_id,
              change_type: "modified",
              field_name: diff.field,
              old_value: diff.oldVal,
              new_value: diff.newVal,
              first_name: incoming.first_name,
              last_name: incoming.last_name,
              eaa_number: incoming.eaa_number,
            });
          }
        }
      }
    }

    // Reconcile Prospect stubs: when EAA roster brings in a real (non-Prospect)
    // record for an EAA number that we previously stubbed as a local Prospect,
    // repoint the application's roster_key_id to the real record before the
    // Prospect stub gets deleted by the removal step below. Roster data wins.
    const incomingByEaa = new Map<string, any>();
    for (const r of incomingRecords) {
      const eaa = (r.eaa_number || "").toString().trim();
      if (!eaa) continue;
      if (r.member_type && String(r.member_type).toLowerCase() === "prospect") continue;
      if (!incomingByEaa.has(eaa)) incomingByEaa.set(eaa, r);
    }
    for (const [keyId, existing] of existingMap) {
      if (incomingKeyIds.has(keyId)) continue;
      const isProspect = existing.member_type && String(existing.member_type).toLowerCase() === "prospect";
      if (!isProspect) continue;
      const eaa = (existing.eaa_number || "").toString().trim();
      if (!eaa) continue;
      const replacement = incomingByEaa.get(eaa);
      if (!replacement) continue;
      // Repoint pending application records to the new roster key_id
      await adminClient
        .from("new_member_applications")
        .update({ roster_key_id: replacement.key_id })
        .eq("roster_key_id", keyId);
    }

    // Detect and delete removed members
    const removedKeyIds: number[] = [];
    for (const [keyId, existing] of existingMap) {
      if (!incomingKeyIds.has(keyId)) {
        removedCount++;
        removedKeyIds.push(keyId);
        changeRecords.push({
          import_id: importId,
          key_id: keyId,
          change_type: "removed",
          field_name: null,
          old_value: null,
          new_value: null,
          first_name: existing.first_name,
          last_name: existing.last_name,
          eaa_number: existing.eaa_number,
        });
      }
    }

    // Delete removed members from roster_members
    if (removedKeyIds.length > 0) {
      const delBatchSize = 100;
      for (let i = 0; i < removedKeyIds.length; i += delBatchSize) {
        const batch = removedKeyIds.slice(i, i + delBatchSize);
        await adminClient
          .from("roster_members")
          .delete()
          .in("key_id", batch);
      }
    }

    // Batch insert change records
    if (changeRecords.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < changeRecords.length; i += batchSize) {
        await adminClient
          .from("roster_import_changes")
          .insert(changeRecords.slice(i, i + batchSize));
      }
    }

    // Save snapshots of all current members after import
    const { data: allMembers } = await adminClient.from("roster_members").select("*");
    if (allMembers && allMembers.length > 0) {
      const snapshotRows = allMembers.map((m: any) => ({
        import_id: importId,
        key_id: m.key_id,
        snapshot: m,
      }));
      const snapBatchSize = 100;
      for (let i = 0; i < snapshotRows.length; i += snapBatchSize) {
        await adminClient
          .from("roster_member_snapshots")
          .insert(snapshotRows.slice(i, i + snapBatchSize));
      }
    }

    // Update import record with counts
    await adminClient
      .from("roster_imports")
      .update({
        added_count: addedCount,
        modified_count: modifiedCount,
        removed_count: removedCount,
        status: "completed",
      })
      .eq("id", importId);

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importId,
        record_count: incomingRecords.length,
        added: addedCount,
        modified: modifiedCount,
        removed: removedCount,
        total_changes: changeRecords.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
