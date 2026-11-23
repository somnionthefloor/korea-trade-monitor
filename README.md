# 한국 수출입 트래커

삼양식품, 파마리서치, SK하이닉스, 삼성전자와 관련된 한국 품목의 월별·국가별 통관 통계입니다.

## 실행과 게시

로컬에서는 `python3 -m http.server 8772 --directory docs`로 실행합니다. GitHub Pages 게시 소스는 `main` 브랜치의 `/docs`입니다.

## 월별 갱신

1. [관세청 수출입무역통계](https://tradedata.go.kr/cts/index.do)에서 HSK 1902301010, 3304999000, 8542321010, 8542321030의 월별·수리일·kg 기준 품목별 및 품목별+국가별 CSV를 받습니다. 국가 조건은 비워 모든 공표 상대국을 조회합니다. 수정 신고를 반영하려면 갱신하려는 최근 월을 양쪽 파일에 동일하게 포함합니다.
2. [한국은행 ECOS](https://ecos.bok.or.kr/)의 731Y004, 0000001, 0000100에서 원/달러 월평균 매매기준율을 확인합니다. `month,krw_per_usd` 헤더의 CSV에 월을 YYYYMM 형식으로 적습니다.
3. 아래 명령으로 갱신하고 `docs/snapshot.js`를 커밋합니다. 갱신 대상 월의 기존 행은 해당 월의 새 원본으로 교체합니다.

```sh
python3 scripts/import_customs.py --update \
  --world path/to/world.csv \
  --partners path/to/partner.csv \
  --fx path/to/usdkrw.csv \
  --as-of YYYY-MM-DD
```

전체 스냅샷을 다시 만들 때는 모든 대상 월의 양쪽 CSV와 환율을 지정하고 `--update`를 생략합니다.

## 집계

관세청 원자료의 천 달러를 USD로 환산합니다. 원화는 해당 월 USD 금액에 그 달의 ECOS 월평균 매매기준율을 곱한 추정치입니다. 분기·연간 원화는 월별 환산액을 합산합니다. YoY는 전년의 같은 월 구간과 비교합니다. 단가는 금액을 순중량으로 나눈 값입니다. 전국 합계는 관세청 품목별 파일을 사용합니다. 국가별 집계는 공표된 행을 합산합니다.

10일 단위 탭은 사용자가 고른 수출 누계 CSV를 브라우저 안에서 처리합니다.
