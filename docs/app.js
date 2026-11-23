"use strict";

const companies = [
  {ticker: "003230", name: "삼양식품", products: [["1902301010", "인스턴트 라면"]]},
  {ticker: "214450", name: "파마리서치", products: [["3304999000", "기타화장품"]]},
  {ticker: "000660", name: "SK하이닉스", products: [["8542321010", "DRAM"], ["8542321030", "플래시 메모리"]]},
  {ticker: "005930", name: "삼성전자", products: [["8542321010", "DRAM"], ["8542321030", "플래시 메모리"]]}
];
const data = globalThis.TRADE_DATA ?? {series: {}, partners: {}};
const state = {
  ticker: companies[0].ticker, product: companies[0].products[0][0], partner: "0",
  flow: "X", currency: "USD", grain: "month", tableGrain: "year", range: "12",
  countryMode: "stack", view: "monthly", cutoff: "end", month: "", deciles: {}
};
const $ = id => document.getElementById(id);
const company = () => companies.find(item => item.ticker === state.ticker);
const series = () => data.series[state.product]?.months ?? {};
const availableMonths = () => Object.keys(series()).sort().reverse();
const latestFlow = () => state.flow === "X" ? "수출" : "수입";
const selectedMonth = () => state.month || availableMonths()[0] || "";
const country = code => data.partners[code] ?? (code === "0" ? "전체 국가" : code);
const partnerCodes = Object.keys(data.partners).filter(code => code !== "0").sort((a, b) => country(a).localeCompare(country(b), "ko"));
const money = new Intl.NumberFormat("ko-KR", {maximumFractionDigits: 0});
const decimal = new Intl.NumberFormat("ko-KR", {maximumFractionDigits: 1});
const price = new Intl.NumberFormat("ko-KR", {maximumFractionDigits: 2});
const shades = ["#267c6a", "#477bd2", "#c07e40"];
const countryColors = ["#2873c2", "#31a084", "#ba6b27", "#7a69ba", "#328dad", "#a8b4c3"];
const decileHeader = "ticker,month,usd_10,usd_20,usd_end,scope,source";
const compact = value => Number.isFinite(value) ? decimal.format(value) : "—";
const format = (value, formatter = money) => Number.isFinite(value) ? formatter.format(value) : "—";
const monthName = month => month ? month.slice(0, 4) + "." + month.slice(4) : "—";
const monthShort = month => monthName(month).slice(2);
const tone = value => value > 0 ? "up" : value < 0 ? "down" : "";
const percent = value => Number.isFinite(value) ? (value > 0 ? "+" : "") + value.toFixed(1) + "%" : "—";
const change = (now, before) => Number.isFinite(now) && Number.isFinite(before) && before > 0 ? (now / before - 1) * 100 : null;
const rate = month => data.fx?.rates[month] ?? null;
const valueFor = (month, partner = state.partner) => series()[month]?.[partner]?.[state.flow];
const amountIn = (usd, month, currency = state.currency) => {
  if (!Number.isFinite(usd)) return null;
  const multiplier = currency === "USD" ? 1 : rate(month);
  return multiplier === null ? null : usd * multiplier;
};

function monthIndex(month) {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(4)) - 1;
}

function offsetMonth(month, offset) {
  const index = monthIndex(month) + offset;
  return String(Math.floor(index / 12)) + String(index % 12 + 1).padStart(2, "0");
}

function inclusiveMonths(start, end) {
  return Array.from({length: Math.max(0, monthIndex(end) - monthIndex(start) + 1)}, (_, i) => offsetMonth(start, i));
}

function shownMonths(end, oldest) {
  if (state.range === "all") return inclusiveMonths(oldest, end);
  const requested = offsetMonth(end, 1 - Number(state.range));
  return inclusiveMonths(requested > oldest ? requested : oldest, end);
}

function activeButtons(attribute, value) {
  const key = attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  document.querySelectorAll("[data-" + attribute + "]").forEach(button => {
    button.setAttribute("aria-pressed", button.dataset[key] === value);
  });
}

