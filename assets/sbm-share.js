/* SBM Observatory — 장별 공유 + PDF 버튼 (sbm-share.js)
 * 각 장 페이지(/magazine/{CODE}/{N}/)에 '공유하기'와 '이 장 PDF' 버튼을 동적 삽입한다.
 * 공유: navigator.share 우선, 미지원 시 클립보드 URL 복사.
 * PDF: /magazine/_pdf/{CODE}/{N}.pdf 로 연결.
 */
(function () {
  var m = location.pathname.match(/\/magazine\/([A-Z0-9]+)\/(\d+)\/?$/);
  if (!m) return;
  var code = m[1], ch = m[2];
  var pdf = "/magazine/_pdf/" + code + "/" + ch + ".pdf";
  var title = (document.querySelector(".obs-mast h1") || {}).textContent || document.title;
  var url = location.origin + location.pathname;

  var host = document.querySelector(".next-row") || document.querySelector(".obs-main") || document.body;
  if (!host || document.querySelector(".sbm-actions")) return;

  var wrap = document.createElement("div");
  wrap.className = "sbm-actions";
  wrap.setAttribute("style",
    "display:flex;gap:10px;flex-wrap:wrap;margin:32px 0 8px;");

  var btnStyle = "display:inline-flex;align-items:center;gap:7px;padding:10px 18px;" +
    "border-radius:999px;font-weight:700;font-size:0.88rem;text-decoration:none;cursor:pointer;border:1px solid #1A1A1A;";

  // 공유 버튼
  var share = document.createElement("button");
  share.type = "button";
  share.setAttribute("style", btnStyle + "background:#1A1A1A;color:#FAFAF7;");
  share.textContent = "이 관찰 공유하기";
  share.addEventListener("click", function () {
    if (navigator.share) {
      navigator.share({ title: title, text: title + " — 네다바웨이 SBM Observatory", url: url })
        .catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        share.textContent = "링크 복사됨 ✓";
        setTimeout(function () { share.textContent = "이 관찰 공유하기"; }, 2000);
      });
    } else {
      window.prompt("이 링크를 복사하세요:", url);
    }
  });

  // 장 PDF 버튼
  var dl = document.createElement("a");
  dl.href = pdf;
  dl.setAttribute("download", "");
  dl.setAttribute("style", btnStyle + "background:#FAFAF7;color:#1A1A1A;");
  dl.textContent = "이 장 PDF 내려받기 ↓";

  wrap.appendChild(share);
  wrap.appendChild(dl);
  host.parentNode.insertBefore(wrap, host);
})();
