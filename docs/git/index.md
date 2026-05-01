# Git 相关文档

本目录收录 Git 工具的使用指南和最佳实践。

## 内容概览

### Git Revert 使用教学
安全撤销已推送提交的方案，避免使用 `git reset` 导致的历史不一致问题。
- [Git Revert 详解](./revert.md)

## Git 核心概念

### 提交历史管理
- **git reset**：仅用于本地未推送的提交，会修改历史记录
- **git revert**：用于已推送的提交，创建新的反向提交，保留历史记录

### 协作开发原则
1. **远程分支的历史记录"只追加，不删除"**
2. **已推送的提交不能使用 `git reset`**
3. **使用 `git revert` 安全撤销已推送的提交**

## 常用命令速查

### 基础操作
```bash
# 查看状态
git status

# 查看提交历史
git log --oneline

# 暂存更改
git add .

# 提交更改
git commit -m "提交信息"
```

### 分支操作
```bash
# 创建分支
git branch feature-xxx

# 切换分支
git checkout feature-xxx

# 创建并切换分支
git checkout -b feature-xxx

# 合并分支
git merge feature-xxx
```

### 远程操作
```bash
# 推送到远程
git push origin main

# 拉取远程更新
git pull origin main

# 查看远程仓库
git remote -v
```

## 最佳实践

### 1. 提交信息规范
```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

### 2. 分支管理策略
- **main/master**：生产环境代码
- **develop**：开发分支
- **feature/***：功能分支
- **hotfix/***：紧急修复分支

### 3. 代码审查流程
1. 从 develop 分支创建 feature 分支
2. 在 feature 分支上开发
3. 提交 Pull Request
4. 代码审查通过后合并到 develop
5. 测试通过后合并到 main

## 常见问题解决

### 1. 撤销已推送的提交
使用 `git revert` 而不是 `git reset`：
```bash
git revert HEAD
git push origin main
```

### 2. 解决合并冲突
```bash
# 查看冲突文件
git status

# 解决冲突后
git add .
git commit -m "解决合并冲突"
```

### 3. 临时保存更改
```bash
# 保存当前更改
git stash

# 恢复更改
git stash pop

# 查看保存列表
git stash list
```

## 工具推荐

### GUI 工具
- **GitKraken**：跨平台 Git GUI
- **Source Tree**：Atlassian 出品的 Git GUI
- **VSCode Git 集成**：内置 Git 支持

### 命令行工具
- **git-flow**：Git 分支模型扩展
- **hub**：GitHub 官方命令行工具
- **tig**：Git 文本模式界面

## 总结

Git 是现代软件开发的必备工具，掌握以下核心概念：
1. **提交历史管理**：理解 reset 和 revert 的区别
2. **分支策略**：合理的分支管理提高协作效率
3. **远程协作**：正确使用 push/pull 保持同步
4. **冲突解决**：掌握合并冲突的解决方法

通过规范的 Git 使用，可以提高团队协作效率，减少代码管理问题。