function setSelect(select, items, selected) {
  select.replaceChildren(...items.map(([key, title]) => new Option(title, key)));
  select.value = selected;
}

function summing(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) : null;
}

function aggregate(months, partner = state.partner, currency = state.currency) {
  const table = series();
  const validMonths = months.every(month => table[month]);
  const values = months.map(month => {
    const entry = table[month]?.[partner]?.[state.flow];
    return [amountIn(entry?.[0], month, currency), entry?.[1]];
  });
  const amount = validMonths ? summing(values.map(entry => entry[0])) : null;
  const weight = validMonths ? summing(values.map(entry => entry[1])) : null;
  return {amount, weight, price: amount !== null && weight > 0 ? amount / weight : null};
}

function itemFor(months) {
  const current = aggregate(months);
  const former = aggregate(months.map(month => offsetMonth(month, -12)));
  return {
    ...current, months, yoy: change(current.amount, former.amount),
    weightYoy: change(current.weight, former.weight), priceYoy: change(current.price, former.price)
  };
}

function periods(months, grain) {
  const groups = new Map();
  for (const month of months) {
    const year = month.slice(0, 4);
    const key = grain === "month" ? monthName(month) :
      grain === "quarter" ? year + " Q" + Math.ceil(Number(month.slice(4)) / 3) : year;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(month);
  }
  const full = {month: 1, quarter: 3, year: 12}[grain];
  return [...groups].map(([label, items]) => ({
    ...itemFor(items),
    label: items.length === full ? label : label + " (" + Number(items[0].slice(-2)) + "–" + Number(items.at(-1).slice(-2)) + "월)",
    tick: grain === "month" ? label.slice(2) : label
  }));
}

function scaleAmount(values, currency = state.currency) {
  const max = Math.max(0, ...values.filter(Number.isFinite));
  if (currency === "KRW") {
    if (max >= 1e12) return [1e12, "조원"];
    if (max >= 1e8) return [1e8, "억원"];
    if (max >= 1e4) return [1e4, "만원"];
    return [1, "원"];
  }
  if (max >= 1e9) return [1e9, "십억 USD"];
  if (max >= 1e6) return [1e6, "백만 USD"];
  if (max >= 1e3) return [1e3, "천 USD"];
  return [1, "USD"];
}

function drawCards(end) {
  const year = Number(end.slice(0, 4));
  const numbers = [
    [String(year - 1) + "년 연간", itemFor(inclusiveMonths((year - 1) + "01", (year - 1) + "12"))],
    [year + "년 1–" + Number(end.slice(4)) + "월", itemFor(inclusiveMonths(year + "01", end))],
    [monthName(end), itemFor([end])]
  ];
  $("kpis").innerHTML = numbers.map(([title, row]) => {
    const [factor, unit] = scaleAmount([row.amount]);
    const value = row.amount === null ? "—" : compact(row.amount / factor) + " " + unit;
    return '<article class="kpi"><div>' + title + "</div><strong>" + value + '</strong><small class="' +
      tone(row.yoy) + '">' + percent(row.yoy) + " YoY</small></article>";
  }).join("");
}

function drawTable(rows, oldest, end) {
  const amountLabel = state.currency === "KRW" ? "원" : "USD";
  $("table-subtitle").textContent = country(state.partner) + " · " + monthName(oldest) + "–" + monthName(end);
  $("amount-head").textContent = "금액 (" + amountLabel + ")";
  $("price-head").textContent = "단가 (" + amountLabel + "/kg)";
  const delta = value => '<td class="' + tone(value) + '">' + percent(value) + "</td>";
  $("table-body").innerHTML = rows.slice().reverse().map(row =>
    '<tr><th scope="row">' + row.label + "</th><td>" + format(row.amount) + "</td>" +
    delta(row.yoy) + "<td>" + format(row.weight) + "</td>" + delta(row.weightYoy) +
    "<td>" + format(row.price, price) + "</td>" + delta(row.priceYoy) + "</tr>").join("");
}

