 ```diff
--- a/apps/api/src/index.ts
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,5 @@
+{
+  "dependencies": {
+    "express": "^4.18.2"
+  }
+}
+
--- /dev/null
+++ b/apps/api/src/index.ts
@@ -0,0 +1,15 @@
+import express from 'express';
+
+const app = express();
+const port = process.env.PORT || 3000;
+
+app.get('/hello', (_req, res) => {
+  res.status(200).json({ ok: true });
+});
+
+app.listen(port, () => {
+  console.log(`API server listening on port ${port}`);
+});
+
+export default app;
+
--- a/package.json
+++ b/package.json
@@ -0,0 +1,