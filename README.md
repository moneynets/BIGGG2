# 雙人連線大老二

- 兩人自動配對，不需房號；同時在線的玩家依序兩兩配對。
- 52 張牌，兩人各 26 張；梅花 3 先出且首手必須含梅花 3。
- 單張、對子、三條、五張牌型（順子、同花、葫蘆、鐵支、同花順）。
- 點數 3 最小、2 最大；花色 梅花 < 方塊 < 紅心 < 黑桃。
- 順子採 3-4-5-6-7 到 J-Q-K-A-2 的連續序列；不接受跨端環繞。
- 對手 Pass 後出牌者可自由領出；先出完獲勝。

## 本機啟動

安裝 Node.js 18+，在本資料夾開終端機：

```bash
npm install
npm start
```

瀏覽 http://localhost:3000 ，再開另一個無痕視窗測試雙人配對。

## Render 部署

1. 把本資料夾的 `package.json`、`server.js`、`public` 資料夾及 README.md 上傳 GitHub repository 根目錄（不要上傳 ZIP 或 node_modules）。
2. Render → New → Web Service → 連結 repository。
3. Build command `npm install`，Start command `npm start`。
4. 選擇可用的方案並部署，取得 HTTPS 網址後分享給另一位朋友。

注意：沒有房號代表所有使用同一網址的訪客都會自動兩兩配對；如果只想跟指定朋友玩，請不要公開網址。伺服器重啟、斷線會結束本局並重新配對；免費主機可能休眠。第一版沒有重連恢復、帳號或戰績保存。
