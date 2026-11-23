# 한국 수출 트래커

등록된 제조장소 시·군·구와 HSK 10자리가 함께 확인되는 월말 수출 자료를 조회합니다. 자료에 해당 지역과 품목의 다른 제조사 실적이 포함될 수 있습니다.

## 원자료

[TRASS 주문형 통계](https://www.bandtrass.or.kr/madeOrder.do?viewCode=MAD00000)에서 제조장소 시·군·구 × HSK 10자리 × 월 기준 수출 금액(USD)의 교부 범위와 조건을 확인합니다. 상대국 또는 순중량이 제공되는 경우 해당 열을 함께 요청합니다. 잠정치와 확정치를 비교하려면 자료의 수리일 기준 및 발행 시점을 확인합니다.

브라우저에서 엑셀(.xlsx, .xls) 또는 UTF-8 CSV를 열 수 있습니다. 제공기관의 실제 엑셀 레이아웃이 다르면 원본 열을 아래 양식에 대응시켜 저장합니다. 화면에서 열 이름을 담은 양식을 내려받을 수 있습니다.

| 열 | 의미 |
|---|---|
| month | YYYYMM, YYYY-MM 또는 해당 월의 말일 |
| hsk10 | 원자료의 HSK 10자리 |
| region | 제조장소 시·군·구 |
| region_basis | `제조장소` |
| partner | 상대국. 원자료 자체의 상대국 전체 합계 행은 빈 칸 |
| export_usd | 수출액(달러). 천 달러로 제공됐다면 먼저 USD로 단위를 변환 |
| net_kg | 순중량(kg). 제공되지 않을 때 빈 칸 |
| source | 교부 자료명과 기준 |

선택한 파일은 현재 탭에서만 처리합니다. 교부 원자료를 공개 저장소에 넣지 않습니다. <https://docs.sheetjs.com/>의 SheetJS CE 0.20.3을 엑셀을 열 때 사용합니다.

10일 비교는 `month,hsk10,region,region_basis,usd_10,usd_20,usd_end,source` 형식의 누계표를 사용합니다. 기간별 누계 중 미발표 값은 빈 칸으로 둡니다.

## 원화 환산

[한국은행 ECOS](https://ecos.bok.or.kr/) 731Y004의 원/달러 월평균 매매기준율을 적용합니다. 분기·연간 원화는 월별 환산액을 합산합니다. 필요한 월의 환율은 아래 명령으로 갱신합니다.

```sh
python3 scripts/update_exchange_rates.py --start YYYYMM --end YYYYMM
```

로컬 실행은 `python3 -m http.server 8774 --directory docs`입니다. GitHub Pages 게시 소스는 `main` 브랜치의 `/docs`입니다.
