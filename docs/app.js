"use strict";

const companies = [
  {
    ticker: "003230", name: "삼양식품", products: [["1902301010", "인스턴트 라면"]],
    mapping: "1902301010 · 인스턴트 라면",
    places: [
      ["강원특별자치도 원주시", "생산 거점 · 기존 TRASS 추적 지역"],
      ["전북특별자치도 익산시", "생산 거점 · 기존 TRASS 추적 지역"],
      ["경상남도 밀양시", "생산 거점 · 기존 TRASS 추적 지역"],
      ["서울특별시 성북구", "과거 본사 소재지 · 기존 TRASS 추적 지역"]
    ],
    note: "삼성증권과 LS증권은 TRASS에서 이 네 지역을 추적했습니다. 최근 회사 IR의 본사는 서울 중구입니다. 최근 월은 성북구와 중구를 각각 조회해 변화 여부를 확인하세요.",
    sources: [
      ["삼양식품 2026년 3분기 IR", "https://www.samyangfoods.com/upload/ir/20261106/20261106163220244009.pdf"],
      ["삼성증권 라면 수출 데이터북", "https://www.samsungpop.com/common.do?cmd=down&contentType=application%2Fpdf&fileName=2020%2F2026040114423788K_02_01.pdf&inlineYn=Y&saveKey=research.pdf"],
      ["LS증권 지역별 라면 수출", "https://msg.ls-sec.co.kr/eum/K_20240816_31863_169.pdf"],
      ["관세청 라면 품목분류", "https://unipass.customs.go.kr/clip/prlstclsfsrch/openULS0203003S.do?rrdcNo=0072019001201"]
    ]
  },
  {
    ticker: "214450", name: "파마리서치", products: [["3304999000", "기타화장품"]],
    mapping: "3304999000 · 기타화장품",
    places: [["강원특별자치도 강릉시", "생산 거점 · 증권사 추적 지역"]],
    note: "강릉 × 3304999000은 증권사 리서치가 사용하는 리쥬란 관련 추정 지표입니다. 현재 그래프는 같은 HSK의 한국 전체 통계이며 강릉만의 수치와 리쥬란 개별 수치는 확인되지 않았습니다.",
    sources: [
      ["파마리서치 사업보고서", "https://pharmaresearch.co.kr/file_download.php?filename=9808450398.pdf&filepath=data"],
      ["키움증권 강릉 수출 추적 근거", "https://bbn.kiwoom.com/rfCR11479"]
    ]
  },
  {
    ticker: "000660", name: "SK하이닉스", products: [["8542321010", "DRAM"], ["8542321030", "플래시 메모리"]],
    mapping: "8542321010 · DRAM / 8542321030 · 플래시",
    places: [
      ["경기도 이천시", "생산 거점 · 품목별 귀속 검증 후보"],
      ["충청북도 청주시", "생산 거점 · 품목별 귀속 검증 후보"]
    ],
    note: "이천·청주는 DRAM과 플래시 메모리의 지역별 금액을 각각 조회할 후보입니다. 월별 그래프는 삼성전자와 동일한 전국 산업 통계입니다. HBM과 회사별 금액은 별도 데이터가 필요합니다.",
    sources: [
      ["SK하이닉스 캠퍼스", "https://talent.skhynix.com/hub/ko/company/campus"],
      ["관세청 메모리 품목분류", "https://unipass.customs.go.kr/clip/hsinfosrch/openULS0201005Q.do?searchVal=854232"]
    ]
  },
  {
    ticker: "005930", name: "삼성전자", products: [["8542321010", "DRAM"], ["8542321030", "플래시 메모리"]],
    mapping: "8542321010 · DRAM / 8542321030 · 플래시",
    places: [
      ["경기도 평택시", "메모리 생산 · 우선 조회 후보"],
      ["경기도 화성시", "반도체 생산·후공정 · 검증 후보"],
      ["경기도 용인시 기흥구", "반도체 생산·후공정 · 검증 후보"],
      ["충청남도 천안시 서북구", "메모리 후공정 · 추가 확인"],
      ["충청남도 아산시", "온양 메모리 후공정 · 추가 확인"]
    ],
    note: "평택을 먼저 조회하고 화성·용인, 천안·아산은 별도로 확인하세요. TRASS에서 일반구를 제공하지 않으면 상위 시를 선택하세요. 월별 그래프는 SK하이닉스와 동일한 전국 산업 통계입니다.",
    sources: [
      ["삼성전자 2026년 3분기 사업보고서", "https://images.samsung.com/kdp/ir/business-report/2026_3Q_Interim_Business_Report_kr.pdf"],
      ["삼성반도체 국내 사업장과 공정", "https://download.semiconductor.samsung.com/resources/others/Samsung_Electronics_ISO_45001.pdf"],
      ["관세청 메모리 품목분류", "https://unipass.customs.go.kr/clip/hsinfosrch/openULS0201005Q.do?searchVal=854232"]
    ]
  }
];

