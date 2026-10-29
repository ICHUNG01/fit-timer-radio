# FIT TIMER × ICRT

整合 iPhone PyScript 運動計時器與 ICRT 網路直播。

## 功能
- 預備/運動/休息/組數：預設 10/40/20 秒、5 組
- 暫停、繼續、重設；每階段倒數最後 3 秒英文提示，Go/Rest/Workout complete
- 運動時白色背景，其他階段深色
- 螢幕常亮 Wake Lock（視 iOS 支援而定）
- ICRT 播放/暫停/停止，和計時器獨立運作

## 部署
把此資料夾中的 `index.html`, `main.py`, `style.css`, `radio.js`, `manifest.webmanifest` 放入 GitHub Pages 倉庫根目錄，設定 Pages 從 main/(root) 發布。

## 注意
- 用 GitHub Pages HTTPS 存取；PyScript 會從 CDN 下載 Python 執行環境，首次載入需要網路。
- ICRT 試用公開目錄串流 `https://stream.rcs.revma.com/nkdfurztxp3vv`，未經 iPhone 實機驗證，可能因網址變更或跨站/格式限制失敗。
- iPhone 上語音合成可能暫時壓低/中斷電台音訊；不想干擾音樂可取消勾選語音提醒。
- 切出畫面或鎖屏時 iOS 可能暫停 PyScript 計時/音訊，因此建議保持計時器在前景。
