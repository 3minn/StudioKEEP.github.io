# 최초 연결 안내 (기술 담당자 1회)

일상적인 콘텐츠 수정은 이 설정 후 /admin/에서만 수행합니다.
현재 확인된 저장소: `3minn/StudioKEEP.github.io`, 기본 브랜치 `main`.
이 이름은 사용자 사이트 `3minn.github.io`와 다르므로 프로젝트 경로 `/StudioKEEP.github.io/`를 사용합니다.

## 1. 관리자 두 명

각자의 GitHub 계정을 사용합니다. 공용 비밀번호를 공유하지 않습니다.
저장소 소유자는 Repository → Settings → Collaborators에서 두 번째 담당자를 초대하고, 담당자가 수락했는지 확인합니다. 콘텐츠 관리자는 push/write 권한이 필요합니다. 별도로 Worker의 `ADMIN_LOGINS`에도 두 사람의 GitHub 로그인 ID를 쉼표로 등록합니다. 표시 이름이 아닙니다.
초대 전 두 번째 관리자의 실제 계정을 확인하세요. 현재 `3minn`만 설정돼 있습니다.

## 2. Cloudflare Worker

Cloudflare 계정에서 Workers를 활성화하고 로컬에서 다음을 실행합니다. 무료 플랜의 사용량 한도 내 운영을 전제로 합니다. 과금 플랜은 자동 선택하지 않습니다.

```sh
cd auth
npx wrangler login
npx wrangler deploy
```

반환된 `https://studio-keep-oauth.<계정-subdomain>.workers.dev` 주소를 기록합니다. 초기에는 비밀키 미설정으로 로그인이 실패하는 것이 정상입니다.
`auth/wrangler.toml`의 값:

- SITE_ORIGIN: `https://3minn.github.io` (끝 슬래시와 프로젝트 경로 제외)
- GITHUB_REPOSITORY: `3minn/StudioKEEP.github.io`
- ADMIN_LOGINS: `3minn,실제-두번째-관리자-ID`

## 3. GitHub OAuth App

GitHub 개인 Settings → Developer settings → OAuth Apps → New OAuth App.

- Application name: Studio KEEP CMS
- Homepage URL: `https://3minn.github.io/StudioKEEP.github.io/`
- Authorization callback URL: **실제 Worker 주소 + `/callback`**

발급된 Client ID, Client Secret은 다음 대화형 입력으로 Worker에 저장합니다. 채팅·저장소·config.yml에 적지 않습니다.

```sh
npx wrangler secret put OAUTH_CLIENT_ID
npx wrangler secret put OAUTH_CLIENT_SECRET
npx wrangler secret put STATE_SECRET
npx wrangler deploy
```

STATE_SECRET은 비밀번호 관리자가 생성한 무작위 32자 이상 문자열을 사용합니다. `/health` HTTP 200은 Worker 실행 여부만 의미하며 비밀키·로그인 성공을 보증하지 않습니다.

## 4. GitHub Actions 설정 후 변경 병합

Repository → Settings → Secrets and variables → Actions → Variables에:

- 이름: `CMS_AUTH_URL`
- 값: 실제 Worker origin (경로와 끝 슬래시 제외)

이 값은 공개 주소이므로 secret이 아닙니다. OAuth 비밀키는 GitHub에도 넣을 필요 없습니다.
Repository → Settings → Pages → Build and deployment → Source에서 **GitHub Actions**를 선택합니다.
작업 브랜치의 테스트가 통과한 뒤 main에 병합합니다. `Studio KEEP 검증 및 배포` 워크플로가 실행됩니다. 설정 누락·잘못된 콘텐츠는 배포를 중단하며, 마지막 정상 배포를 유지합니다.
브랜치 보호가 Decap의 main 직접 쓰기를 금지하면 저장할 수 없습니다. 현재는 simple publish 방식이므로 운영 정책과 충돌하는 보호 규칙은 소유자가 검토해야 합니다. 보호 우회 기능은 구현하지 않았습니다.

## 5. 실제 확인

두 관리자가 각자 브라우저로 `/StudioKEEP.github.io/admin/`에 로그인합니다. docs/VERIFICATION_KO.md의 운영 전 시험을 수행하고, 커밋 SHA·Actions URL·실제 페이지 결과를 기록하세요.

관리 화면의 저장 성공은 GitHub 저장 성공입니다. 사이트 반영 완료는 Actions의 `deploy` 및 `verify-live` 성공과 실제 페이지를 별도로 확인해야 합니다.

## 문제 해결

- 로그인 창만 열림: 팝업 차단, Callback URL, Worker secrets, SITE_ORIGIN 확인.
- 인증 실패: 허용 명단·초대 수락·GitHub 저장소 write 권한 확인.
- 404: `/admin/` 앞에 `/StudioKEEP.github.io/` 프로젝트 경로가 있는지 확인.
- 저장 성공 후 반영 안 됨: Actions 실패 로그, published 스위치 확인.
- 이미지 실패: 10MB 이하 PNG/JPG/WEBP/GIF, 업로드 후 해당 항목 저장 여부 확인.
- 같은 파일 동시 편집: 다른 담당자의 저장이 끝난 뒤 다시 열고 수정. 충돌 시 덮어쓰지 말고 새로고침 후 병합.
