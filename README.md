# 한국 수출입 트래커

삼양식품, 파마리서치, SK하이닉스, 삼성전자와 관련된 한국 품목의 월별·국가별 통관 통계입니다.

## 실행과 게시

로컬에서는 `python3 -m http.server 8772 --directory docs`로 실행합니다. GitHub Pages 게시 소스는 `main` 브랜치의 `/docs`입니다.

## 월별 데이터 갱신

[관세청 수출입무역통계](https://tradedata.go.kr/cts/index.do)에서 HSK 1902301010, 3304999000, 8542321010, 8542321030을 선택하고 월별·수리일·kg 기준으로 품목별 및 품목별+국가별 CSV를 내려받습니다. 국가 조건을 비워 모든 공표 상대국을 조회합니다. 기존 기간을 포함한 CSV를 함께 입력합니다.

```sh
python3 scripts/import_customs.py \
  --world path/to/world-*.csv \
  --partners path/to/partner-*.csv \
  --as-of YYYY-MM-DD
```

금액은 원자료 천 달러를 USD로 환산합니다. 전국에는 공식 품목별 합계를 사용하며 미공표 행은 결측값으로 표시합니다.

## TRASS로 국내 지역 조회

[TRASS 상세조회](https://www.bandtrass.or.kr/customs/total.do?command=CUS001View&viewCode=CUS00301)에서 수출·수리일을 고르고 품목과 국내지역을 선택합니다. 시군구 기본형의 품목은 HS 6자리까지 가능합니다. 화면의 매칭 근거에서 세부 HSK, TRASS 조회용 HS 6자리 및 국내 지역을 확인할 수 있습니다. 10자리 HSK 수치가 필요하면 세부 품목·국내지역이 모두 있는 자료를 확보해야 합니다. 상대국까지 포함하는 3개 항목은 프리미엄 메뉴입니다.

10일 단위 탭은 종목별 동일 범위의 수출 누계 CSV를 현재 브라우저에서 읽습니다.
