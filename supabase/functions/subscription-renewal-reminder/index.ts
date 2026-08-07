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

    // Fetch records from "create_subscription" table
    const { data: rows, error: fetchErr } = await supabase
      .from("create_subscription")
      .select("*");

    if (fetchErr) {
      console.error("Error fetching records from create_subscription:", fetchErr);
      return new Response(
        JSON.stringify({ error: `Fetch error: ${fetchErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows) {
      totalRecordsChecked = rows.length;

      for (const row of rows) {
        const rowSn = String(row.serial_no || "").trim();
        const rowIdStr = String(row.id || "").trim();
        const isTargetSnMatch = testSn && (rowSn.toLowerCase() === testSn.toLowerCase() || rowIdStr === testSn);

        // Check end_date or planned_1
        const rawDate = row.end_date || row.planned_1;
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

        const rawMobile = row.subscriber_mobile || row.mobile_number || row.contact_no || row.concern_person_mobile;
        if (!rawMobile || typeof rawMobile !== "string" || !rawMobile.trim()) {
          continue;
        }

        eligibleRecords++;

        const recordId = `create_subscription_${row.id}`;
        const subscriberName = row.subscriber_name || "Subscriber";
        const companyName = row.company_name || "";
        const subscriptionName = row.subscription_name || "";
        const frequency = row.frequency || "N/A";
        const price = row.price ? `₹${row.price}` : "N/A";
        const documentCopy = row.document_copy && typeof row.document_copy === "string" && row.document_copy.trim() ? row.document_copy.trim() : null;

        // Clean mobile number (strip non-digits, ensure 91 prefix for 10-digit Indian numbers)
        let cleanedMobile = rawMobile.replace(/\D/g, "");
        if (cleanedMobile.length === 10) {
          cleanedMobile = `91${cleanedMobile}`;
        }

        // Duplicate Prevention Check:
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

        // Send WhatsApp reminder message using "subscription_renewal_reminder" template
        let status = "Failed";
        let whatsappMsgId = null;
        let errorMsg = null;

        if (!WHATSAPP_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
          errorMsg = "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID environment variables";
          failed++;
        } else {
          try {
            const templateName = reqBody?.template_name || "subscription_renewal_reminder";
            
            // Languages to try: en_US first, then en
            const languagesToTry = ["en_US", "en"];
            let waRes: Response | null = null;
            let waData: any = null;
            let matched = false;

            // Variables mapping according to template spec:
            // {{1}} = Subscriber Name
            // {{2}} = Company Name
            // {{3}} = Subscription Name
            // {{4}} = Frequency
            // {{5}} = Price
            // {{6}} = End Date
            const formattedDateParam = rowDateStr || targetDateStr;
            const bodyParameters = [
              { type: "text", text: String(subscriberName) },
              { type: "text", text: String(companyName) },
              { type: "text", text: String(subscriptionName) },
              { type: "text", text: String(frequency) },
              { type: "text", text: String(price) },
              { type: "text", text: String(formattedDateParam) },
            ];

            // Build Header Component if document_copy is present in DB
            let headerComponent: any = null;
            if (documentCopy) {
              let filename = `Subscription_${subscriptionName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
              if (documentCopy.includes(".")) {
                const urlParts = documentCopy.split("/");
                const lastPart = urlParts[urlParts.length - 1].split("?")[0];
                if (lastPart.includes(".")) {
                  filename = decodeURIComponent(lastPart);
                }
              }
              if (!filename.toLowerCase().match(/\.(pdf|jpg|jpeg|png)$/)) {
                filename = `${filename}.pdf`;
              }

              headerComponent = {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: documentCopy,
                      filename: filename,
                    },
                  },
                ],
              };
            }

            for (const lang of languagesToTry) {
              if (matched) break;

              const componentsList: any[] = [];
              if (headerComponent) {
                componentsList.push(headerComponent);
              }
              componentsList.push({
                type: "body",
                parameters: bodyParameters,
              });

              const reqBodyObj = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanedMobile,
                type: "template",
                template: {
                  name: templateName,
                  language: { code: lang },
                  components: componentsList,
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

              // Fallback without document header if sending with header fails or if template has no header
              if (headerComponent) {
                const fallbackReqBodyObj = {
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
                        parameters: bodyParameters,
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
                    body: JSON.stringify(fallbackReqBodyObj),
                  }
                );

                waData = await waRes.json();

                if (waRes.ok && waData?.messages?.[0]?.id) {
                  matched = true;
                  break;
                }
              }

              const errStr = String(waData?.error?.message || "");
              if (errStr.includes("does not exist in") || errStr.includes("language")) {
                continue;
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

        // Log notification history
        await supabase.from("renewal_notification_history").insert([
          {
            renewal_id: recordId,
            document_name: `Subscription (${subscriptionName})`,
            concern_person: subscriberName,
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
    }

    const summary = {
      template: "subscription_renewal_reminder",
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
