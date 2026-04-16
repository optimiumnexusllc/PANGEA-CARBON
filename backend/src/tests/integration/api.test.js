/**
 * PANGEA CARBON — Integration Tests v1.0 Elite
 * 10 test suites: Security, Auth, RBAC, Validation, Plan Limits, PDF Signature
 */
jest.mock("@prisma/client", () => {
  const m = {
    $queryRaw: jest.fn().mockResolvedValue([{result:1}]),
    $disconnect: jest.fn(),
    user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn(), updateMany: jest.fn() },
    project: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), aggregate: jest.fn().mockResolvedValue({_sum:{installedMW:0}}) },
    report: { findMany: jest.fn().mockResolvedValue([]) },
    rolePermissionOverride: { findMany: jest.fn().mockResolvedValue([]) },
    groupMember: { findMany: jest.fn().mockResolvedValue([]) },
    userPermission: { findMany: jest.fn().mockResolvedValue([]) },
    featureFlag: { findUnique: jest.fn().mockResolvedValue({enabled:true,rolloutPct:100}) },
    organization: { findUnique: jest.fn().mockResolvedValue({plan:"ENTERPRISE",status:"ACTIVE"}) },
    emailOTP: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(), updateMany: jest.fn() },
    systemSetting: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() },
    apiKey: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    webhookEndpoint: { findMany: jest.fn().mockResolvedValue([]) },
    orgFeature: { findUnique: jest.fn().mockResolvedValue(null) },
    notification: { findMany: jest.fn().mockResolvedValue([]) },
    twoFactorAuth: { findUnique: jest.fn().mockResolvedValue(null) },
    notificationPreference: { findUnique: jest.fn().mockResolvedValue(null) },
    mRVRecord: { findMany: jest.fn().mockResolvedValue([]) },
    marketplaceListing: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  };
  return { PrismaClient: jest.fn(() => m) };
});

jest.mock("rate-limit-redis", () => ({ RedisStore: jest.fn().mockImplementation(() => ({})) }));
jest.mock("ioredis", () => jest.fn().mockImplementation(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue("OK"),
  disconnect: jest.fn(),
})));

// Mock rate limiter - bypass for testing
jest.mock("../../middleware/rateLimiter", () => {
  const passThrough = (req, res, next) => next();
  return {
    authLimiter: passThrough,
    mfaLimiter: passThrough,
    apiLimiter: passThrough,
    uploadLimiter: passThrough,
    marketplaceLimiter: passThrough,
  };
});

jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  expressErrorHandler: jest.fn(() => (err, req, res, next) => next(err)),
  expressIntegration: jest.fn(() => {}),
  httpIntegration: jest.fn(() => {}),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: jest.fn() })),
  setUser: jest.fn(),
}));
jest.mock("@sentry/profiling-node", () => ({ nodeProfilingIntegration: jest.fn(() => ({})) }));

jest.mock("../../services/email.service", () => ({
  sendEmailOTP: jest.fn().mockResolvedValue(true),
  sendTemplated: jest.fn().mockResolvedValue(true),
}));

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
    getJobCounts: jest.fn().mockResolvedValue({ waiting:0, active:0, completed:0, failed:0 }),
  })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  QueueEvents: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
let app;

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-32chars-minimum-ok";
  process.env.JWT_REFRESH_SECRET = "test-refresh-32chars-minimum-ok";
  process.env.NODE_ENV = "test";
  app = require("../../index");
}, 15000);

afterAll(async () => {
  await new Promise(r => setTimeout(r, 300));
});

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

const analystToken = () => makeToken({ userId: "analyst-1", role: "ANALYST", email: "analyst@test.com" });
const adminToken   = () => makeToken({ userId: "admin-1",   role: "ADMIN",   email: "admin@test.com" });
const ownerToken   = () => makeToken({ userId: "owner-1",   role: "ORG_OWNER", email: "owner@test.com", organizationId: "org-1" });

// =============================================================================
// T01 - Health Check
// =============================================================================
describe("T01 - Health Check", () => {
  test("GET /api/health returns 200 and status ok", async () => {
    const res = await request(app).get("/api/health").timeout(5000);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  }, 10000);
});

// =============================================================================
// T02 - Security Headers OWASP
// =============================================================================
describe("T02 - Security Headers OWASP", () => {
  test("x-content-type-options is nosniff", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  test("x-powered-by header is removed", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  test("frame protection header exists", async () => {
    const res = await request(app).get("/api/health");
    const frameHeader = res.headers["x-frame-options"] || res.headers["content-security-policy"];
    expect(frameHeader).toBeDefined();
  });

  test("DNS prefetch control is set", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-dns-prefetch-control"]).toBeDefined();
  });
});

// =============================================================================
// T03 - Authentication Security
// =============================================================================
describe("T03 - Authentication Security", () => {
  test("POST /api/auth/login with empty body returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect([400, 401, 422]).toContain(res.status);
  });

  test("Protected route without token returns 401", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });

  test("Protected route with invalid token returns 401", async () => {
    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer invalid.jwt.token.here");
    expect(res.status).toBe(401);
  });

  test("Token with wrong secret returns 401", async () => {
    const badToken = jwt.sign(
      { userId: "u1", role: "SUPER_ADMIN" },
      "wrong-secret-key",
      { expiresIn: "1h" }
    );
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", "Bearer " + badToken);
    expect(res.status).toBe(401);
  });

  test("Bearer token without Bearer prefix returns 401", async () => {
    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", analystToken());
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// T04 - RBAC Authorization
// =============================================================================
describe("T04 - RBAC Authorization", () => {
  test("ANALYST cannot access /api/admin/users", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", "Bearer " + analystToken());
    expect([401, 403]).toContain(res.status);
  });

  test("ANALYST cannot access /api/rbac/matrix", async () => {
    const res = await request(app)
      .get("/api/rbac/matrix")
      .set("Authorization", "Bearer " + analystToken());
    expect([401, 403]).toContain(res.status);
  });

  test("Unauthenticated access to admin route returns 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  test("ADMIN can reach admin endpoint (no 401/403)", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", "Bearer " + adminToken());
    expect([200, 500, 503]).toContain(res.status);
  });
});