const data = globalThis.TRADE_DATA ?? { series: {}, partners: {} };
const state = {
  ticker: companies[0].ticker, product: companies[0].products[0][0], partner: "0", flow: "X", range: 12,
  view: "monthly", metric: "amount", cutoff: "end", month: "", deciles: {}
};
const $ = id => document.getElementById(id);
const company = () => companies.find(item => item.ticker === state.ticker);
const series = () => data.series[state.product]?.months ?? {};
const availableMonths = () => Object.keys(series()).sort().reverse();
const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const mass = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const decileHeader = "ticker,month,usd_10,usd_20,usd_end,scope,source";
const shades = ["#267c6a", "#477bd2", "#c07e40"];

const monthName = month => month ? month.slice(0, 4) + "." + month.slice(4) : "—";
const monthShort = month => month.slice(2, 4) + "." + month.slice(4);
const compact = value => value === null || !Number.isFinite(value) ? "—" : mass.format(value);
const dollars = value => Number.isFinite(value) ? "$" + money.format(value) : "—";
const tone = value => value > 0 ? "up" : value < 0 ? "down" : "";
const percent = value => Number.isFinite(value) ? (value > 0 ? "+" : "") + value.toFixed(1) + "%" : "—";
const change = (now, before) => Number.isFinite(now) && Number.isFinite(before) && before > 0 ? (now / before - 1) * 100 : null;
const valueFor = (month, partner = state.partner, metric = 0) => series()[month]?.[partner]?.[state.flow]?.[metric] ?? null;
const selectedMonth = () => state.month || availableMonths()[0] || "";
const latestFlow = () => state.flow === "X" ? "수출" : "수입";
const country = code => data.partners[code] ?? (code === "0" ? "전체 국가" : code);

function offsetMonth(month, offset) {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(4)) - 1 + offset;
  return String(Math.floor(index / 12)) + String(index % 12 + 1).padStart(2, "0");
}

function activeButtons(attribute, value) {
  document.querySelectorAll("[data-" + attribute + "]").forEach(button => {
    button.setAttribute("aria-pressed", button.dataset[attribute] === value);
  });
}

function setSelect(select, items, selected) {
  const options = items.map(([key, title]) => new Option(title, key));
  select.replaceChildren(...options);
  select.value = selected;
}

function drawHeader() {
  const item = company();
  activeButtons("ticker", state.ticker);
  $("ticker").textContent = item.ticker;
  $("company").textContent = item.name;
  $("series-label").textContent = item.products.find(([code]) => code === state.product)[1] + " · HSK " + state.product;
  $("company-scope").textContent = "전국 품목 합계 · " + monthName(availableMonths()[0]) + "까지";
  $("mapping-caption").textContent = item.places.length + "개 국내 조회 지역";
  $("mapping-body").innerHTML =
    "<p><strong>세부 품목</strong> " + item.mapping + "</p>" +
    "<p><strong>TRASS 시군구 기본형</strong> HS " + [...new Set(item.products.map(([code]) => code.slice(0, 6)))].join(" / ") + "</p>" +
    '<ul class="places">' + item.places.map(([place, role]) =>
      "<li><strong>" + place + "</strong><span>" + role + "</span></li>").join("") + "</ul>" +
    "<p>" + item.note + "</p>" +
    "<p>TRASS 상세조회 기본형에서 수출·수리일과 품목·국내지역을 선택하세요. 시군구를 선택하면 HS 6자리까지 조회할 수 있어 세부 HSK보다 범위가 넓습니다. 품목·국내지역·국가를 함께 선택하는 3개 항목은 프리미엄 메뉴입니다.</p>" +
    '<p><a href="https://www.bandtrass.or.kr/customs/total.do?command=CUS001View&amp;viewCode=CUS00301" target="_blank" rel="noopener noreferrer">TRASS 상세조회 열기</a></p>' +
    "<p>" + item.sources.map(([label, url]) => '<a href="' + url +
    '" target="_blank" rel="noopener noreferrer">' + label + "</a>").join("") + "</p>";
}

