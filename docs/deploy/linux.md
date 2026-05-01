# Linux 常用命令

常用的 Linux 命令是运维和开发的基础，下面按功能分类整理了最实用的部分，每个命令都附上简单说明。

## 文件与目录操作

| 命令 | 说明 | 常用示例 |
|------|------|----------|
| `ls` | 列出目录内容 | `ls -la` 显示所有文件（含隐藏）及详细信息 |
| `cd` | 切换目录 | `cd /var/log` |
| `pwd` | 显示当前路径 | |
| `mkdir` | 创建目录 | `mkdir -p a/b/c` 创建多级目录 |
| `rmdir` | 删除空目录 | |
| `rm` | 删除文件或目录 | `rm -rf dir` 强制递归删除（危险） |
| `cp` | 复制 | `cp -r src dst` 递归复制目录 |
| `mv` | 移动或重命名 | `mv old.txt new.txt` |
| `touch` | 创建空文件或更新时间戳 | |
| `ln` | 创建链接 | `ln -s target link` 创建软链接 |
| `find` | 按条件查找文件 | `find / -name "*.log"` |
| `grep` | 文本搜索 | `grep -r "error" /var/log/` |

## 文本查看与处理

| 命令 | 说明 | 常用示例 |
|------|------|----------|
| `cat` | 查看完整文件 | `cat file.txt` |
| `more` / `less` | 分页查看（less 功能更强） | `less large.log` |
| `head` / `tail` | 查看文件头/尾 | `tail -f app.log` 实时跟踪日志 |
| `wc` | 统计行、词、字符 | `wc -l file` 统计行数 |
| `sort` | 排序 | |
| `uniq` | 去重（常与 sort 搭配） | `sort file \| uniq -c` |
| `cut` | 按列切分 | `cut -d',' -f1 data.csv` |
| `sed` | 流编辑器（替换/删除） | `sed 's/old/new/g' file` |
| `awk` | 强大的文本分析工具 | `awk '{print $1}' file` |

## 权限与用户

| 命令 | 说明 |
|------|------|
| `chmod` | 修改文件权限，如 `chmod 755 script.sh` |
| `chown` | 修改所属用户和组，如 `chown user:group file` |
| `useradd` / `userdel` | 添加/删除用户 |
| `passwd` | 修改密码 |
| `whoami` | 显示当前用户名 |
| `sudo` | 以超级用户权限执行命令 |

## 进程与服务

| 命令 | 说明 |
|------|------|
| `ps` | 查看进程，`ps aux` 常用 |
| `top` / `htop` | 动态查看系统负载和进程（htop 需安装） |
| `kill` | 终止进程，`kill -9 PID` 强制结束 |
| `pkill` / `killall` | 按名称杀进程 |
| `systemctl` | 管理 systemd 服务，如 `systemctl start nginx` |
| `service` | 老式服务管理（部分系统仍用） |
| `jobs` / `fg` / `bg` | 查看后台任务/前后台切换 |

## 网络相关

| 命令 | 说明 |
|------|------|
| `ip` / `ifconfig` | 查看网络接口（ifconfig 已淘汰，推荐 `ip addr`） |
| `ping` | 测试网络连通性 |
| `curl` | 发送 HTTP 请求，调试 API |
| `wget` | 下载文件 |
| `netstat` / `ss` | 查看端口监听和网络连接，`ss -tlnp` 更现代 |
| `scp` | 远程复制文件（基于 SSH） |
| `rsync` | 高效同步文件（增量） |

## 压缩与打包

| 命令 | 说明 | 示例 |
|------|------|------|
| `tar` | 打包/解包 | `tar -czvf archive.tar.gz dir/` 打包并 gzip 压缩<br>`tar -xzvf archive.tar.gz` 解压 |
| `gzip` / `gunzip` | 压缩解压 .gz | |
| `zip` / `unzip` | 处理 .zip 文件 | `unzip file.zip -d target_dir` |

## 磁盘与系统

| 命令 | 说明 |
|------|------|
| `df -h` | 查看磁盘使用率（人类可读） |
| `du -sh` | 查看目录总大小 |
| `free -h` | 查看内存和 swap 使用 |
| `uname -a` | 查看内核版本和系统信息 |
| `uptime` | 查看系统运行时间和负载 |
| `dmesg` | 查看内核日志（排错用） |
| `history` | 查看历史命令 |

## 管道、重定向与环境变量

- **管道 `|`**：把左边命令的输出作为右边命令的输入，如 `ls | grep ".txt"`
- **重定向**：
  - `>` 覆盖输出到文件
  - `>>` 追加输出到文件
  - `2>` 重定向错误输出
- **环境变量**：
  - `export VAR=value` 设置变量
  - `echo $PATH` 查看 PATH
  - `source ~/.bashrc` 立即生效配置

## 日常开发必会组合

```bash
# 查找并删除所有 node_modules
find . -name "node_modules" -type d -prune -exec rm -rf {} \;

# 实时查看日志并高亮错误
tail -f app.log | grep --color=auto ERROR

# 统计某个端口的连接数
ss -tan | grep :80 | wc -l

# 压缩当前目录所有 .log 文件
tar -czvf logs.tar.gz *.log
```

> **学习建议**：不必强记所有参数，记住命令名和常用选项，遇到复杂需求时通过 `man 命令` 或 `命令 --help` 查阅即可。日常多实操，自然形成肌肉记忆。
