// prisma/prisma.config.cjs
// Minimal Prisma v5 config (CommonJS) to keep migration URLs out of schema.prisma
const { defineConfig } = require("prisma")

module.exports = defineConfig({
  migrate: { url: process.env.DATABASE_URL },
})