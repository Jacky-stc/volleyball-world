# Volleyball World

瀏覽器 2.5D 風格的 3D 世界原型。目前僅實作 **Phase 1：離線世界**。

## 開始使用

開發環境：Node.js 24 LTS、pnpm 11.19.0（版本記錄於根目錄 `package.json`）。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

開啟終端顯示的網址，預設為 http://127.0.0.1:5173 。需要支援 WebGL 的瀏覽器。

場景、角色與物理引擎由本地服務提供，不依賴執行時 CDN。不含 Service Worker；「離線」表示沒有多人伺服器，仍需啟動本地服務或部署靜態檔案。

## 操作

WASD 或方向鍵移動，按住 Shift 跑步。視窗失焦會清除輸入。

畫面採正面高角度透視鏡頭，鋪滿瀏覽器視窗。已移除 header、footer、文字 HUD、操作指南及畫面按鈕；目前使用鍵盤操作。正常遊戲畫面不顯示文字，載入失敗時才顯示重試訊息。

## 指令

```sh
pnpm test          # 純邏輯、真實 Rapier 碰撞與模型動畫回歸測試
pnpm typecheck     # 所有工作區 TypeScript 檢查
pnpm build         # 型別檢查與正式建置，輸出 apps/client/dist
pnpm preview       # 預覽正式建置
pnpm format:check  # 格式檢查
pnpm assets:build  # 重新產生本地 court.glb 場景
```

## 結構

- `apps/client`：React UI、R3F 渲染、輸入、Rapier 整合與單機模擬。
- `packages/game-core`：不依賴 React / Three.js / Rapier 的資料型別、移動運算與固定步進。
- `scripts/build-scene.ts`：將原型環境烘焙為單一 GLB；共用場景配置中的障礙物位置。
- `docs/architecture.md`：Phase 1 的實際實作架構與限制。
- `docs/project-direction.md`：使用者提供的長期方向，後續 Phase 尚未實作。
- `docs/validation.md`：測試與手動驗證紀錄。

原型環境為程式生成的簡單場景，執行時直接載入 GLB。未來可換成 Blender 匯出的 GLB，並同步更新簡化碰撞體。

## 素材

角色採用 Quaternius / Tomás Laulhé 的 **RobotExpressive**（CC0 1.0），來源為 Three.js examples，由 Don McCurdy 調整。模型內含 Idle、Walking、Running 動畫，詳細來源與授權見 `apps/client/public/assets/characters/SOURCE.md` 及 `docs/assets.md`。

## 目前界線

目前場景為橘色／珊瑚色場內、藍綠色場外的長方形排球場：場內 9 × 18，含外圍區域 15 × 24。樹木、椅子、石頭與告示牌已移除。球網僅作靜態視覺呈現，角色可以走到兩側；網柱與場地外緣具有碰撞。尚無擊球、球網物理或比賽規則。

不含多人連線、後端、聊天、帳號、排球、球場入場或計分。正面透視鏡頭固定；碰撞使用簡化膠囊與方盒；角色不提供跳躍。Rapier 相容套件內嵌 WASM，正式建置會出現大型 chunk 提醒；已延遲載入，後續可評估獨立 WASM 資產與壓縮。