function prepareCanvas(canvas, scroll, size, height, stride = 75) {
  const width = Math.max(scroll.clientWidth, 142 + stride * size);
  const ratio = Math.min(window.devicePixelRatio || 1, 2, 15500 / width);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  const context = canvas.getContext("2d");
  context.scale(canvas.width / width, canvas.height / height);
  context.font = '12px Inter,"Apple SD Gothic Neo",sans-serif';
  return {context, width, height};
}

function alignRecent(scroll, rows) {
  const windowKey = rows[0].tick + ":" + rows.at(-1).tick + ":" + rows.length;
  if (scroll.dataset.window !== windowKey) {
    scroll.scrollLeft = scroll.scrollWidth;
    scroll.dataset.window = windowKey;
  }
}

function axes(ctx, width, height, rows, maximum, rightScale) {
  const left = 53, right = width - 89, top = 26, bottom = height - 34;
  const y = value => bottom - value / maximum * (bottom - top);
  const stride = (right - left) / rows.length;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const fraction = i / 4;
    const point = y(maximum * fraction);
    ctx.strokeStyle = "#e3eaf2";
    ctx.beginPath(); ctx.moveTo(left, point); ctx.lineTo(right, point); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillStyle = "#506278";
    ctx.fillText(compact(maximum * fraction), left - 7, point + 3);
    if (rightScale) {
      ctx.textAlign = "left";
      ctx.fillText(rightScale.format(rightScale.min + (rightScale.max - rightScale.min) * fraction), right + 7, point + 3);
    }
  }
  rows.forEach((row, i) => {
    ctx.fillStyle = "#506278"; ctx.textAlign = "center";
    ctx.fillText(row.tick, left + stride * (i + .5), height - 13);
  });
  return {left, right, top, bottom, y, stride};
}

function drawCombo(rows, key, subtitle, units, alternate) {
  const scroll = $(key + "-scroll");
  const canvas = $(key + "-chart");
  $(key + "-subtitle").textContent = subtitle;
  canvas.setAttribute("aria-label", subtitle + " 차트. 값은 금액·중량·단가 표에서 확인할 수 있습니다.");
  const {context: ctx, width, height} = prepareCanvas(canvas, scroll, rows.length, 294);
  const plotted = rows.map(row => Number.isFinite(row[units.key]) ? row[units.key] / units.factor : null);
  const line = rows.map(row => row[alternate.key]);
  const max = Math.max(1, ...plotted.filter(Number.isFinite)) * 1.18;
  const lineMin = Math.min(0, ...line.filter(Number.isFinite));
  const lineMax = Math.max(1, ...line.filter(Number.isFinite));
  const span = lineMax - lineMin;
  const bounds = {min: lineMin - span * .13, max: lineMax + span * .16, format: alternate.format};
  const {left, top, bottom, y, stride} = axes(ctx, width, height, rows, max, bounds);
  const lineY = value => bottom - (value - bounds.min) / (bounds.max - bounds.min) * (bottom - top);
  const bar = Math.min(38, stride * .55);
  rows.forEach((row, i) => {
    const x = left + stride * (i + .5);
    const value = plotted[i];
    if (value !== null) {
      ctx.fillStyle = i === rows.length - 1 ? "#216ab9" : "#8eb9ea";
      ctx.fillRect(x - bar / 2, y(value), bar, Math.max(1, bottom - y(value)));
    }
    ctx.textAlign = "center"; ctx.fillStyle = "#224365";
    ctx.fillText(compact(value), x, value === null ? bottom - 7 : y(value) - 6);
  });
  let previous = null;
  rows.forEach((row, i) => {
    const value = line[i];
    if (!Number.isFinite(value)) { previous = null; return; }
    const x = left + stride * (i + .5), point = lineY(value);
    if (previous) {
      ctx.strokeStyle = "#b25529"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(x, point); ctx.stroke();
    }
    ctx.fillStyle = "#a74825"; ctx.beginPath(); ctx.arc(x, point, 2.6, 0, Math.PI * 2); ctx.fill();
    const label = alternate.format(value);
    const barLabel = plotted[i] === null ? bottom - 7 : y(plotted[i]) - 6;
    const labelY = Math.abs(point - 10 - barLabel) < 11 ? point + 14 : point - 10;
    ctx.textAlign = "center"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.strokeText(label, x, labelY); ctx.fillText(label, x, labelY);
    previous = {x, y: point};
  });
  alignRecent(scroll, rows);
}

