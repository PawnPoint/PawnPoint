import { createHash } from "node:crypto";

export const config = {
  api: {
    bodyParser: true,
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function getMailchimpConfig() {
  const apiKey = (process.env.MAILCHIMP_API_KEY || "").trim();
  const audienceId = (process.env.MAILCHIMP_AUDIENCE_ID || "").trim();
  const derivedServerPrefix = apiKey.includes("-") ? apiKey.split("-").pop() : "";
  const serverPrefix = (process.env.MAILCHIMP_SERVER_PREFIX || derivedServerPrefix || "").trim();

  if (!apiKey || !audienceId || !serverPrefix) {
    return null;
  }

  return {
    apiKey,
    audienceId,
    serverPrefix,
  };
}

async function upsertMailchimpMember({ apiKey, audienceId, serverPrefix, email, displayName }) {
  const normalizedEmail = email.trim().toLowerCase();
  const subscriberHash = createHash("md5").update(normalizedEmail).digest("hex");
  const body = {
    email_address: normalizedEmail,
    status_if_new: "subscribed",
    status: "subscribed",
    merge_fields: displayName ? { FNAME: displayName.trim().slice(0, 80) } : undefined,
  };

  const response = await fetch(
    `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`,
    {
      method: "PUT",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      (payload && typeof payload === "object" && "detail" in payload && payload.detail) ||
      "Mailchimp request failed";
    throw new Error(String(detail));
  }

  return payload;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const { email, displayName } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedDisplayName = typeof displayName === "string" ? displayName.trim() : "";

  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return json(res, 400, { error: "A valid email is required" });
  }

  const config = getMailchimpConfig();
  if (!config) {
    return json(res, 503, { error: "Mailchimp is not configured" });
  }

  try {
    await upsertMailchimpMember({
      ...config,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
    });
    return json(res, 200, { success: true });
  } catch (err) {
    console.error("[mailchimp/subscribe]", err);
    return json(res, 502, { error: "Failed to subscribe user to Mailchimp" });
  }
}
