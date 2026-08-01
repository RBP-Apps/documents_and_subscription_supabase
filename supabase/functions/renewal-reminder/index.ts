import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      reqBody = {};
    }
    const forceSend = reqBody?.force_send === true;
    const testSn = reqBody?.test_sn ? String(reqBody.test_sn).trim() : null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate Target Date (Today + 15 days in YYYY-MM-DD format)
    const today = new Date();
    const targetDateObj = new Date(today);
    targetDateObj.setDate(today.getDate() + 15);
    const targetDateStr = targetDateObj.toISOString().split("T")[0]; // YYYY-MM-DD

    let totalRecordsChecked = 0;
    let eligibleRecords = 0;
    let successfullySent = 0;
    let failed = 0;
    let skipped = 0;

    // Define all renewal tables to scan
    const tablesToScan = [
      {
        tableName: "Add New Document",
        idCol: "id",
        snCol: "serial_no",
        docNameCol: "document_name",
        companyCol: "company_name",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
        filterActive: (query: any) => query.eq("is_deleted", false),
      },
      {
        tableName: "vehicle_insurance",
        idCol: "id",
        snCol: "serial_no",
        docNameCol: "registration_no",
        companyCol: "company_name",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
      },
      {
        tableName: "health_insurance",
        idCol: "id",
        snCol: "serial_no",
        docNameCol: "plan_name",
        companyCol: "company_name",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
      },
      {
        tableName: "life_insurance",
        idCol: "id",
        snCol: "serial_no",
        docNameCol: "policy_name",
        companyCol: "company_name",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
      },
      {
        tableName: "fire_policy",
        idCol: "id",
        snCol: "serial_no",
        docNameCol: "policy_no",
        companyCol: "company_name",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
      },
      {
        tableName: "employee_compensation",
        idCol: "id",
        snCol: "serial_no",
        docNameCol: "policy_no",
        companyCol: "company_name",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
      },
      {
        tableName: "email_renewal_details",
        idCol: "id",
        snCol: "sub_serial_no",
        docNameCol: "domain_name",
        companyCol: "description",
        dateCol: "renewal_date",
        needRenewalCol: "need_renewal",
        personCol: "concern_person_name",
        mobileCol: "concern_person_mobile",
      },
    ];

    for (const tableConfig of tablesToScan) {
      try {
        let query = supabase.from(tableConfig.tableName).select("*");
        if (tableConfig.filterActive) {
          query = tableConfig.filterActive(query);
        }

        const { data: rows, error: fetchErr } = await query;
        if (fetchErr) {
          console.error(`Error fetching records from ${tableConfig.tableName}:`, fetchErr);
          continue;
        }

        if (!rows) continue;
        totalRecordsChecked += rows.length;

        for (const row of rows) {
          const rowSn = String(row[tableConfig.snCol] || "").trim();
          const rowIdStr = String(row[tableConfig.idCol] || "").trim();
          const isTargetSnMatch = testSn && (rowSn.toLowerCase() === testSn.toLowerCase() || rowIdStr === testSn);

          // Check if record needs renewal (unless specific test SN is target)
          const needsRenewal = row[tableConfig.needRenewalCol];
          if (needsRenewal === false && !isTargetSnMatch) continue;

          // Check renewal date
          const rawDate = row[tableConfig.dateCol];
          if (!rawDate && !isTargetSnMatch) continue;

          // Format rawDate to YYYY-MM-DD
          let rowDateStr = "";
          try {
            rowDateStr = new Date(rawDate).toISOString().split("T")[0];
          } catch {
            rowDateStr = String(rawDate || "").trim();
          }

          // Allow date bypass if forceSend is true or testSn matches
          if (!forceSend && !isTargetSnMatch && rowDateStr !== targetDateStr) {
            continue;
          }

          const rawMobile = row[tableConfig.mobileCol];
          if (!rawMobile || typeof rawMobile !== "string" || !rawMobile.trim()) {
            continue;
          }

          eligibleRecords++;

          const recordId = `${tableConfig.tableName}_${row[tableConfig.idCol]}`;
          const concernPerson = row[tableConfig.personCol] || "Concerned Person";
          const docName = row[tableConfig.docNameCol] || "Document/Policy";
          const companyName = row[tableConfig.companyCol] || "";

          // Clean mobile number (strip non-digits, ensure 91 prefix for 10-digit Indian numbers)
          let cleanedMobile = rawMobile.replace(/\D/g, "");
          if (cleanedMobile.length === 10) {
            cleanedMobile = `91${cleanedMobile}`;
          }

          // Duplicate Prevention Check (bypassed if forceSend or isTargetSnMatch is true):
          if (!forceSend && !isTargetSnMatch) {
            const { data: existingLogs, error: logErr } = await supabase
              .from("renewal_notification_history")
              .select("id")
              .eq("renewal_id", recordId)
              .eq("renewal_date", rowDateStr || targetDateStr)
              .eq("reminder_days", 15)
              .eq("message_status", "Success");

            if (!logErr && existingLogs && existingLogs.length > 0) {
              skipped++;
              continue; // Skip sending duplicate reminder
            }
          }

          // Send WhatsApp reminder message
          let status = "Failed";
          let whatsappMsgId = null;
          let errorMsg = null;

          if (!WHATSAPP_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
            errorMsg = "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID environment variables";
            failed++;
          } else {
            try {
              const templateName = reqBody?.template_name || Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "renewal_reminder_15days";
              
              // Languages to try: en_US first, then en
              const languagesToTry = ["en_US", "en"];
              const paramsToTry = [
                [concernPerson, docName, rowDateStr || targetDateStr], // 3 params (Dear {{1}}, {{2}} due on {{3}})
                [docName, rowDateStr || targetDateStr],                // 2 params
                [concernPerson, docName],                               // 2 params
              ];

              let waRes: Response | null = null;
              let waData: any = null;
              let matched = false;

              for (const lang of languagesToTry) {
                if (matched) break;
                for (const params of paramsToTry) {
                  const reqBodyObj = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: cleanedMobile,
                    type: "template",
                    template: {
                      name: templateName,
                      language: { code: lang },
                      components: [
                        {
                          type: "body",
                          parameters: params.map((p) => ({ type: "text", text: String(p) })),
                        },
                      ],
                    },
                  };

                  waRes = await fetch(
                    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(reqBodyObj),
                    }
                  );

                  waData = await waRes.json();

                  if (waRes.ok && waData?.messages?.[0]?.id) {
                    matched = true;
                    break;
                  }

                  const errStr = String(waData?.error?.message || "");
                  // If template doesn't exist for this language, try next language
                  if (errStr.includes("does not exist in") || errStr.includes("language")) {
                    break; 
                  }
                }
              }

              if (waRes && waRes.ok && waData?.messages?.[0]?.id) {
                status = "Success";
                whatsappMsgId = waData.messages[0].id;
                successfullySent++;
              } else {
                status = "Failed";
                errorMsg = waData?.error?.message || JSON.stringify(waData);
                failed++;
              }
            } catch (sendErr: any) {
              status = "Failed";
              errorMsg = sendErr?.message || "WhatsApp API connection error";
              failed++;
            }
          }

          // Log complete notification history
          await supabase.from("renewal_notification_history").insert([
            {
              renewal_id: recordId,
              document_name: docName,
              concern_person: concernPerson,
              mobile_number: cleanedMobile,
              renewal_date: targetDateStr,
              reminder_days: 15,
              message_status: status,
              whatsapp_message_id: whatsappMsgId,
              error_message: errorMsg,
              sent_at: status === "Success" ? new Date().toISOString() : null,
            },
          ]);
        }
      } catch (tableErr) {
        console.error(`Error processing table ${tableConfig.tableName}:`, tableErr);
      }
    }

    const summary = {
      total_records_checked: totalRecordsChecked,
      eligible_records: eligibleRecords,
      successfully_sent: successfullySent,
      failed: failed,
      skipped_already_sent: skipped,
      target_renewal_date: targetDateStr,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
