const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("bun/")) {
  console.error("This repository uses Bun only. Run `bun install` instead.");
  console.error("Do not use npm, yarn, or pnpm for dependency installation.");
  process.exit(1);
}