function drawCountries(rows) {
  const scroll = $("country-scroll");
  const canvas = $("country-chart");
  const months = rows.flatMap(row => row.months);
  const top = partnerCodes.map(code => [code, aggregate(months, code).amount]).filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code]) => code);
  const palette = [...top.map((code, i) => [code, country(code), countryColors[i]]), ["other", "기타", countryColors.at(-1)]];
  const plotted = rows.map(row => {
    const total = aggregate(row.months, "0").amount;
    const parts = top.map(code => aggregate(row.months, code).amount);
    const other = total === null ? null : Math.max(0, total - (summing(parts) ?? 0));
    return {...row, total, parts: [...parts, other]};
  });
  const stack = state.countryMode === "stack";
  const [factor, unit] = scaleAmount(stack ? plotted.map(row => row.total) : plotted.flatMap(row => row.parts));
  $("country-subtitle").textContent = "전국 · 상위 " + top.length + "개국 + 기타 · " + unit;
  $("country-legend").replaceChildren(...palette.map(([code, title, color]) => {
    const item = document.createElement(code === "other" ? "span" : "button");
    const swatch = document.createElement("i");
    swatch.style.background = color;
    if (code !== "other") {
      item.type = "button";
      item.dataset.partnertarget = code;
      item.setAttribute("aria-pressed", state.partner === code);
    }
    item.append(swatch, title);
    return item;
  }));
  canvas.setAttribute("aria-label", $("country-subtitle").textContent + " 차트");
  const {context: ctx, width, height} = prepareCanvas(canvas, scroll, rows.length, 270);
  const max = Math.max(1, ...(stack ? plotted.map(row => Math.max(row.total ?? 0, summing(row.parts) ?? 0)) : plotted.flatMap(row => row.parts))
    .filter(Number.isFinite).map(value => value / factor)) * 1.19;
  const {left, y, stride} = axes(ctx, width, height, rows, max);
  if (stack) {
    const bar = Math.min(38, stride * .55);
    plotted.forEach((row, i) => {
      const x = left + stride * (i + .5);
      let running = 0;
      row.parts.forEach((value, n) => {
        if (!Number.isFinite(value) || value <= 0) return;
        const previous = running;
        running += value / factor;
        ctx.fillStyle = palette[n][2];
        ctx.fillRect(x - bar / 2, y(running), bar, y(previous) - y(running));
      });
      ctx.textAlign = "center"; ctx.fillStyle = "#224365";
      ctx.fillText(row.total === null ? "—" : compact(row.total / factor), x, y(running) - 6);
    });
  } else {
    palette.forEach(([code, , color], n) => {
      let previous = null;
      plotted.forEach((row, i) => {
        const value = row.parts[n];
        if (!Number.isFinite(value)) { previous = null; return; }
        const x = left + stride * (i + .5), vertical = y(value / factor);
        if (previous) {
          ctx.strokeStyle = color; ctx.lineWidth = code === state.partner ? 2.7 : 1.5;
          ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(x, vertical); ctx.stroke();
        }
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, vertical, 2.1, 0, Math.PI * 2); ctx.fill();
        if (code === state.partner) {
          ctx.textAlign = "center"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
          ctx.strokeText(compact(value / factor), x, vertical - 7); ctx.fillText(compact(value / factor), x, vertical - 7);
        }
        previous = {x, y: vertical};
      });
    });
  }
  alignRecent(scroll, rows);
}