function shownMonths() {
  const end = selectedMonth();
  const oldest = availableMonths().at(-1);
  if (!end) return [];
  return Array.from({length: state.range}, (_, i) => offsetMonth(end, i + 1 - state.range))
    .filter(month => month >= oldest);
}

function records() {
  return shownMonths().map(month => {
    const amount = valueFor(month);
    return {
      month, amount, weight: valueFor(month, state.partner, 1),
      yoy: change(amount, valueFor(offsetMonth(month, -12))),
      mom: change(amount, valueFor(offsetMonth(month, -1)))
    };
  });
}

function scaleAmount(values) {
  const max = Math.max(0, ...values.filter(Number.isFinite));
  if (max >= 1e9) return [1e9, "십억 USD"];
  if (max >= 1e6) return [1e6, "백만 USD"];
  if (max >= 1e3) return [1e3, "천 USD"];
  return [1, "USD"];
}

function drawMonthly() {
  const months = availableMonths();
  const end = selectedMonth();
  const partners = Object.keys(data.partners).filter(code => code !== "0")
    .sort((a, b) => (country(a)).localeCompare(country(b), "ko"));
  $("product-field").hidden = company().products.length < 2;
  setSelect($("product"), company().products, state.product);
  setSelect($("partner"), [["0", "전체 국가"], ...partners.map(code => [code, country(code)])], state.partner);
  setSelect($("reference"), months.map(month => [month, monthName(month)]), end);
  $("reference").disabled = !end;
  $("monthly-empty").hidden = Boolean(end);
  $("monthly-data").hidden = !end;
  $("csv").disabled = !end;
  activeButtons("flow", state.flow);
  activeButtons("metric", state.metric);
  if (!end) return;

  const rows = records();
  const current = rows.at(-1);
  const flow = latestFlow();
  const selectedCountry = country(state.partner);
  const [divisor, unit] = scaleAmount([current.amount]);
  const amount = current.amount === null ? "—" : compact(current.amount / divisor) + " " + unit;
  const weight = current.weight === null ? "—" : compact(current.weight) + " kg";
  const cards = [
    ["월 " + flow + "액", amount, selectedCountry + " · " + monthName(end), ""],
    ["전년 동월 대비", percent(current.yoy), monthName(offsetMonth(end, -12)) + " 대비", tone(current.yoy)],
    ["전월 대비", percent(current.mom), monthName(offsetMonth(end, -1)) + " 대비", tone(current.mom)],
    [flow + " 순중량", weight, selectedCountry + " · " + monthName(end), ""]
  ];
  $("kpis").innerHTML = cards.map(([label, number, sub, color]) => '<article class="kpi"><div>' + label +
    '</div><strong class="' + color + '">' + number + "</strong><small>" + sub + "</small></article>").join("");
  $("trend-title").textContent = "월별 " + flow + " 추이";
  $("table-subtitle").textContent = selectedCountry + " · " + monthName(rows[0].month) + "–" + monthName(end) + " · 원자료 천 달러 단위";
  $("table-body").innerHTML = rows.slice().reverse().map(row => "<tr><th scope='row'>" + monthName(row.month) +
    "</th><td>" + dollars(row.amount) + "</td><td class='" + tone(row.yoy) + "'>" + percent(row.yoy) +
    "</td><td class='" + tone(row.mom) + "'>" + percent(row.mom) + "</td><td>" + compact(row.weight) + "</td></tr>").join("");

  const basis = valueFor(end, "0");
  const reported = partners.map(code => [code, valueFor(end, code)]).filter(([, value]) => value > 0);
  const list = reported.sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("rank-subtitle").textContent = monthName(end) + " · " + flow + "액 · 공표된 국가별 금액 기준";
  $("rank").innerHTML = list.length ? list.map(([code, value]) => {
    const ratio = basis > 0 ? (value / basis * 100).toFixed(1) + "%" : "—";
    const share = list[0][1] > 0 ? value / list[0][1] * 100 : 0;
    const comparison = change(value, valueFor(offsetMonth(end, -12), code));
    const [factor, units] = scaleAmount([value]);
    const label = compact(value / factor) + " " + units;
    return '<button class="rank-item" type="button" data-partner="' + code + '" aria-pressed="' +
      (code === state.partner) + '"><span class="rank-text"><span><strong>' + country(code) +
      '</strong><small class="' + tone(comparison) + '">' + percent(comparison) + '</small></span><span>' + label +
      '</span></span><span class="rank-track"><span class="rank-fill" style="width:' + share +
      '%"></span></span><span class="rank-note">전체 대비 ' + ratio + "</span></button>";
  }).join("") : '<p class="empty">기준월에 조회된 국가 행이 없습니다.</p>';
  drawTrend();
}

