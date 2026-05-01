# Git Revert 使用教学

## 已 Push 提交的安全撤销方案

当提交已经推送到远程仓库（如 GitHub/GitLab），**绝对不能用 `git reset`**（会导致本地与远程分支历史不一致，协作开发时会引发严重问题），此时应使用 `git revert` 安全撤销提交。

## 核心原理

`git revert` 不是「删除」历史提交，而是**创建一个新的反向提交**：
- 会生成一个新 commit，该 commit 的内容是「撤销目标 commit 的所有修改」
- 保留原提交的历史记录，不破坏分支的提交链
- 对协作开发友好，可安全推送到远程仓库

## 基础用法（撤销最近一次 Push 提交）

```bash
# 撤销最近1次提交（HEAD 指向的提交）
git revert HEAD

# 撤销指定提交（替换为目标 commit 的哈希值）
git revert <commit-hash>

# 示例：撤销哈希为 a1b2c3d 的提交
git revert a1b2c3d
```

## 完整操作流程

### 1. 命令行步骤（推荐）

```bash
# 1. 确保本地分支与远程同步
git pull origin <分支名>  # 如 git pull origin main

# 2. 执行 revert 操作（撤销最近1次提交）
git revert HEAD
# 执行后会自动打开编辑器，让你编辑新 commit 的备注（默认是 "Revert "原提交信息""）
# 保存并关闭编辑器即可生成反向提交

# 3. 将反向提交推送到远程
git push origin <分支名>
```

### 2. VSCode 操作步骤（可视化）

1. 打开 VSCode 的「源代码管理」面板（Ctrl+Shift+G）→ 点击「提交记录」按钮（右上角的 `...` → `View History`）；
2. 在提交历史列表中，右键点击需要撤销的提交 → 选择 `Revert Commit`；
3. VSCode 会自动生成反向提交（可在暂存区看到撤销后的改动）；
4. 点击「提交」按钮，输入提交备注（默认即可）→ 点击「推送」按钮，将反向提交推送到远程。

## 关键细节与场景适配

| 场景 | 命令 | 说明 |
|------|------|------|
| 撤销单个提交 | `git revert <commit-hash>` | 最常用，撤销指定的1次提交 |
| 撤销最近N次连续提交 | `git revert HEAD~N..HEAD` | 如 `git revert HEAD~2..HEAD` 撤销最近2次提交 |
| 撤销多个非连续提交 | `git revert <hash1> <hash2>` | 依次撤销多个指定提交 |
| 撤销时跳过编辑器（直接用默认备注） | `git revert HEAD --no-edit` | 自动化脚本/快速操作时使用 |

## 与 git reset 的核心对比（关键！）

| 特性 | git revert（推荐用于已 Push） | git reset（仅用于本地未 Push） |
|------|-------------------------------|--------------------------------|
| 历史记录 | 保留原提交，新增反向提交 | 删除原提交，破坏历史记录 |
| 远程协作 | 安全，可直接 push | 危险，会导致远程/本地历史不一致 |
| 数据恢复 | 可通过 revert 反向操作恢复原提交 | 需用 `git reflog` 恢复，难度高 |
| 适用场景 | 已 Push 到远程的提交 | 仅本地未 Push 的提交 |

## 注意事项

### 1. 冲突处理
如果 revert 的提交与后续提交有代码冲突，Git 会提示「冲突」，需手动解决冲突后：
```bash
# 解决冲突后，标记为已解决
git add .
# 继续完成 revert 操作
git revert --continue
# （可选）放弃 revert 操作
# git revert --abort
```

### 2. 撤销 merge 提交
如果要撤销的是 merge 提交，需要指定 `-m` 参数（选择保留哪个父分支）：
```bash
git revert <merge-commit-hash> -m 1  # -m 1 表示保留主分支（第一个父分支）的代码
```

### 3. 多人协作
执行 revert 前务必先 `git pull`，确保本地分支是最新的，避免冲突。

## 总结

1. **已 Push 提交**：用 `git revert` 创建反向提交，安全保留历史，可直接推送到远程；
2. **本地未 Push 提交**：用 `git reset --soft HEAD~1` 撤销，保留改动在暂存区；
3. **核心原则**：远程分支的历史记录「只追加，不删除」，是协作开发的基本规范。