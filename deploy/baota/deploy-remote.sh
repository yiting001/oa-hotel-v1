#!/usr/bin/env bash
# 服务器端部署脚本：由 GitHub Actions 上传并执行。
# 前提：/tmp/oa-hotel-production.tar.gz 已上传；Docker 可用；PostgreSQL 已建库。
# 必需环境变量：OA_DATABASE_URL、JWT_SECRET
set -euo pipefail

SITE_ROOT=${SITE_ROOT:-/www/wwwroot/47.107.168.97_52175}
DEPLOY_DIR="$SITE_ROOT/oa-hotel-production"
PACKAGE=/tmp/oa-hotel-production.tar.gz
CONTAINER=oa-hotel-api
API_PORT=${API_PORT:-52176}
NODE_IMAGE=${NODE_IMAGE:-node:22-bookworm}
NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmmirror.com}

: "${OA_DATABASE_URL:?OA_DATABASE_URL 必须设置}"
: "${JWT_SECRET:?JWT_SECRET 必须设置}"

STAGING=$(mktemp -d /tmp/oa-hotel-deploy.XXXXXX)
tar -xzf "$PACKAGE" -C "$STAGING"

mkdir -p "$DEPLOY_DIR"
# 保留旧 SQLite 数据文件（仅作为历史备份，运行时已使用 PostgreSQL）
mkdir -p "$STAGING/api"
for f in "$DEPLOY_DIR"/api/*.sqlite*; do
  [ -e "$f" ] && cp -a "$f" "$STAGING/api/" || true
done

# 站点根直接提供 web 静态文件，api 子目录放后端产物
rm -rf "$DEPLOY_DIR.old"
NEW_DIR="$DEPLOY_DIR.new"
rm -rf "$NEW_DIR"
mkdir -p "$NEW_DIR"
cp -a "$STAGING/web/." "$NEW_DIR/"
cp -a "$STAGING/api" "$NEW_DIR/api"
cp -a "$STAGING/config" "$NEW_DIR/config" 2>/dev/null || true
cp -a "$STAGING/DEPLOYMENT.md" "$NEW_DIR/" 2>/dev/null || true

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
if [ -d "$DEPLOY_DIR" ] && [ -e "$DEPLOY_DIR/index.html" ]; then
  mv "$DEPLOY_DIR" "$DEPLOY_DIR.old"
fi
mv "$NEW_DIR" "$DEPLOY_DIR"
rm -rf "$STAGING" "$DEPLOY_DIR.old"
chown -R www:www "$DEPLOY_DIR" 2>/dev/null || true

docker run -d --name "$CONTAINER" \
  --network host \
  --restart unless-stopped \
  -v "$DEPLOY_DIR/api":/app \
  -v oa-hotel-api-node-modules:/app/node_modules \
  -w /app \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT="$API_PORT" \
  -e OA_DATABASE_URL="$OA_DATABASE_URL" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e OA_TIME_ZONE=Asia/Shanghai \
  -e OA_DEMO_SEED=false \
  -e OA_SWAGGER_ENABLED=false \
  -e OA_BOOTSTRAP_ADMIN_USERNAME="${OA_BOOTSTRAP_ADMIN_USERNAME:-office}" \
  "$NODE_IMAGE" \
  bash -c "set -e; npm install --omit=dev --no-audit --no-fund --registry=$NPM_REGISTRY; exec node server.js"

echo '等待 API 健康检查...'
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then
    echo '部署成功'
    exit 0
  fi
  sleep 5
done
echo 'API 启动超时，最近日志：' >&2
docker logs --tail 50 "$CONTAINER" >&2 || true
exit 1
