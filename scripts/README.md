# 일산룸 자동화 (GSC + 사이트 모니터 + Gmail 알림)

내가 신경 쓰지 않아도 사이트를 매일 자동 점검하고, 문제가 생기면 Gmail로 알려주는 시스템입니다.

## 구성

| 파일 | 역할 |
|------|------|
| `scripts/gsc-lib.js` | Google Search Console API 클라이언트 (의존성 0, Node 내장 모듈만) |
| `scripts/gsc-report.js` | GSC 키워드·순위·카니발리제이션·색인 상태 리포트 |
| `scripts/site-monitor.js` | 라이브 사이트 자동 점검 (HTTP·위험단어·메타·스키마·색인·성과) |
| `.github/workflows/seo-monitor-mailer.yml` | 매일 2회 자동 점검 + 문제 시 Gmail 발송 |

## 점검 항목 (site-monitor.js)
1. 두 페이지 + 자산(sitemap/robots/llms/og/manifest) HTTP 200
2. 위험 단어(룸살롱·노래방·유흥·밤문화·2차 등) 노출 — 영구 룰
3. `<title>` / canonical / meta description / og:image 무결성
4. JSON-LD 구조화 데이터 파싱 가능 여부
5. GSC 색인 상태 — 색인 안 된 페이지 경고
6. GSC 검색 성과 — 노출 50% 이상 급감 경고

문제가 1건이라도 있으면 종료코드 1 → 메일 발송 + GitHub 실패 알림.

## 한 번만 설정하면 되는 것 (GitHub Secrets)

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**

| 시크릿 이름 | 값 |
|-------------|-----|
| `GSC_KEY_JSON` | Search Console 서비스계정 키 JSON 전체 (theasset-gsc, Gmail에 보관 중) |
| `MAIL_PASSWORD` | Gmail **앱 비밀번호** 16자리 ([생성: myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)) |

> `MAIL_PASSWORD`는 일반 Gmail 비밀번호가 아니라 "앱 비밀번호"입니다. 2단계 인증이 켜져 있어야 생성됩니다.
> 두 시크릿을 넣으면 그때부터 완전 자동입니다. 없어도 점검은 돌고 GitHub 알림은 옵니다.

## 로컬에서 직접 돌려보기
```bash
node scripts/gsc-report.js      # 키워드·순위·색인 리포트
node scripts/site-monitor.js    # 사이트 점검 (문제 있으면 exit 1)
```
로컬 키 경로: `/home/user/.secrets/theasset-gsc.json` (저장소에 커밋되지 않음 / .gitignore 처리됨)

## 보안
서비스계정 키는 비밀입니다. 저장소에 커밋 금지(.gitignore 적용). 노출 우려 시 Google Cloud에서 키를 폐기(rotate)하고 재발급하세요.
