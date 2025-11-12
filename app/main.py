import re
from urllib.parse import urlparse, urlunparse
from flask import Flask, request, Response, abort
import requests

HOST = '127.0.0.1'  # 监听地址，建议监听本地然后由web服务器反代
PORT = 80  # 监听端口

# Worker 访问的静态资源 URL
ASSET_URL = 'https://crazypeace.github.io/ghproxy/'

app = Flask(__name__)

# --- 助手函数 ---

def is_github_domain(hostname: str) -> bool:
    """
    助手函数：判断是否为目标的 GitHub 域名
    域名是否以 git 开头 (使用正则表达式)
    """
    # 检查字符串是否以 'git' 开头 (^) 或 ( | ) 以一个点 '.' 开头，后面紧跟着 'git'
    return re.search(r'(^|\.)git', hostname) is not None

def clean_forwarded_headers(headers: dict) -> dict:
    """清理并返回用于 Response 的头部"""
    new_headers = dict(headers)
    # 移除所有与内容编码和长度相关的头部，避免 Content/Header 不匹配
    new_headers.pop('Content-Encoding', None)
    new_headers.pop('Content-Length', None)
    new_headers.pop('Transfer-Encoding', None)
    # 移除与连接相关的，由 Flask/WSGI 处理
    new_headers.pop('Connection', None)
    new_headers.pop('Host', None)
    
    # 添加必要的 CORS 头部
    new_headers['Access-Control-Allow-Origin'] = '*'
    new_headers['Access-Control-Allow-Headers'] = '*'
    new_headers['Access-Control-Allow-Methods'] = '*'
    
    return new_headers

# --- 主处理函数 ---

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
def handle_request(path: str):
    """
    处理所有传入的请求
    """
    worker_url = request.url_root.rstrip('/')  # 获取 worker 自己的域名, e.g., https://my-worker.example.com

    # 1. 处理静态资源和首页
    if not path:
        # 如果 path 为空，返回主页
        response = requests.get(ASSET_URL)
        return Response(response.content, status=response.status_code, headers=clean_forwarded_headers(response.headers))

    # 处理特定的静态资源
    if path in ('styles.css', 'main.js'):
        response = requests.get(ASSET_URL + path)
        return Response(response.content, status=response.status_code, headers=clean_forwarded_headers(response.headers))
    
    # 如果 path 为 perl-pe-para，返回空响应
    if path == 'perl-pe-para':
        return Response('', status=200)

    # 处理嵌套的代理调用
    # 目标：防止出现 https://ghproxy.icdyct.nyc.mn/https://ghproxy.icdyct.nyc.mn/https://api.github.com/repos/XTLS/Xray-core/releases/latest
    self_prefix_full = f"{worker_url}/" # e.g., "https://my-worker.example.com/"

    while True:
        if path.startswith(self_prefix_full):
            path = path.removeprefix(self_prefix_full)
        else:
            # 当 path 不再以任何一个前缀开头时，跳出循环
            break
    # 循环结束后, 'path' 应该是去除了所有 worker 自身前缀的 "干净" URL

    # 2. 如果 path 部分 不是 http:// 或者 https:// 开头, 那么加上 https://
    if not path.startswith('http://') and not path.startswith('https://'):
        path = 'https://' + path

    try:
        target_url = urlparse(path)
        # 确保 target_url 有有效的 scheme 和 netloc
        if not target_url.netloc:
             raise ValueError("无效的 URL 结构")
    except ValueError:
        return Response('路径中包含无效的 URL', status=400)

    # 3. 判断 本代理 接受的 链接 是否 github 相关域名
    if not is_github_domain(target_url.hostname):
        return Response('访问被拒绝：此代理仅支持 GitHub 相关域名。', status=403)
    
    # 重构完整的 URL 字符串
    full_target_url = urlunparse(target_url)

    # 准备转发请求
    
    # 复制原始请求头
    request_headers = dict(request.headers)
    # 移除可能引起问题的头，如 Host, Accept-Encoding, Content-Length (后面会重新计算)
    request_headers.pop('Host', None)
    request_headers.pop('Accept-Encoding', None)
    request_headers.pop('Content-Length', None)
    # 设置 Connection 头
    request_headers['Connection'] = 'Keep-Alive'

    # 发起代理请求
    try:
        # requests 库会自动处理 body
        response = requests.request(
            method=request.method,
            url=full_target_url,
            headers=request_headers,
            data=request.get_data(),  # 获取原始请求的 body
            allow_redirects=True,     # 默认 'follow'
            stream=True               # 使用 stream 模式以避免读取大文件到内存
        )
    except requests.exceptions.RequestException as e:
        app.logger.error(f"代理请求失败: {e}")
        return Response(f'代理请求失败: {e}', status=503)

    # 复制响应头，并设置 CORS
    response_headers = clean_forwarded_headers(response.headers)
    

    # 4. 检查 path 是否以 .sh 结尾
    final_url_parts = urlparse(response.url)
    is_script = final_url_parts.path.endswith('.sh')

    # 5. 对于 .sh 结尾的脚本文件 (并且请求成功)
    if is_script and response.status_code == 200:
        body_text = response.text  # 获取响应文本

        # ********** git.io 短链 ************
        # 修复 git.io 链接：[空格]git.io 替换为 [空格]https://git.io
        body_text = re.sub(r'(\s)(git\.io)', r'\1https://\2', body_text)
        # **********************************

        # 对所有 GitHub 链接进行查找替换 (嵌套代理)
        # 匹配所有 https?://... 链接
        url_regex = re.compile(r'(https?:\/\/[^\s"\'`()<>]+)')

        def replace_link(match):
            """替换函数：如果是 GitHub 链接，则添加代理前缀"""
            link = match.group(0)
            try:
                link_url = urlparse(link)
                if is_github_domain(link_url.netloc):
                    # 如果是 GitHub 链接，添加代理前缀
                    return f'{worker_url}/{link}'
                else:
                    # 如果不是，保持原样
                    return link
            except:
                # URL 解析失败，保持原样
                return link

        body_text = url_regex.sub(replace_link, body_text)

        # 关闭流，释放连接
        response.close()

        return Response(
            body_text,
            status=response.status_code,
            headers=response_headers,
            mimetype=response_headers.get('Content-Type', 'text/plain') # 设置 MimeType
        )
    
    # 5. 对于非 .sh 文件或非 200 状态码，直接返回
    # 使用 Response.iter_content(chunk_size=...) 以流式方式返回数据，节省内存
    def generate_content():
        for chunk in response.iter_content(chunk_size=8192):
            yield chunk
        response.close() # 确保在生成器完成后关闭连接

    return Response(
        generate_content(),
        status=response.status_code,
        headers=response_headers,
        mimetype=response.headers.get('Content-Type')
    )

if __name__ == '__main__':
    # 启动 Flask 应用程序
    # 生产环境中应使用 Gunicorn 或 uWSGI
    app.run(host=HOST, port=PORT, debug=True)
