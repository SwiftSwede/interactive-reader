import assert from "node:assert/strict";
import { test } from "node:test";

import {
  inviteOtpErrorMessage,
  wasRemovedFromClassroom,
} from "./invite-student";

test("cancelled or empty status counts as removed from classroom", () => {
  assert.equal(wasRemovedFromClassroom("cancelled"), true);
  assert.equal(wasRemovedFromClassroom("paused"), true);
  assert.equal(wasRemovedFromClassroom("none"), true);
  assert.equal(wasRemovedFromClassroom(null), true);
  assert.equal(wasRemovedFromClassroom("active"), false);
});

test("OTP rate-limit errors ask the teacher to wait", () => {
  assert.match(
    inviteOtpErrorMessage(
      "For security purposes, you can only request this after 60 seconds."
    ),
    /esperar un minuto/
  );
});

test("other OTP failures still tell the teacher the email did not send", () => {
  assert.match(inviteOtpErrorMessage("Unable to send"), /email no salió/);
  assert.doesNotMatch(inviteOtpErrorMessage("Unable to send"), /ya está en el grupo/);
});

test("SMTP send failures mention Zoho, not a one-minute wait", () => {
  const message = inviteOtpErrorMessage("Error sending magic link email");
  assert.match(message, /Zoho/);
  assert.doesNotMatch(message, /esperar un minuto/);
});