function prepareCanvas(canvas, scroll, size, height, stride = 53) {
  const width = Math.max(scroll.clientWidth, 52 + stride * size + 16);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  const context = canvas.getContext("2d");
  context.scale(pixelRatio, pixelRatio);
  context.font = '12px Inter,"Apple SD Gothic Neo",sans-serif';
  return { context, width, height };
}

function drawTrend() {
  const rows = records();
  if (!rows.length || state.view !== "monthly") return;
  const raw = rows.map(row => row[state.metric]);
  const [divisor, unit] = state.metric === "amount" ? scaleAmount(raw) :
    state.metric === "weight" ? (Math.max(0, ...raw.filter(Number.isFinite)) >= 1e6 ? [1e6, "백만 kg"] :
      Math.max(0, ...raw.filter(Number.isFinite)) >= 1e3 ? [1e3, "천 kg"] : [1, "kg"]) : [1, "%"];
  const format = number => state.metric === "yoy" ? percent(number) : compact(number);
  const points = raw.map(value => Number.isFinite(value) ? value / divisor : null);
  $("chart-subtitle").textContent = country(state.partner) + " · " + unit + " · " +
    (state.metric === "yoy" ? "전년 동월 대비" : state.metric === "weight" ? "순중량" : "통관 금액");
  const canvas = $("trend-chart");
  canvas.setAttribute("aria-label", $("trend-title").textContent + " " + $("chart-subtitle").textContent + ". 수치는 월별 상세 표에서 확인할 수 있습니다.");
  const {context: ctx, width, height} = prepareCanvas(canvas, $("trend-scroll"), rows.length, 268);
  const left = 48, right = width - 12, top = 24, bottom = height - 32;
  const min = Math.min(0, ...points.filter(Number.isFinite));
  const max = Math.max(0, ...points.filter(Number.isFinite));
  const spread = max - min || 1;
  const high = max + spread * .17;
  const low = min < 0 ? min - spread * .15 : 0;
  const y = number => top + (high - number) / (high - low) * (bottom - top);
  const stride = (right - left) / rows.length;
  const bar = Math.min(35, stride * .57);
  for (let i = 0; i <= 4; i++) {
    const val = low + (high - low) * i / 4;
    ctx.strokeStyle = "#e3e9f1";
    ctx.beginPath(); ctx.moveTo(left, y(val)); ctx.lineTo(right, y(val)); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillStyle = "#506174"; ctx.fillText(compact(val), left - 5, y(val) + 4);
  }
  ctx.strokeStyle = "#acb8c8";
  ctx.beginPath(); ctx.moveTo(left, y(0)); ctx.lineTo(right, y(0)); ctx.stroke();
  rows.forEach((row, i) => {
    const x = left + stride * (i + .5);
    const point = points[i];
    ctx.textAlign = "center";
    if (point !== null) {
      ctx.fillStyle = point < 0 ? "#b76e64" : i === rows.length - 1 ? "#2157c8" : "#79a2e5";
      ctx.fillRect(x - bar / 2, Math.min(y(0), y(point)), bar, Math.max(1, Math.abs(y(0) - y(point))));
    }
    ctx.fillStyle = "#263b5a";
    const labelY = point === null ? bottom - 6 : y(point) + (point < 0 ? 15 : -6);
    ctx.fillText(format(point), x, labelY);
    ctx.fillStyle = "#506174";
    ctx.fillText(monthShort(row.month), x, height - 12);
  });
  if (rows.length > 0) $("trend-scroll").scrollLeft = $("trend-scroll").scrollWidth;
}