function drawCharts(rows) {
  const [amountFactor, amountUnit] = scaleAmount(rows.map(row => row.amount));
  const [weightFactor, weightUnit] = Math.max(0, ...rows.map(row => row.weight ?? 0)) >= 1e6 ? [1e6, "천 톤"] : [1e3, "톤"];
  $("trend-title").textContent = latestFlow() + "액과 YoY";
  const conversion = state.currency === "KRW" ? " · 월평균 환율" : "";
  drawCombo(rows, "trend", country(state.partner) + " · " + amountUnit + conversion + " · YoY %",
    {key: "amount", factor: amountFactor}, {key: "yoy", format: percent});
  drawCombo(rows, "weight", weightUnit + " · " + (state.currency === "KRW" ? "원/kg" : "USD/kg"),
    {key: "weight", factor: weightFactor}, {key: "price", format: compact});
  drawCountries(rows);
}

function drawMonthly() {
  const months = availableMonths(), end = selectedMonth(), oldest = months.at(-1);
  const product = company().products;
  $("product-field").hidden = product.length < 2;
  setSelect($("product"), product, state.product);
  setSelect($("partner"), [["0", "전체 국가"], ...partnerCodes.map(code => [code, country(code)])], state.partner);
  setSelect($("reference"), months.map(month => [month, monthName(month)]), end);
  $("reference").disabled = !end;
  $("monthly-empty").hidden = Boolean(end);
  $("monthly-data").hidden = !end;
  $("csv").disabled = !end;
  if (!end) return;

  drawCards(end);
  drawTable(periods(inclusiveMonths(oldest, end), state.tableGrain), oldest, end);
  drawCharts(periods(shownMonths(end, oldest), state.grain));
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
  $("decile-amount-head").textContent = "누계 (" + state.currency + ")";
  const result = $("decile-result");
  if (!dataset) {
    result.textContent = "수출 누계 CSV를 열어 비교하세요.";
    return;
  }
  activeButtons("cutoff", state.cutoff);
  result.textContent = dataset.scope + " · " + dataset.source + " · 현재 브라우저 세션";
  if (state.view !== "decile") return;

  const last = ["10", "20", "end"].indexOf(state.cutoff);
  const months = Object.keys(dataset.months).sort();
  const lastMonth = months.at(-1);
  const timeline = Array.from({length: 24}, (_, i) => offsetMonth(lastMonth, i - 23))
    .filter(month => month >= months[0]);
  const rows = timeline.map(month => {
    const [a, b, c] = dataset.months[month] ?? [null, null, null];
    const total = amountIn([a, b, c][last], month);
    const parts = [a, b === null || a === null ? null : b - a, c === null || b === null ? null : c - b];
    return {month, parts: parts.map((value, index) => index <= last ? amountIn(value, month) : null), total,
      yoy: change(total, amountIn(dataset.months[offsetMonth(month, -12)]?.[last], offsetMonth(month, -12)))};
  });
  $("decile-table").innerHTML = rows.slice().reverse().map(row => "<tr><th scope='row'>" + monthName(row.month) +
    "</th>" + row.parts.map(value => "<td>" + format(value) + "</td>").join("") + "<td>" +
    format(row.total) + "</td><td class='" + tone(row.yoy) + "'>" + percent(row.yoy) + "</td></tr>").join("");
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
  const item = company();
  $("company").textContent = item.name;
  $("series-label").textContent = item.products.find(([code]) => code === state.product)[1] + " · 한국 전체 품목 통관";
  for (const [attribute, key] of [["ticker","ticker"],["currency","currency"],["view","view"],["flow","flow"],["grain","grain"],
      ["table-grain","tableGrain"],["range","range"],["country-mode","countryMode"]]) {
    activeButtons(attribute, state[key]);
  }
  $("monthly").hidden = state.view !== "monthly";
  $("decile").hidden = state.view !== "decile";
  if (state.view === "monthly") drawMonthly();
  else drawDecile();
}

