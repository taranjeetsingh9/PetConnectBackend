// test/test-full-workflow.js
const fetch = require("node-fetch");

const STAFF_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhkZDUyYjdkMzZjOGY3MGIyNTAwZGYxIiwicm9sZSI6InN0YWZmIiwib3JnYW5pemF0aW9uIjoiNjhkZDUyYjZkMzZjOGY3MGIyNTAwZGVlIn0sImlhdCI6MTc2MTYxMTcxNywiZXhwIjoxNzYxNjE1MzE3fQ.ve9hT7tr1ccxZjH7hlhoWCP_6kDtByFLDUNBxmy1uiM";
const ADOPTER_TOKEN ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhkZDUyYjdkMzZjOGY3MGIyNTAwZGYzIiwicm9sZSI6ImFkb3B0ZXIifSwiaWF0IjoxNzYxNjEyMjU1LCJleHAiOjE3NjE2MTU4NTV9.to0Ob22EQVwoqLq01bcQMThu2KEaP6BvMpOzQRzoMZM";
const REQUEST_ID = "690001add7a361fd11b8bd96";

(async () => {
  try {
    console.log("🔄 RESETTING AND TESTING FULL WORKFLOW\n");

    // --------------------------------------------------
    // STEP 1: Reset adoption request back to "meeting"
    // --------------------------------------------------
    console.log("🔄 STEP 1: Resetting request status...");
    const resetRes = await fetch(
      `http://localhost:5001/api/adoptions/${REQUEST_ID}/status`,
      {
        method: "PATCH",
        headers: {
          "x-auth-token": STAFF_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "meeting",
          meetingDate: "2025-10-28T07:19:00.000Z",
        }),
      }
    );

    const resetData = await resetRes.json();
    console.log("Reset Response:", JSON.stringify(resetData, null, 2));

    if (!resetData.success && !resetData.msg?.includes("scheduled")) {
      console.log("❌ Failed to reset request status");
      return;
    }

    // --------------------------------------------------
    // STEP 2: Verify reset worked
    // --------------------------------------------------
    console.log("\n📋 STEP 2: Checking reset status...");
    const statusRes = await fetch(
      `http://localhost:5001/api/adoptions/${REQUEST_ID}/details`,
      {
        method: "GET",
        headers: {
          "x-auth-token": ADOPTER_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const statusData = await statusRes.json();
    console.log("Full Details Response:", JSON.stringify(statusData, null, 2));

    // detect proper nesting
    const request =
      statusData.request ||
      statusData.data ||
      statusData.adoptionRequest ||
      statusData;

    console.log("New Status:", request?.status);
    console.log("Meeting Info:", request?.meeting);

    if (request?.status !== "meeting") {
      console.log("❌ Reset failed - status is not 'meeting'");
      return;
    }

    // --------------------------------------------------
    // STEP 3: Complete meeting
    // --------------------------------------------------
    console.log("\n✅ STEP 3: Completing meeting...");
    const completeMeetingRes = await fetch(
      `http://localhost:5001/api/adoptions/${REQUEST_ID}/complete-meeting`,
      {
        method: "POST",
        headers: {
          "x-auth-token": STAFF_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: "Meeting completed via reset script" }),
      }
    );

    const completeMeetingData = await completeMeetingRes.json();
    console.log(
      "Complete Meeting Response:",
      JSON.stringify(completeMeetingData, null, 2)
    );

    if (!completeMeetingData.msg?.includes("completed successfully")) {
      console.log("❌ Failed to complete meeting");
      return;
    }

    // --------------------------------------------------
    // STEP 4: Send adoption agreement
    // --------------------------------------------------
    console.log("\n📝 STEP 4: Sending Adoption Agreement...");
    const sendAgreementRes = await fetch(
      `http://localhost:5001/api/adoptions/${REQUEST_ID}/send-agreement`,
      {
        method: "POST",
        headers: {
          "x-auth-token": STAFF_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customClauses: [
            {
              clause:
                "Adopter agrees to provide monthly updates for the first 6 months",
              required: true,
            },
          ],
        }),
      }
    );

    const sendAgreementData = await sendAgreementRes.json();
    console.log(
      "Send Agreement Response (full):",
      JSON.stringify(sendAgreementData, null, 2)
    );

    if (!sendAgreementData.success) {
      console.log("❌ Agreement sending failed");
      return;
    }

    // extract agreement ID safely
    const AGREEMENT_ID =
      sendAgreementData.agreement?._id ||
      sendAgreementData.agreement?.id ||
      sendAgreementData.data?.agreementId ||
      sendAgreementData.data?._id;

    console.log("📄 Agreement ID detected:", AGREEMENT_ID);
    if (!AGREEMENT_ID) {
      console.log("❌ No agreement ID found");
      return;
    }

    // --------------------------------------------------
    // STEP 5: Sign agreement (adopter side)
    // --------------------------------------------------
    console.log("\n🖊️ STEP 5: Signing Adoption Agreement...");
    const signAgreementRes = await fetch(
      `http://localhost:5001/api/adoptions/agreements/${AGREEMENT_ID}/sign`,
      {
        method: "POST",
        headers: {
          "x-auth-token": ADOPTER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature: "test-signature-base64",
        }),
      }
    );

    const signAgreementData = await signAgreementRes.json();
    console.log(
      "Sign Agreement Response:",
      JSON.stringify(signAgreementData, null, 2)
    );

    if (
      !signAgreementData.success &&
      !signAgreementData.msg?.includes("signed successfully")
    ) {
      console.log("❌ Agreement signing failed");
      return;
    }

    // --------------------------------------------------
    // STEP 6: Initiate payment
    // --------------------------------------------------
    console.log("\n💳 STEP 6: Initiating Payment...");
    const initiatePaymentRes = await fetch(
      `http://localhost:5001/api/payments/adoptions/${REQUEST_ID}/initiate-payment`,
      {
        method: "POST",
        headers: {
          "x-auth-token": ADOPTER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const initiatePaymentData = await initiatePaymentRes.json();
    console.log(
      "Initiate Payment Response:",
      JSON.stringify(initiatePaymentData, null, 2)
    );

    if (initiatePaymentData.success) {
      console.log("\n🎉 FULL WORKFLOW COMPLETED SUCCESSFULLY!");
      console.log("💰 Payment ID:", initiatePaymentData.data?.paymentId);
      console.log(
        "💳 Client Secret:",
        initiatePaymentData.data?.clientSecret ? "✅ Received" : "❌ Missing"
      );
      console.log("💵 Amount: $", initiatePaymentData.data?.amount);
    } else {
      console.log("❌ Payment initiation failed:", initiatePaymentData.error);
    }
  } catch (err) {
    console.error("❌ Error in workflow script:", err.message);
  }
})();