function download(name, rows) {
  const render = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';
  const contents = "\uFEFF" + rows.map(row => row.map(render).join(",")).join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([contents], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n") + "\n";
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || !field) quoted = !quoted;
      else throw new Error("CSV 따옴표 형식을 확인해 주세요.");
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(field.trim());
      field = "";
      if (char === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else field += char;
  }
  if (quoted) throw new Error("CSV 따옴표 형식을 확인해 주세요.");
  return rows;
}

function decileRows(text) {
  const [header, ...rows] = parseCsv(text);
  if (header?.join(",") !== decileHeader || !rows.length) {
    throw new Error("양식의 열 이름과 실제 데이터 행을 확인해 주세요.");
  }
  const tickers = new Set(companies.map(item => item.ticker));
  const output = {};
  for (const [i, row] of rows.entries()) {
    const [rawTicker, month, ...rest] = row;
    const ticker = rawTicker.padStart(6, "0");
    const [a, b, c, scope, source] = rest;
    const cumulative = [a, b, c].map(field => field === "" ? null :
      /^\d+(?:\.\d+)?$/.test(field ?? "") ? Number(field) : NaN);
    if (row.length !== 7 || !tickers.has(ticker) || !/^20\d{2}(0[1-9]|1[0-2])$/.test(month) || !scope || !source) {
      throw new Error((i + 2) + "행의 종목코드, YYYYMM, 집계 범위, 출처를 확인해 주세요.");
    }
    const reported = cumulative.filter(value => value !== null);
    if (!reported.length || reported.some((value, index) =>
      !Number.isFinite(value) || value < (reported[index - 1] ?? 0))) {
      throw new Error((i + 2) + "행의 누계는 0 이상이며 시점이 지날수록 작아질 수 없습니다.");
    }
    const item = output[ticker] ??= {scope, source, months: {}};
    if (item.months[month] || item.scope !== scope || item.source !== source) {
      throw new Error((i + 2) + "행의 월 중복 또는 종목별 집계 범위·출처 변경을 확인해 주세요.");
    }
    item.months[month] = cumulative;
  }
  return output;
}

