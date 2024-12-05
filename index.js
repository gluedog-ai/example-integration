const Koa = require("koa");
const Router = require('@koa/router');
const { koaBody } = require('koa-body');

const GLUEDOG_BASE_URL = "http://localhost:3000";
const GLUEDOG_API_BASE_URL = "http://localhost:3002";
const SUPPLIER_ID = "6751bd55485a9060535c38f1";
const SUPPLIER_SECRET = "7McilFRsHMKPZp52Ch21SEe8GvGlpLhP";

const apps = new Map();
const server = new Koa();
const router = new Router();

router.get('/connect-with-gluedog', (ctx) => {
  const appId = ctx.query.appId;
  apps.set(appId, { status: 'connecting' });
  ctx.redirect(GLUEDOG_BASE_URL + "/oauth/authorize?supplierId=" + SUPPLIER_ID + "&appId=" + appId);
});

router.get('/authorize-with-gluedog', async (ctx) => {
  const appId = ctx.query.appId;
  if (!apps.has(appId)) {
    console.log('app not found')
    ctx.status = 404;
    return;
  }

  const authorizationToken = ctx.query.authorizationToken;
  const response = await fetch(GLUEDOG_API_BASE_URL + "/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "1.0.0"
    },
    body: JSON.stringify({
      appId: appId,
      authorizationToken: authorizationToken,
      supplierId: SUPPLIER_ID,
      supplierSecret: SUPPLIER_SECRET
    })
  })
  if (response.status !== 201) {
    console.log('authorization failed');
    ctx.status = 401;
    return;
  }


  const { accessToken, refreshToken, expiresIn } = await response.json();
  apps.set(appId, {
    status: 'authorized',
    tokens: { accessToken, refreshToken, expiresIn }
  });
  ctx.redirect(GLUEDOG_BASE_URL + "/oauth/authorized?appId=" + appId);
});

router.post('/me/branches/updated', (ctx) => {
  const appId = ctx.headers['x-app-id'];
  const { branches } = ctx.request.body.data;

  if (!apps.has(appId)) {
    console.log('app not found')
    ctx.status = 404;
    return;
  }

  const app = apps.get(appId);
  apps.set(appId, {
    status: 'connected',
    tokens: app.tokens,
    branches: branches
  });

  console.log("App connected\n" + JSON.stringify(apps.get(appId), null, 4));

  ctx.status = 200;
  ctx.body = {
    status: 'CONNECTED'
  }
});

const PORT = 8000;
server
  .use(koaBody())
  .use(router.routes())
  .listen(PORT)
  .on('listening', () => console.log('Server listening on port ' + PORT))