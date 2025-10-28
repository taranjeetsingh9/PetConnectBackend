const fetch = require("node-fetch"); // if CommonJS: const fetch = require("node-fetch");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhkZDUyYjdkMzZjOGY3MGIyNTAwZGYzIiwicm9sZSI6ImFkb3B0ZXIifSwiaWF0IjoxNzYxNjA2OTMyLCJleHAiOjE3NjE2MTA1MzJ9.l8kUdYpEFapaIJBL_FSJdnkVjzDgk5zxJ98ZCBr40MI";

const requestId = "68ffc63961d9778cfe9691b9";

(async () => {
  const res = await fetch(`http://localhost:5001/api/payments/adoptions/${requestId}/initiate-payment`, {
    method: "POST",
    headers: {
      "x-auth-token": token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: 50,
      currency: "usd"
    })
  });

  const data = await res.json();
  console.log("Response:", data);
})();
