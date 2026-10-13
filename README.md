# Studio KEEP — Decap CMS

기존 HTML/CSS/JavaScript 사이트에 JSON 콘텐츠 빌드와 Decap CMS를 추가한 프로젝트입니다.
**OAuth 서비스 설정과 실제 관리자 저장 시험 전에는 운영 준비 완료가 아닙니다.**

- 사이트: `https://3minn.github.io/StudioKEEP.github.io/`
- 관리자: `https://3minn.github.io/StudioKEEP.github.io/admin/`
- 관리 대상: 멤버, 프로젝트, 공지사항만
- [최초 연결 안내](docs/SETUP_KO.md)
- [관리자 인수인계](docs/ADMIN_KO.md)
- [복구 절차](docs/RECOVERY_KO.md)
- [검증 범위 및 운영 전 시험](docs/VERIFICATION_KO.md)

## 파일 구조

```text
site/                    기존 화면·모션·Vket 페이지·커서 이미지
content/members/         멤버 JSON
content/projects/        프로젝트 JSON (크레딧의 원본)
content/announcements/   공지 JSON
content/uploads/         CMS 업로드 원본
admin/                   Decap UI 및 한국어 입력 설정
scripts/build.mjs        검증 후 공개 콘텐츠와 참조 이미지만 dist로 복사
scripts/verify-live.mjs  실제 HTTP·배포 SHA·인증 응답 확인
.github/workflows/       테스트 및 Pages 자동 배포
auth/                   별도 Cloudflare OAuth Worker
tests/                  빌드·렌더·인증 회귀 테스트
docs/                   한국어 운영 문서
```

Node.js 22 이상. 사이트 빌드에는 npm 의존성 설치가 필요 없습니다.

```sh
npm test
npm run build
```

로컬 빌드의 `.invalid` 인증 주소는 연결 미완료 표시입니다. CI에서는 실제 인증 주소가 없으면 배포를 중단합니다. Pages는 **Settings → Pages → Source: GitHub Actions**, 배포물은 **dist만** 사용합니다. 저장소 전체나 main 루트를 정적 배포하면 안 됩니다.

기존 디자인 CSS 및 event.js는 해시 비교로 보존을 검사합니다. UI에서 수정한 데이터는 GitHub 커밋으로 저장되고 Actions가 공개용 데이터를 재생성합니다. 기존 영상 4개·CONTACT·JOIN US 외부 주소는 원래의 미등록 상태를 유지합니다.

## 공개/비공개 의미

`published: false` 데이터, 비공개 전용 업로드 이미지, 소스 코드·인증 코드는 `dist`에 포함하지 않습니다. 공개 프로젝트의 비공개/삭제 멤버 참조도 제거합니다. 공용으로 참조되는 이미지는 공개됩니다.

**저장소가 공개이므로 원본과 과거 Git 이력은 공개입니다.** 이 CMS의 스위치는 비밀정보 보호 기능이 아닙니다. 개인정보·미공개 굿즈 등 기밀은 업로드하지 마세요. 이전에 공개한 파일의 외부 캐시나 복제본까지 지우지는 못합니다.

## 인증

GitHub OAuth App → Cloudflare Worker → 관리자 허용 명단 및 저장소 쓰기 권한 확인 → Decap → GitHub API.
Worker는 state 서명·만료·HttpOnly 쿠키·PKCE를 사용하며, 토큰을 허용된 Pages origin의 opener에만 전달합니다. Client Secret과 state 서명 키는 Worker secret으로만 설정합니다. 관리자 계정의 GitHub 토큰은 Decap 로그인을 위해 브라우저에 전달됩니다. `public_repo`는 해당 계정의 다른 공개 저장소에도 적용될 수 있는 GitHub OAuth 권한이므로 운영 전용 계정을 권장합니다. 같은 `3minn.github.io` origin 아래의 다른 프로젝트도 신뢰 경계에 포함됩니다.

공식 참고: https://decapcms.org/docs/github-backend/ · https://decapcms.org/docs/configuration-options/ · https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
