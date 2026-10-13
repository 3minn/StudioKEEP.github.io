# Git 이력을 이용한 복구

콘텐츠 저장·수정·삭제는 Git 커밋으로 남습니다. 문제가 생기면 추가 편집을 멈추고 마지막 정상 배포 SHA와 문제 커밋을 기록합니다.

## 내용만 잘못 수정한 경우

기술 담당자가 저장소에서 해당 JSON 파일 → History → 정상 버전을 열어 값을 확인합니다. 콘텐츠 담당자는 CMS에서 필요한 내용을 다시 입력해 저장할 수 있습니다. JSON 자체를 수정할 필요는 없습니다.

## 삭제·대량 수정·코드 오류

기술 담당자가 최신 main에서 복구 브랜치를 만들고 문제 커밋을 revert합니다. 강제 push/reset은 사용하지 않습니다.

```sh
git switch main
git pull --ff-only
git switch -c recovery/content-fix
git revert <문제-커밋-SHA>
npm test
git push -u origin recovery/content-fix
```

GitHub에서 복구 PR을 열고 테스트 확인 후 병합합니다. 충돌은 이후의 정상 변경을 보존하도록 검토합니다. 여러 커밋은 최신 것부터 되돌립니다. 이미지 삭제도 해당 이미지 커밋을 함께 복구해야 합니다.

배포만 실패했다면 마지막 정상 사이트는 유지됩니다. 실패 원인을 수정하고 새 커밋으로 재배포합니다. 성공 여부는 Actions 및 build-info.json의 commit으로 확인합니다.

**Rollback 중에도 Pages의 Source는 GitHub Actions를 유지하고 dist만 배포합니다.** 저장소 전체나 content 폴더를 직접 배포하는 방식으로 복구하지 않습니다.

## 비밀키를 잘못 올렸다면

revert만으로 Git 이력의 비밀키가 지워지지 않습니다. 해당 키를 즉시 폐기·재발급한 뒤 기술 담당자가 이력 정리 필요성을 판단합니다.
