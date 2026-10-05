import "dotenv/config";

for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  const raw = process.env[name];
  if (!raw) { console.log(name, "-> MISSING"); continue; }
  try {
    const u = new URL(raw);
    console.log(name, {
      username: decodeURIComponent(u.username),
      host: u.hostname,
      port: u.port,
      database: u.pathname,
      passwordLength: decodeURIComponent(u.password).length,
      passwordOnlyLettersDigits: /^[A-Za-z0-9]+$/.test(decodeURIComponent(u.password)),
      query: u.search,
    });
  } catch (e) {
    console.log(name, "-> NOT A VALID URL:", (e as Error).message);
  }
}