# 自我追溯日程记录 PWA

一个 local-first 的 iPhone PWA：日程表 + 简要日记大事记，支持离线记录、补记、提醒设置、CSV/JSON 导出和 JSON 导入。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的局域网地址，例如 `http://你的电脑IP:5173`，iPhone 和电脑在同一 Wi-Fi 下即可访问。

主题调试地址：

- 默认主题：`/`
- 开发调色：`/?theme=dev`
- 浅绿预设：`/?theme=green`

如果你开了本地代理但 npm 卡住，可临时让 npm 走代理：

```bash
HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 npm install
```

## 构建与预览

```bash
npm run build
npm run preview
```

## iPhone 添加到主屏幕

1. 用 Safari 打开部署后的 HTTPS 地址，或本地局域网地址。
2. 点击分享按钮。
3. 选择“添加到主屏幕”。
4. 从主屏幕图标打开应用。
5. 进入“设置”，点击“开启通知”做权限检测。

## 通知说明

前端已实现 Notifications API / Service Worker / PushManager 功能检测、权限请求、应用内提醒、跳过今天、稍后提醒和 `.ics` 日历导出。iPhone 后台推送需要满足 Safari 添加到主屏幕、HTTPS、用户授权，以及可用的 Web Push 后端。

## 可选 Web Push 后端

生成 VAPID keys：

```bash
npx web-push generate-vapid-keys
```

复制 `.env.example` 为 `.env`，填入 keys 后运行：

```bash
npm run push:server
```

前端设置 `VITE_PUSH_SERVER_URL` 后，点击“开启通知”会读取后端 public VAPID key，注册 push subscription，并把当前提醒设置提交到 `/subscriptions`。当前后端用内存保存订阅，生产部署建议换成数据库持久化。