function drawDecile() {
  const dataset = state.deciles[state.ticker];
  $("decile-controls").hidden = !dataset;
  $("decile-chart-wrap").hidden = !dataset;
  $("decile-description").textContent = "누계 차감으로 1~10일, 11~20일, 21일~말일을 계산하고 전년의 같은 구간과 비교합니다.";
  const result = $("decile-result");
  if (!dataset) {
    result.className = "empty";
    result.textContent = "이 종목의 세부 HSK·지역에 맞는 10일 단위 원자료가 필요합니다. 관세청 공개 10일 통계는 주요 품목군과 주요국 집계입니다. 같은 집계 범위의 수출 누계 CSV를 열면 차트가 표시됩니다.";
    return;
  }
  activeButtons("cutoff", state.cutoff);
  result.className = "muted";
  result.textContent = dataset.scope + " · " + dataset.source + " · 현재 브라우저 세션";
  if (state.view !== "decile") return;

  const last = ["10", "20", "end"].indexOf(state.cutoff);
  const months = Object.keys(dataset.months).sort();
  const lastMonth = months.at(-1);
  const timeline = Array.from({length: 24}, (_, i) => offsetMonth(lastMonth, i - 23))
    .filter(month => month >= months[0]);
  const rows = timeline.map(month => {
    const [a, b, c] = dataset.months[month] ?? [null, null, null];
    const total = [a, b, c][last];
    const parts = [a, b === null || a === null ? null : b - a, c === null || b === null ? null : c - b];
    return {month, parts: parts.map((value, index) => index <= last ? value : null), total,
      yoy: change(total, dataset.months[offsetMonth(month, -12)]?.[last])};
  });
  $("decile-table").innerHTML = rows.slice().reverse().map(row => "<tr><th scope='row'>" + monthName(row.month) +
    "</th>" + row.parts.map(value => "<td>" + dollars(value) + "</td>").join("") + "<td>" +
    dollars(row.total) + "</td><td class='" + tone(row.yoy) + "'>" + percent(row.yoy) + "</td></tr>").join("");
  const [factor, unit] = scaleAmount(rows.map(row => row.total ?? row.parts.reduce((sum, value) => sum + (value ?? 0), 0)));
  const canvas = $("decile-chart");
  canvas.setAttribute("aria-label", "10일 단위 수출 비교. 금액 단위 " + unit + ". 구간 금액과 전년 동기 대비 수치는 아래 표에서 확인할 수 있습니다.");
  const {context: ctx, width, height} = prepareCanvas(canvas, $("decile-scroll"), rows.length, 334, 86);
  const left = 45, right = width - 54, top = 30, bottom = height - 29;
  const stride = (right - left) / rows.length;
  const max = Math.max(1, ...rows.map(row => (row.total ?? row.parts.reduce((sum, value) => sum + (value ?? 0), 0)) / factor)) * 1.22;
  const minYoy = Math.min(0, ...rows.map(row => row.yoy ?? 0));
  const maxYoy = Math.max(1, ...rows.map(row => row.yoy ?? 0));
  const level = value => bottom - value / max * (bottom - top);
  const yoyLevel = value => bottom - (value - minYoy) / (maxYoy - minYoy) * (bottom - top - 32) - 16;
  ctx.fillStyle = "#506174"; ctx.textAlign = "left"; ctx.fillText(unit, 4, 14);
  ctx.textAlign = "right"; ctx.fillText("YoY", width - 8, 14);
  for (let i = 0; i <= 4; i++) {
    const y = top + (bottom - top) * i / 4;
    ctx.strokeStyle = "#e3e9f1"; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(compact(max * (1 - i / 4)), left - 5, y + 4);
  }
  let previousPoint = null;
  rows.forEach((row, i) => {
    const x = left + stride * (i + .5);
    let sum = 0;
    let contiguous = true;
    const stack = [];
    row.parts.forEach((value, segment) => {
      if (value === null) { if (segment <= last) contiguous = false; return; }
      if (!contiguous) return;
      const end = sum + value / factor;
      stack.push({segment, end, middle: (end + sum) / 2, value: value / factor, start: sum});
      sum = end;
    });
    stack.forEach(part => {
      ctx.fillStyle = shades[part.segment];
      ctx.fillRect(x - 13, level(part.end), 26, Math.max(0, level(part.start) - level(part.end)));
    });
    ctx.textAlign = "left";
    let labelY = bottom + 8;
    stack.forEach(part => {
      labelY = Math.min(labelY - 13, level(part.middle) + 4);
      ctx.fillStyle = shades[part.segment]; ctx.fillText(compact(part.value), x + 15, labelY);
    });
    ctx.textAlign = "center"; ctx.fillStyle = "#506174";
    ctx.fillText(monthShort(row.month), x, height - 10);
    if (row.yoy === null) { previousPoint = null; return; }
    const y = yoyLevel(row.yoy);
    ctx.strokeStyle = "#a84363"; ctx.lineWidth = 1.6;
    if (previousPoint) {
      ctx.beginPath(); ctx.moveTo(previousPoint.x, previousPoint.y); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.fillStyle = "#a84363"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.strokeText(percent(row.yoy), x, y - 9);
    ctx.fillText(percent(row.yoy), x, y - 9);
    ctx.lineWidth = 1;
    previousPoint = {x, y};
  });
  $("decile-scroll").scrollLeft = $("decile-scroll").scrollWidth;
}

function render() {
  drawHeader();
  activeButtons("view", state.view);
  $("monthly").hidden = state.view !== "monthly";
  $("decile").hidden = state.view !== "decile";
  if (state.view === "monthly") drawMonthly();
  else drawDecile();
}

$("watchlist").innerHTML = companies.map(item => '<button type="button" data-ticker="' + item.ticker +
  '">' + item.name + "<small>" + item.ticker + "</small></button>").join("");

document.addEventListener("click", event => {
  const button = event.target.closest("button[data-ticker],button[data-flow],button[data-view],button[data-metric],button[data-partner],button[data-cutoff]");
  if (!button) return;
  const [key, value] = Object.entries(button.dataset)[0];
  if (key === "ticker" && value !== state.ticker) {
    state.ticker = value;
    if (!company().products.some(([code]) => code === state.product)) state.product = company().products[0][0];
    if (!availableMonths().includes(state.month)) state.month = "";
    $("decile-status").textContent = "";
  } else state[key] = value;
  render();
  if (key === "partner") $("rank").querySelector('[data-partner="' + value + '"]')?.focus();
});
for (const id of ["product", "partner", "range", "reference"]) {
  $(id).addEventListener("change", event => {
    const key = id === "reference" ? "month" : id;
    state[key] = id === "range" ? Number(event.target.value) : event.target.value;
    render();
  });
}
$("csv").addEventListener("click", () => {
  const cols = ["ticker", "hsk10", "partner", "flow", "month", "usd", "yoy_pct", "mom_pct", "net_kg", "source"];
  const rows = records().map(row => [state.ticker, state.product, country(state.partner), state.flow,
    row.month, row.amount, row.yoy?.toFixed(2), row.mom?.toFixed(2), row.weight, data.source]);
  download("trade-" + state.ticker + "-" + state.partner + "-" + state.flow + ".csv", [cols, ...rows]);
});
$("template").addEventListener("click", () => download("decile-template.csv", [decileHeader.split(",")]));
$("decile-file").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error("2MB 이하 CSV를 선택해 주세요.");
    const imported = decileRows(await file.text());
    Object.assign(state.deciles, imported);
    $("decile-status").textContent = Object.keys(imported).length + "개 종목의 누계 데이터를 읽었습니다.";
    drawDecile();
  } catch (error) {
    $("decile-status").textContent = error.message;
  }
  event.target.value = "";
});
document.querySelector(".status").addEventListener("click", () => { $("method").open = true; });
window.addEventListener("resize", () => state.view === "monthly" ? drawTrend() : drawDecile());