// =============================================================================
// T05 - Input Validation and Injection Protection
// =============================================================================
describe("T05 - Input Validation and Injection Protection", () => {
  test("SQL injection in login body does not cause 500", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin' OR '1'='1'; DROP TABLE users;--", password: "x" });
    expect(res.status).not.toBe(500);
    expect([400, 401, 422]).toContain(res.status);
  });

  test("Oversized JSON payload returns 413", async () => {
    const big = "x".repeat(11 * 1024 * 1024);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: big });
    expect([413, 400]).toContain(res.status);
  });

  test("Unknown route returns 404 with clean JSON error", async () => {
    const res = await request(app).get("/api/route-unknown-pangea-12345");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/node_modules/);
    expect(body).not.toMatch(/at Object/);
  });

  test("Wrong HTTP method returns 404 or 405", async () => {
    const res = await request(app).put("/api/auth/login").send({});
    expect([404, 405]).toContain(res.status);
  });
});

// =============================================================================
// T06 - Plan Limits Enforcement
// =============================================================================
describe("T06 - Plan Limits Enforcement", () => {
  test("ESG endpoint without auth returns 401", async () => {
    const res = await request(app).post("/api/esg/assessments").send({});
    expect(res.status).toBe(401);
  });

  test("Pipeline issue-credits without auth returns 401", async () => {
    const res = await request(app).post("/api/pipeline/fake-id/issue-credits").send({});
    expect([401, 404]).toContain(res.status);
  });

  test("Token VCU generation without auth returns 401", async () => {
    const res = await request(app).post("/api/tokens/vcu").send({});
    expect(res.status).toBe(401);
  });

  test("AI assistant without auth returns 401", async () => {
    const res = await request(app).post("/api/assistant/chat").send({});
    expect([401, 403]).toContain(res.status);
  });
});

// =============================================================================
// T07 - Data Isolation
// =============================================================================
describe("T07 - Data Isolation", () => {
  test("GET /api/projects without token returns 401 and no data", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
    expect(res.body.projects).toBeUndefined();
  });

  test("GET /api/ghg/audits without token returns 401", async () => {
    const res = await request(app).get("/api/ghg/audits");
    expect(res.status).toBe(401);
  });

  test("GET /api/reports without token returns 401", async () => {
    const res = await request(app).get("/api/reports");
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// T08 - Error Handling Quality
// =============================================================================
describe("T08 - Error Handling Quality", () => {
  test("All error responses are valid JSON", async () => {
    const res = await request(app).get("/api/nonexistent-endpoint");
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(typeof res.body).toBe("object");
  });

  test("404 error has meaningful error field", async () => {
    const res = await request(app).get("/api/nonexistent-endpoint");
    expect(res.body.error).toBeDefined();
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// T09 - Performance Baseline
// =============================================================================
describe("T09 - Performance Baseline", () => {
  test("Health check responds in under 1000ms", async () => {
    const start = Date.now();
    await request(app).get("/api/health");
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test("5 concurrent health checks all return 200", async () => {
    const reqs = Array.from({ length: 5 }, () => request(app).get("/api/health"));
    const results = await Promise.all(reqs);
    results.forEach(r => expect(r.status).toBe(200));
  });
});

// =============================================================================
// T10 - PDF Cryptographic Signature
// =============================================================================
describe("T10 - PDF Cryptographic Signature", () => {
  const { signDocument, verifyDocument } = require("../../services/pdf-sign.service");

  test("signDocument produces a 32-char verificationId", () => {
    const sig = signDocument(
      Buffer.from("PANGEA CARBON MRV REPORT"),
      { projectId: "p1", orgId: "o1", type: "MRV", standard: "Verra VCS" }
    );
    expect(sig.verificationId).toHaveLength(32);
    expect(sig.algorithm).toBe("HMAC-SHA256");
    expect(sig.issuer).toContain("PANGEA CARBON");
  });

  test("signDocument verifyUrl points to pangea-carbon.com", () => {
    const sig = signDocument(
      Buffer.from("TEST"),
      { projectId: "p2", orgId: "o2", type: "ESG" }
    );
    expect(sig.verifyUrl).toMatch(/^https:\/\/pangea-carbon\.com\/verify\//);
  });

  test("verifyDocument validates unmodified document", () => {
    const content = Buffer.from("SOLAR PROJECT CI ACM0002 v22");
    const meta = { projectId: "p3", orgId: "o3", type: "MRV", standard: "Verra VCS" };
    const sig = signDocument(content, meta);
    const result = verifyDocument(content, sig);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
  });

  test("verifyDocument detects tampered document", () => {
    const original = Buffer.from("ORIGINAL CERTIFIED REPORT");
    const tampered = Buffer.from("TAMPERED MODIFIED REPORT");
    const sig = signDocument(original, { projectId: "p4", orgId: "o4", type: "GHG" });
    const result = verifyDocument(tampered, sig);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  test("Same content always produces same hash", () => {
    const content = Buffer.from("IDENTICAL DOCUMENT CONTENT");
    const meta = { projectId: "same", orgId: "same", type: "MRV" };
    const sig1 = signDocument(content, meta);
    const sig2 = signDocument(content, meta);
    expect(sig1.contentHash).toBe(sig2.contentHash);
  });
});
