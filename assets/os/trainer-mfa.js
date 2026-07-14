import { SupabaseHttpError } from "./data.js";

function qrDataUrl(value) {
  const source = String(value || "").trim();
  if (source.startsWith("data:image/svg+xml")) return source;
  if (source.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  }
  throw new SupabaseHttpError("MFA enrollment QR code is missing", 502);
}

function factorSummary(factor) {
  return {
    label: factor.friendlyName || "Aplikacja uwierzytelniaj\u0105ca",
    createdAt: factor.createdAt || ""
  };
}

export class TrainerMfaController {
  constructor(auth) {
    this.auth = auth;
    this.context = null;
  }

  clear() {
    this.context = null;
  }

  async prepare() {
    const factors = await this.auth.listTotpFactors();
    const verified = factors.filter(factor => factor.status === "verified");
    const aal = this.auth.getAuthenticatorAssuranceLevel();

    if (aal === "aal2") {
      if (verified.length === 1) {
        this.clear();
        return { status: "verified", factor: factorSummary(verified[0]) };
      }
      if (verified.length > 1) {
        this.context = { mode: "cleanup" };
        return {
          status: "factor_cleanup_required",
          factors: verified.map(factorSummary)
        };
      }
    }

    if (verified.length > 0) {
      const factor = verified[0];
      const challenge = await this.auth.challengeTotp(factor.id);
      this.context = {
        mode: "challenge",
        factorId: factor.id,
        challengeId: challenge.id
      };
      return {
        status: "challenge",
        factor: factorSummary(factor),
        multipleFactors: verified.length > 1
      };
    }

    this.clear();
    return { status: "enrollment_required" };
  }

  async beginEnrollment() {
    const factors = await this.auth.listTotpFactors();
    if (factors.some(factor => factor.status === "verified")) return this.prepare();

    // Interrupted setup must not accumulate dormant TOTP secrets. Identifiers
    // live only in this controller and are never rendered or persisted.
    for (const factor of factors) {
      await this.auth.unenrollTotp(factor.id);
      await this.auth.listTotpFactors();
    }

    const enrollment = await this.auth.enrollTotp();
    await this.auth.listTotpFactors();
    this.context = {
      mode: "enrollment",
      factorId: String(enrollment.id),
      challengeId: ""
    };
    return {
      status: "enrollment",
      qrCode: qrDataUrl(enrollment?.totp?.qr_code),
      secret: String(enrollment?.totp?.secret || "")
    };
  }

  async verify(code) {
    if (!this.context || !["challenge", "enrollment"].includes(this.context.mode)) {
      throw new SupabaseHttpError("MFA challenge is not active", 409);
    }

    if (!this.context.challengeId) {
      const challenge = await this.auth.challengeTotp(this.context.factorId);
      this.context.challengeId = challenge.id;
    }

    await this.auth.verifyTotp(
      this.context.factorId,
      this.context.challengeId,
      String(code || "").trim()
    );
    this.clear();
    return this.prepare();
  }

  async management() {
    if (this.auth.getAuthenticatorAssuranceLevel() !== "aal2") {
      throw new SupabaseHttpError("AAL2 is required for MFA management", 403);
    }
    const verified = (await this.auth.listTotpFactors())
      .filter(factor => factor.status === "verified");
    return {
      status: "management",
      factors: verified.map(factorSummary)
    };
  }

  async removeFactor(index) {
    if (this.auth.getAuthenticatorAssuranceLevel() !== "aal2") {
      throw new SupabaseHttpError("AAL2 is required for MFA management", 403);
    }
    const verified = (await this.auth.listTotpFactors())
      .filter(factor => factor.status === "verified");
    const factor = verified[Number(index)];
    if (!factor) throw new SupabaseHttpError("MFA factor is unavailable", 404);

    await this.auth.unenrollTotp(factor.id);
    this.clear();
    return this.prepare();
  }
}
