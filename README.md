# Studio KEEP — GitHub Pages 배포 파일

## 업로드
1. ZIP 압축을 풉니다.
2. GitHub에서 새 Public 저장소를 만듭니다. 예: studio-keep
3. Add file → Upload files에서 index.html, event.js, assets 폴더를 함께 올리고 Commit changes를 누릅니다.
   ZIP 자체나 바깥 폴더를 올리지 마세요. 저장소 최상위에 index.html이 있어야 합니다.
4. Settings → Pages → Build and deployment에서 Source를 Deploy from a branch로 선택합니다.
5. Branch: main, Folder: / (root)를 선택하고 Save를 누릅니다.
6. 배포 완료 후 Pages에 표시되는 주소를 공유합니다.
   예: https://사용자명.github.io/studio-keep/
   Vket 특설 페이지: 같은 주소 뒤에 #vket 추가

별도 빌드, 패키지 설치, API 키가 필요 없습니다.
.nojekyll도 함께 업로드하면 Jekyll 처리를 건너뜁니다. 이 파일이 빠져도 현재 파일 구성은 동작합니다.
공식 안내: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 구성
- index.html: 메인 페이지, 스타일, 메뉴, 언어·커서·모션 기능
- event.js: Vket 특설 페이지 및 한·영·일 콘텐츠
- assets/kipfel-cursor.png: 키펠 이미지
- .nojekyll: 정적 파일 배포 설정

## 영상·외부 링크 설정
index.html에서 const REELS를 검색해 4개 src에 영상 경로를 입력합니다.
예: assets/film-01.mp4 (해당 파일을 assets 폴더에 업로드)
브라우저에서 직접 재생할 수 있는 MP4 경로를 사용하세요. YouTube 페이지 주소는 이 src에 직접 넣을 수 없습니다.
const LINKS의 contactDrive와 joinForm에 구글 드라이브 및 구글 폼 주소를 넣습니다.
현재 영상·외부 링크는 미등록이며, 샘플 멤버와 크레딧도 실제 정보로 교체해야 합니다.

## 배포 상태
2026-10-13 내보내기. 최신 커서 변경 및 Vket 특설 페이지 포함.
GitHub 업로드/공개는 아직 수행하지 않았습니다.
스크립트 문법·포함 파일 경로를 확인했습니다. 실제 브라우저 시각 검수는 미완료입니다.