const collected = data.asOf ? new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium", timeZone: "Asia/Seoul"
}).format(new Date(data.asOf)) : "—";
$("snapshot-date").textContent = "데이터 수집일 " + collected;
$("method-body").innerHTML =
  '<p>월별 데이터는 관세청의 HSK 10자리 수출입 실적입니다. 전체 국가는 관세청 품목별 합계이며, 국가별 순위는 해당 월에 공표된 국가·지역 행에서 계산합니다.</p>' +
  '<p>국내지역, 수출 상대국, 수리 세관과 적재항은 각각 다른 신고·집계 항목입니다. 국내지역 합계도 해당 지역과 품목의 통계이므로 개별 기업 귀속은 별도로 검증해야 합니다.</p>' +
  '<p>전년 동월 대비와 전월 대비는 비교 기준 금액이 양수일 때 표시합니다. 미조회 값은 —로 표시합니다. 수출액은 FOB, 수입액은 CIF 기준입니다. 금액은 관세청 CSV의 천 달러 값을 USD로 환산했으며, 0은 천 달러 단위의 공표 값입니다. 중량 단위는 kg입니다.</p>' +
  '<p>10일 데이터는 ticker, month(YYYYMM), usd_10, usd_20, usd_end, scope, source 순서의 CSV를 지원합니다. 미발표 누계는 빈 칸으로 두고 집계 범위·출처는 종목 내에서 일치시켜 주세요. 업로드 자료는 현재 브라우저 세션에서만 표시됩니다.</p>' +
  '<p><a href="https://tradedata.go.kr/cts/index.do" target="_blank" rel="noopener noreferrer">관세청 수출입무역통계</a>' +
  '<a href="https://www.data.go.kr/data/15100475/openapi.do" target="_blank" rel="noopener noreferrer">관세청 월별 품목·국가 API</a>' +
  '<a href="https://www.data.go.kr/data/15157908/openapi.do" target="_blank" rel="noopener noreferrer">관세청 10일치 공표 범위</a></p>';
render();
