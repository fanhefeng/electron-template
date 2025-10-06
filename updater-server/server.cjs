const express = require("express");
const path = require("path");
const app = express();
const PORT = 8080;

// ① 静态资源路由（latest-mac.yml / latest.yml / latest-linux.yml / .exe / .dmg / .AppImage）
// electron-updater 会直接请求这些文件
app.use("/updates", express.static(path.join(__dirname, "public")));

// ② 健康检查接口
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ③ 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.listen(PORT, () => {
  console.log(`Update server listening on http://localhost:${PORT}`);
  console.log(`Serving files from: ${path.join(__dirname, "public")}`);
});
