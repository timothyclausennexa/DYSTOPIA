# Create deployment archive
tar -czf dystopia.tar.gz `
  --exclude=node_modules `
  --exclude=.git `
  --exclude=dist `
  --exclude=*.log `
  client `
  server `
  shared `
  config.ts `
  configType.ts `
  package.json `
  pnpm-workspace.yaml `
  pnpm-lock.yaml `
  .env.development `
  dystopia-config.hjson

Write-Host "Archive created: dystopia.tar.gz"