function filterCompanies() {
  const normalized = text => text.toLowerCase().replaceAll(" ", "");
  const query = normalized($("company-search").value);
  let count = 0;
  for (const button of $("watchlist").children) {
    const matches = normalized(button.textContent).includes(query);
    button.hidden = !matches;
    if (matches) count++;
  }
  $("no-companies").hidden = Boolean(count);
}

let drawerPinned = false;
function companyPanel(open, focus = false) {
  $("company-panel").hidden = !open;
  $("open-companies").setAttribute("aria-expanded", open);
  if (open && focus) $("company-search").focus();
}

$("watchlist").innerHTML = companies.map(item => '<button type="button" data-ticker="' + item.ticker + '">' +
  item.name + "</button>").join("");
$("company-search").addEventListener("input", filterCompanies);
$("company-search").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  const first = $("watchlist").querySelector("button:not([hidden])");
  if (first) { event.preventDefault(); first.click(); }
});
$("sidebar").addEventListener("pointerenter", event => { if (event.pointerType === "mouse") companyPanel(true); });
$("sidebar").addEventListener("pointerleave", event => {
  if (event.pointerType === "mouse" && !drawerPinned && !$("company-panel").contains(document.activeElement)) companyPanel(false);
});
$("open-companies").addEventListener("click", () => {
  drawerPinned = !drawerPinned;
  companyPanel(drawerPinned, drawerPinned);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("company-panel").hidden) {
    drawerPinned = false;
    companyPanel(false);
    $("open-companies").focus();
  }
});
document.addEventListener("click", event => {
  if (!$("sidebar").contains(event.target) && !$("company-panel").hidden) {
    drawerPinned = false;
    companyPanel(false);
  }
  const button = event.target.closest("button[data-ticker],button[data-flow],button[data-view],button[data-currency],button[data-grain],button[data-table-grain],button[data-range],button[data-country-mode],button[data-partnertarget],button[data-cutoff]");
  if (!button) return;
  const [key, value] = Object.entries(button.dataset)[0];
  if (key === "ticker") {
    state.ticker = value;
    if (!company().products.some(([code]) => code === state.product)) state.product = company().products[0][0];
    $("decile-status").textContent = "";
    $("company-search").value = "";
    filterCompanies();
    drawerPinned = false;
    companyPanel(false);
    if (event.detail === 0) $("open-companies").focus();
  } else {
    state[key === "partnertarget" ? "partner" : key] = value;
  }
  render();
  if (key === "partnertarget") $("country-legend").querySelector('[data-partnertarget="' + value + '"]')?.focus();
});
for (const id of ["product", "partner", "reference"]) {
  $(id).addEventListener("change", event => {
    state[id === "reference" ? "month" : id] = event.target.value;
    render();
  });
}
$("csv").addEventListener("click", () => {
  const end = selectedMonth();
  const months = shownMonths(end, availableMonths().at(-1));
  const cols = ["company", "hsk10", "partner", "flow", "month", "usd", "krw", "krw_per_usd", "yoy_pct", "mom_pct", "net_kg", "source"];
  const rows = months.map(month => {
    const entry = valueFor(month);
    const krw = amountIn(entry?.[0], month, "KRW");
    const usdYoy = change(entry?.[0], valueFor(offsetMonth(month, -12))?.[0]);
    const usdMom = change(entry?.[0], valueFor(offsetMonth(month, -1))?.[0]);
    return [company().name, state.product, country(state.partner), state.flow, month, entry?.[0],
      krw === null ? null : Math.round(krw), rate(month), usdYoy?.toFixed(2), usdMom?.toFixed(2), entry?.[1], data.source];
  });
  download(company().name + "-" + state.flow + ".csv", [cols, ...rows]);
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
window.addEventListener("resize", () => {
  if (state.view === "monthly") {
    const end = selectedMonth();
    if (end) drawCharts(periods(shownMonths(end, availableMonths().at(-1)), state.grain));
  } else drawDecile();
});
$("snapshot-date").textContent = data.asOf ? "수집 " + data.asOf : "";
render();
