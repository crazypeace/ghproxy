# ghproxy
极简 GitHub Porxy 解决GitHub脚本的无限嵌套调用

# 代码量小
Cloudflare worker 代码  
worker.js 139行  

自建 Python 代码  
main.py 160行  


# 面向GPT开发
提示词
```
基于 cloudflare 的 woker, 开发 一个专门 反向代理  github 的工具
1. 本代理 接收的 path部分 应该是一个 http:// 或者 https://
2. 如果 path部分 不是 http:// 或者 https:// 开头
那么加上 http:// 或者 https:// 
3. 判断 本代理 接收的 链接 是否 github
判断方法为:
链接 的域名部分 应该是 git 开头的主域名
如 
github.com
raw.githubusercontent.com
api.github.com
gist.github.com
codeload.github.com
avatars.githubusercontent.com
assets-cdn.github.com
这些域名的 主域名 都是  git 开头的
4. 在获取需要反向代理的内容后
检查 path 是否以 .sh 结尾, 来判断 是否 脚本文件
5. 对于 .sh 结尾的脚本文件
对文本内容进行查找替换
将 github 的链接前面都加上 本代理的域名, 
这样可以解决脚本嵌套使用的场景
判断 是否 github 链接的方法 参考 第3步
```
开发故事  
https://zelikk.blogspot.com/2025/11/ghproxy-v2.html

# 部署
## 免费使用 cloudflare worker 搭后端服务

注册 Cloudflare 用户, 略

创建 worker

<img width="950" height="633" alt="image" src="https://github.com/user-attachments/assets/790c36b5-aeb8-4952-8026-e7050636b6e1" />

<img width="850" height="678" alt="image" src="https://github.com/user-attachments/assets/d3400eff-4d59-4f51-999b-027759afefb1" />

<img width="933" height="825" alt="image" src="https://github.com/user-attachments/assets/457aaf89-059c-46b4-a44d-d7629730df3a" />

修改 worker 的代码

<img width="966" height="420" alt="image" src="https://github.com/user-attachments/assets/dda591ab-ac2b-41f8-8c3c-c7cb4e587ae8" />

默认内容全部删掉

<img width="788" height="683" alt="image" src="https://github.com/user-attachments/assets/201e4b11-ae2f-43c2-9dbe-4f7ffc863f62" />

把本项目的 worker.js 内容复制粘贴过去  
https://github.com/crazypeace/ghproxy/raw/refs/heads/main/worker.js

右上角 Deploy 部署

<img width="1310" height="631" alt="image" src="https://github.com/user-attachments/assets/c47dd616-84d2-4256-95ce-445200de8aef" />

这样, 你就得到了一个 ghproxy 后端  
https://worker项目名.cloudflare用户名.workers.dev/ 

请注意, 在你想使用本项目的环境中, 检测一下能否访问ghproxy后端, 比如
```
curl -L https://worker项目名.cloudflare用户名.workers.dev/ 
```
如果不行, 你需要给你的 worker 套上你自己的域名.  
参考教程  
https://zelikk.blogspot.com/2022/05/domain-cloudflare-worker-dev.html


## 用 python 搭后端服务
python环境
```
apt install -y python3-pip
pip3 install flask requests --break-system-packages
```
下载 ghproxy 文件
```
wget https://github.com/crazypeace/ghproxy/raw/refs/heads/main/app/main.py
wget https://github.com/crazypeace/ghproxy/raw/refs/heads/main/app/uwsgi.ini
```
修改 main.py

<img width="751" height="62" alt="image" src="https://github.com/user-attachments/assets/1ae3e2da-64d3-41d6-ba77-dfd68e3bb124" />

图中的修改方式 有点"危险". 适合你自己临时跑起来, 用完了就关.  
长期使用的话, 还是要前面加个比如 caddy 套 https 然后反代.

启动 
```
python3 ./main.py
```

这样你就得到了一个 ghproxy 后端
```
http://你的IP:8000/
```

# 使用方式

用下面这样的方式转换 github 一键脚本命令.   
举例, 假如你的ghproxy后端地址是 `https://ghproxy-v2.crazypeace.workers.dev/` 那么,  
转换前
```
bash <(wget -qO- -o- https://git.io/v2ray.sh)
```
转换后
```
bash <(wget -qO- -o- https://ghproxy-v2.crazypeace.workers.dev/https://git.io/v2ray.sh)
```

为了方便使用，做了个工具页面  
https://crazypeace.github.io/ghproxy/

注意页面底部的 "Github Proxy 后端" 填写正确的内容

操作演示  
https://www.youtube.com/watch?v=XXgmVkfT-Ak
