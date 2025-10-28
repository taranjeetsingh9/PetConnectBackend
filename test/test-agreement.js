const fetch = require("node-fetch");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhkZDUyYjdkMzZjOGY3MGIyNTAwZGYxIiwicm9sZSI6InN0YWZmIiwib3JnYW5pemF0aW9uIjoiNjhkZDUyYjZkMzZjOGY3MGIyNTAwZGVlIn0sImlhdCI6MTc2MTYwNzY0NCwiZXhwIjoxNzYxNjExMjQ0fQ.xIdlgWVqlJmN_x0rS_a_zqA2lJsnbrdaDbuTXXYHUnA";
const requestId = "68ffc63961d9778cfe9691b9"; // Use your existing adoption request ID

(async () => {
  try {
    // 1️⃣ Send the adoption agreement
    const sendAgreementRes = await fetch(`http://localhost:5001/api/adoptions/${requestId}/send-agreement`, {
      method: "POST",
      headers: {
        "x-auth-token": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "This is a test adoption agreement for automation"
      })
    });

    const sendAgreementData = await sendAgreementRes.json();
    console.log("Send Agreement Response:", sendAgreementData);

    if (!sendAgreementData.success) return;

    const agreementId = sendAgreementData.agreement._id;

    // 2️⃣ Sign the adoption agreement
    const signAgreementRes = await fetch(`http://localhost:5000/api/adoptions/agreements/${agreementId}/sign`, {
      method: "POST",
      headers: {
        "x-auth-token": token,
        "Content-Type": "application/json"
      }
    });

    const signAgreementData = await signAgreementRes.json();
    console.log("Sign Agreement Response:", signAgreementData);

  } catch (err) {
    console.error("Error:", err);
  }
})();
