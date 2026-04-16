// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// serve(async (req) => {
//   // ✅ CORS headers
//   const corsHeaders = {
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
//   };

//   // ✅ Handle preflight (OPTIONS)
//   if (req.method === "OPTIONS") {
//     return new Response("ok", { headers: corsHeaders });
//   }

//   try {
//     const { email, subject, html } = await req.json();

//     const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

//     const response = await fetch("https://api.resend.com/emails", {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${RESEND_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         from: "onboarding@resend.dev",
//         to: [email],
//         subject,
//         html,
//       }),
//     });

//     const data = await response.json();

//     return new Response(JSON.stringify(data), {
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//       status: 200,
//     });

//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       headers: corsHeaders,
//       status: 500,
//     });
//   }
// });