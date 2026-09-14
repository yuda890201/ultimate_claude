// はみ出している要素を列挙する。page.evaluate() に渡して使う。
//
// scrollWidth > clientWidth を見るだけでは足りない。`overflow-x: hidden`
// を指定していると値が切り取られて一致してしまうため、要素ごとに
// getBoundingClientRect() を見る必要がある。
//
// 返り値:
//   cw  ページの表示幅
//   sw  ページの内容幅（overflow-x:hidden だと cw と等しくなる）
//   bad はみ出している要素（TAG#id.class [left,right] の形）
//
// 第1引数に走査対象のセレクタを渡す（既定は body 配下すべて）。
(selector) => {
  const root = selector || 'body';
  const doc = document.documentElement;
  const bad = [];
  for (const el of document.querySelectorAll(root + ' *')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0) { continue; }               // 非表示は対象外
    if (r.right > doc.clientWidth + 0.5 || r.left < -0.5) {
      const cls = (el.className || '').toString().slice(0, 40);
      bad.push(el.tagName + '#' + el.id + '.' + cls
               + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
    }
  }
  return {
    cw: doc.clientWidth,
    sw: doc.scrollWidth,
    bad: bad,
  };
}
